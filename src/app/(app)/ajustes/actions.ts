'use server';

import 'server-only';

import { requireAuthenticatedUserId } from '@/core/auth/requireUserId';
import { createUserAdministrativeProfileSsrComposition } from '@/core/composition/user-administrative-profile.ssr.composition';

import type { UserAdministrativeProfilePrimitives } from '@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile';

type LoadState =
  | {
      ok: true;
      profile: UserAdministrativeProfilePrimitives | null;
      completeness: { exists: boolean; isComplete: boolean; validation?: { domainCode: string; message: string } | null };
    }
  | { ok: false; error: string };

type SaveState =
  | { ok: true; message: string }
  | { ok: false; message: string };

function isoTimestampNow(): string {
  return new Date().toISOString();
}

function safeString(v: FormDataEntryValue | null): string {
  return typeof v === 'string' ? v : '';
}

function trimToNull(v: string): string | null {
  const t = v.trim();
  return t ? t : null;
}

function digitsOnlyOrNull(v: string): string | null {
  const s = v ?? '';
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (c >= '0' && c <= '9') out += c;
  }
  return out.length ? out : null;
}

function safeBool(v: FormDataEntryValue | null): boolean | null {
  if (v === null) return null;
  if (typeof v !== 'string') return null;
  if (v === 'on' || v === 'true' || v === '1' || v === 'yes') return true;
  return false;
}

function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  try {
    return String(e);
  } catch {
    return 'UNKNOWN_ERROR';
  }
}

function hasField(fd: FormData, name: string): boolean {
  return fd.get(name) !== null;
}

function buildProfileFromFormData(fd: FormData): UserAdministrativeProfilePrimitives {
  const fullName = safeString(fd.get('fullName'));

  const socialName = trimToNull(safeString(fd.get('socialName')));
  const birthDate = trimToNull(safeString(fd.get('birthDate')));

  const genderCode = trimToNull(safeString(fd.get('genderCode')));
  const genderOther = trimToNull(safeString(fd.get('genderOtherDescription')));

  const phone = trimToNull(safeString(fd.get('phone')));
  const secondaryEmail = trimToNull(safeString(fd.get('secondaryEmail')));

  // CPF (declaratório)
  const cpfDigits = digitsOnlyOrNull(safeString(fd.get('cpf')));

  // Endereço (Fase 6)
  const cep = trimToNull(safeString(fd.get('addressCep')));
  const uf = trimToNull(safeString(fd.get('addressUf')));
  const city = trimToNull(safeString(fd.get('addressCity')));
  const neighborhood = trimToNull(safeString(fd.get('addressNeighborhood')));
  const street = trimToNull(safeString(fd.get('addressStreet')));
  const number = trimToNull(safeString(fd.get('addressNumber')));
  const complement = trimToNull(safeString(fd.get('addressComplement')));

  const anyAddressProvided = !!(cep || uf || city || neighborhood || street || number || complement);
  const address = anyAddressProvided ? { cep, uf, city, neighborhood, street, number, complement } : null;

  /**
   * IMPORTANTE:
   * validatedAddress dispara validação EXTERNA no ValidateAndUpsert...UseCase.
   * No /ajustes atual, não emitimos validatedAddress (vamos religar na ETAPA 4, com regra fiscal do checkout).
   */
  const validatedAddress = null;

  const preferredLanguage = trimToNull(safeString(fd.get('preferredLanguage')));
  const timeZone = trimToNull(safeString(fd.get('timeZone')));
  const communicationsConsent = safeBool(fd.get('communicationsConsent'));

  const anyPrefsProvided = !!(preferredLanguage || timeZone || communicationsConsent !== null);
  const preferences = anyPrefsProvided ? { preferredLanguage, timeZone, communicationsConsent } : null;

  return {
    fullName,
    socialName,
    birthDate,
    gender: genderCode ? { code: genderCode, otherDescription: genderOther } : null,
    phone,
    secondaryEmail,
    address,
    preferences,

    // FASE 9
    cpf: cpfDigits,
    validatedAddress,
  };
}

export async function loadUserAdministrativeProfileAction(): Promise<LoadState> {
  try {
    const userId = await requireAuthenticatedUserId();
    const { ucGet, ucCheckCompleteness } = createUserAdministrativeProfileSsrComposition();

    const [got, checked] = await Promise.all([ucGet.execute({ userId }), ucCheckCompleteness.execute({ userId })]);

    if (!got.ok) {
      console.error('[ajustes] ucGet failed', got.error);
      return { ok: false, error: 'Falha ao carregar os dados administrativos.' };
    }

    if (!checked.ok) {
      console.error('[ajustes] ucCheckCompleteness failed', checked.error);
      return { ok: false, error: 'Falha ao verificar status do cadastro.' };
    }

    return {
      ok: true,
      profile: got.data.profile,
      completeness: checked.data,
    };
  } catch (e: unknown) {
    console.error('[ajustes] loadUserAdministrativeProfileAction exception', errMsg(e), e);
    return { ok: false, error: 'Falha ao carregar os dados administrativos.' };
  }
}

export async function upsertUserAdministrativeProfileAction(_prev: SaveState, formData: FormData): Promise<SaveState> {
  try {
    const userId = await requireAuthenticatedUserId();
    const { ucGet, ucValidateAndUpsert, ucCheckCompleteness } = createUserAdministrativeProfileSsrComposition();

    // Fonte de verdade do servidor (para preservar campos ausentes no POST)
    const current = await ucGet.execute({ userId });
    const currentProfile = current.ok ? current.data.profile : null;

    const profile = buildProfileFromFormData(formData);

    /**
     * PRESERVAÇÃO SEM PERDA DE DADOS (ETAPA 3)
     * - O contrato é substituição integral (replaceFullContract).
     * - Se um campo NÃO veio no FormData (porque UI ocultou ou não renderizou o input),
     *   preservamos o valor atual do servidor.
     * - Se o campo veio vazio, isso significa intenção de limpar => NÃO preservamos.
     */

    // CPF: preserva APENAS se o input nem veio no POST.
    if (!hasField(formData, 'cpf') && currentProfile?.cpf) {
      profile.cpf = currentProfile.cpf;
    }

    // Preferências: preserva se nenhum campo de preferência veio no POST.
    const prefFields = ['preferredLanguage', 'timeZone', 'communicationsConsent'] as const;
    const anyPrefFieldPresent = prefFields.some((k) => hasField(formData, k));
    if (!anyPrefFieldPresent) {
      profile.preferences = currentProfile?.preferences ?? null;
    }

    // Endereço: preserva se nenhum campo de endereço veio no POST.
    const addrFields = [
      'addressCep',
      'addressUf',
      'addressCity',
      'addressNeighborhood',
      'addressStreet',
      'addressNumber',
      'addressComplement',
    ] as const;
    const anyAddrFieldPresent = addrFields.some((k) => hasField(formData, k));
    if (!anyAddrFieldPresent) {
      profile.address = currentProfile?.address ?? null;
    }

    // Telefone / Email secundário: preserva se o input não veio no POST.
    if (!hasField(formData, 'phone')) {
      profile.phone = currentProfile?.phone ?? null;
    }
    if (!hasField(formData, 'secondaryEmail')) {
      profile.secondaryEmail = currentProfile?.secondaryEmail ?? null;
    }

    // Identidade (para evitar perdas se algum campo for removido da UI)
    if (!hasField(formData, 'socialName')) {
      profile.socialName = currentProfile?.socialName ?? null;
    }
    if (!hasField(formData, 'birthDate')) {
      profile.birthDate = currentProfile?.birthDate ?? null;
    }
    if (!hasField(formData, 'genderCode') && !hasField(formData, 'genderOtherDescription')) {
      profile.gender = currentProfile?.gender ?? null;
    }

    // validatedAddress: hoje o /ajustes não emite, então preserva se já existir.
    // (Isso evita apagar caso já esteja preenchido por outra rotina/fase.)
    if (currentProfile?.validatedAddress && profile.validatedAddress === null) {
      profile.validatedAddress = currentProfile.validatedAddress;
    }

    const saved = await ucValidateAndUpsert.execute({
      userId,
      now: isoTimestampNow(),
      profile,
    });

    if (!saved.ok) {
      console.error('[ajustes] ucValidateAndUpsert failed', saved.error);
      return { ok: false, message: 'Não foi possível salvar. Verifique os campos e tente novamente.' };
    }

    const checked = await ucCheckCompleteness.execute({ userId });
    if (!checked.ok) {
      console.error('[ajustes] ucCheckCompleteness after save failed', checked.error);
      return { ok: true, message: 'Ajustes salvos. Alguns campos podem estar incompletos.' };
    }

    return checked.data.isComplete
      ? { ok: true, message: 'Ajustes salvos com sucesso.' }
      : { ok: true, message: 'Ajustes salvos. Alguns campos podem estar incompletos.' };
  } catch (e: unknown) {
    console.error('[ajustes] upsertUserAdministrativeProfileAction exception', errMsg(e), e);
    return { ok: false, message: 'Não foi possível salvar. Tente novamente.' };
  }
}
