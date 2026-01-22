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

function stringifyIssue(x: unknown): string {
  if (typeof x === 'string') return x;
  if (x && typeof x === 'object') {
    // tenta formatos comuns: { code, message } ou similares
    const anyX = x as Record<string, unknown>;
    const code = typeof anyX.code === 'string' ? anyX.code : null;
    const message = typeof anyX.message === 'string' ? anyX.message : null;

    if (code && message) return `${code}: ${message}`;
    if (message) return message;
    if (code) return code;

    try {
      return JSON.stringify(x);
    } catch {
      return 'UNKNOWN_ISSUE_OBJECT';
    }
  }
  return String(x);
}

function extractBlockingArray(err: unknown): unknown[] | null {
  // ProfileValidationError provavelmente carrega o array no construtor;
  // extraímos de forma defensiva (sem acoplar a propriedade exata).
  const anyErr = err as any;
  if (Array.isArray(anyErr?.blocking)) return anyErr.blocking;
  if (Array.isArray(anyErr?.errors)) return anyErr.errors;
  if (Array.isArray(anyErr?.issues)) return anyErr.issues;
  return null;
}

function toBlockingErrors(err: unknown): string[] {
  if (err instanceof ProfileApplyConfirmationRequiredError) {
    return ['CONFIRM_APPLY_REQUIRED'];
  }

  if (err instanceof ProfileValidationError) {
    const arr = extractBlockingArray(err);
    if (arr && arr.length > 0) return arr.map(stringifyIssue);
    return ['PROFILE_VALIDATION_ERROR'];
  }

  if (err instanceof Error) {
    // Evita “vazar” stack; devolve marcador + message curta
    return [`UNEXPECTED_ERROR: ${err.message}`];
  }

  return ['UNEXPECTED_ERROR'];
}

export async function loadProfileAction(): Promise<
  { ok: true; contract: ProfileContract | null } | { ok: false; error: string }
> {
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
