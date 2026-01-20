'use server';

import { createProfileUseCases } from '@/features/profile';
import { requireAuthenticatedUserId } from '@/core/auth/requireUserId';

import type { ProfileContract } from '@/features/profile/application/ports/ProfileContract';
import {
  ProfileApplyConfirmationRequiredError,
  ProfileValidationError,
} from '@/features/profile/application/errors/ProfileUseCaseErrors';

type ActionState =
  | { ok: true; informativeIssues: unknown[]; message?: string }
  | { ok: false; blockingErrors: string[]; informativeIssues: unknown[]; message?: string };

function isoTimestampNow(): string {
  return new Date().toISOString();
}

/**
 * Hoje em ISODate na timezone do produto (America/Sao_Paulo).
 * Evita “virar o dia” pelo UTC.
 */
function isoDateTodaySaoPaulo(): string {
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dtf.format(new Date()); // 'YYYY-MM-DD'
}

function safeString(v: FormDataEntryValue | null): string {
  if (typeof v === 'string') return v;
  return '';
}

function toBlockingErrors(err: unknown): string[] {
  if (err instanceof ProfileValidationError) {
    // Tentamos extrair de forma defensiva (sem depender de propriedade privada)
    const anyErr = err as unknown as { blocking?: unknown };
    const blocking = anyErr?.blocking;
    if (Array.isArray(blocking)) return blocking.map((x) => String(x));
    return ['PROFILE_VALIDATION_ERROR'];
  }

  if (err instanceof ProfileApplyConfirmationRequiredError) {
    return ['CONFIRM_APPLY_REQUIRED'];
  }

  return ['UNEXPECTED_ERROR'];
}

export async function loadProfileAction(): Promise<{ ok: true; contract: ProfileContract | null } | { ok: false; error: string }> {
  try {
    const userId = await requireAuthenticatedUserId();
    const { getProfile } = createProfileUseCases({ userId });

    const contract = await getProfile.execute(userId);
    return { ok: true, contract };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'LOAD_PROFILE_FAILED' };
  }
}

export async function updateProfileAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  let informativeIssues: unknown[] = [];

  try {
    const userId = await requireAuthenticatedUserId();
    const { updateProfile } = createProfileUseCases({ userId });

    const rawJson = safeString(formData.get('contract_json'));
    const confirmApply = formData.get('confirm_apply') === 'on';

    if (!rawJson.trim()) {
      return {
        ok: false,
        blockingErrors: ['EMPTY_CONTRACT_JSON'],
        informativeIssues,
        message: 'Envie o contrato completo em JSON (não pode ser vazio).',
      };
    }

    let contract: ProfileContract;
    try {
      contract = JSON.parse(rawJson) as ProfileContract;
    } catch {
      return {
        ok: false,
        blockingErrors: ['INVALID_JSON'],
        informativeIssues,
        message: 'JSON inválido.',
      };
    }

    const result = await updateProfile.execute({
      userId,
      contract,
      confirmApply,
      now: isoTimestampNow(),
      today: isoDateTodaySaoPaulo(),
    });

    informativeIssues = Array.from(result.informativeIssues ?? []);

    return {
      ok: true,
      informativeIssues,
      message: 'Perfil atualizado com sucesso.',
    };
  } catch (err) {
    return {
      ok: false,
      blockingErrors: toBlockingErrors(err),
      informativeIssues,
      message: err instanceof Error ? err.message : 'UPDATE_FAILED',
    };
  }
}
