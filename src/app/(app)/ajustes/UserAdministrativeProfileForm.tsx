'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';

import { upsertUserAdministrativeProfileAction } from './actions';

import type { UserAdministrativeProfilePrimitives } from '@/features/user-administrative-profile/domain/entities/UserAdministrativeProfile';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';

type Props = {
  initialProfile: UserAdministrativeProfilePrimitives | null;
  completeness: { exists: boolean; isComplete: boolean; validation?: { domainCode: string; message: string } | null };
  reason?: 'billing_profile_incomplete' | 'legal_not_accepted' | null;
};

type SaveState =
  | { ok: true; message: string }
  | { ok: false; message: string };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? 'Salvando...' : 'Salvar'}
    </Button>
  );
}

function normalizeInit(p: UserAdministrativeProfilePrimitives | null): UserAdministrativeProfilePrimitives {
  return {
    fullName: p?.fullName ?? '',
    socialName: p?.socialName ?? null,
    birthDate: p?.birthDate ?? null,
    gender: p?.gender ?? null,
    phone: p?.phone ?? null,
    secondaryEmail: p?.secondaryEmail ?? null,
    address: p?.address ?? null,
    preferences: p?.preferences ?? null,

    // FASE 9
    cpf: p?.cpf ?? null,
    validatedAddress: p?.validatedAddress ?? null,
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDateFromDate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function parseIsoDate(iso: string | null): Date | undefined {
  if (!iso) return undefined;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return undefined;
  const y = Number(m[1]);
  const mm = Number(m[2]);
  const dd = Number(m[3]);
  if (!Number.isFinite(y) || !Number.isFinite(mm) || !Number.isFinite(dd)) return undefined;
  const d = new Date(y, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

function digitsOnly(input: string): string {
  let out = '';
  for (let i = 0; i < input.length; i++) {
    const c = input[i];
    if (c >= '0' && c <= '9') out += c;
  }
  return out;
}

function maskCpfStored(digits: string | null | undefined): string | null {
  if (!digits) return null;
  const d = String(digits);
  if (d.length !== 11) return '***.***.***-**';
  return `***.***.***-${d.slice(9, 11)}`;
}

function formatCpfInput(digitsRaw: string): string {
  const d = digitsRaw.slice(0, 11);
  const a = d.slice(0, 3);
  const b = d.slice(3, 6);
  const c = d.slice(6, 9);
  const e = d.slice(9, 11);

  let out = '';
  if (a) out += a;
  if (b) out += (out ? '.' : '') + b;
  if (c) out += (out ? '.' : '') + c;
  if (e) out += (out ? '-' : '') + e;
  return out;
}

function formatCepInput(digitsRaw: string): string {
  const d = digitsRaw.slice(0, 8);
  const a = d.slice(0, 5);
  const b = d.slice(5, 8);
  if (!b) return a;
  return `${a}-${b}`;
}

function formatPhoneBr(digitsRaw: string): { formatted: string; digits: string } {
  const d = digitsRaw.slice(0, 11);

  const area = d.slice(0, 2);
  const rest = d.slice(2);

  let formatted = '';
  if (area) formatted += `(${area})`;

  if (rest.length === 0) return { formatted, digits: d };

  if (rest.length <= 4) {
    formatted += ` ${rest}`;
    return { formatted, digits: d };
  }

  if (rest.length <= 8) {
    const p1 = rest.slice(0, 4);
    const p2 = rest.slice(4);
    formatted += ` ${p1}${p2 ? `-${p2}` : ''}`;
    return { formatted, digits: d };
  }

  const p1 = rest.slice(0, 5);
  const p2 = rest.slice(5, 9);
  formatted += ` ${p1}${p2 ? `-${p2}` : ''}`;
  return { formatted, digits: d };
}

const UF_OPTIONS = [
  'AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO',
] as const;

type ViaCepOk = {
  cep?: string;
  uf?: string;
  localidade?: string;
  bairro?: string;
  logradouro?: string;
};

type ViaCepResponse =
  | { erro: true }
  | ViaCepOk;

function isViaCepOk(data: ViaCepResponse): data is ViaCepOk {
  return !(typeof data === 'object' && data !== null && 'erro' in data && (data as any).erro === true);
}

export function UserAdministrativeProfileForm(props: Props) {
  const init = useMemo(() => normalizeInit(props.initialProfile), [props.initialProfile]);

  const [genderCode, setGenderCode] = useState<string>(init.gender?.code ?? '');

  // BirthDate UI state
  const [birthDateIso, setBirthDateIso] = useState<string>(init.birthDate ?? '');
  const birthDateSelected = useMemo(() => parseIsoDate(birthDateIso || null), [birthDateIso]);
  const birthDateLabel = birthDateIso ? birthDateIso : 'Selecionar data';

  // CPF (input controlado)
  const [cpfDigits, setCpfDigits] = useState<string>('');
  const cpfMaskedStored = maskCpfStored(init.cpf);

  // Telefone (visível formatado + hidden digits-only)
  const [phoneDigits, setPhoneDigits] = useState<string>(digitsOnly(init.phone ?? ''));

  // Endereço (controlado para permitir auto-fill viaCEP)
  const [cepDigits, setCepDigits] = useState<string>(digitsOnly(init.address?.cep ?? ''));
  const [uf, setUf] = useState<string>((init.address?.uf ?? '').toUpperCase());
  const [city, setCity] = useState<string>(init.address?.city ?? '');
  const [neighborhood, setNeighborhood] = useState<string>(init.address?.neighborhood ?? '');
  const [street, setStreet] = useState<string>(init.address?.street ?? '');
  const [number, setNumber] = useState<string>(init.address?.number ?? '');
  const [complement, setComplement] = useState<string>(init.address?.complement ?? '');

  // Preferências (VISÍVEL)
  const [preferredLanguage, setPreferredLanguage] = useState<string>(init.preferences?.preferredLanguage ?? '');
  const [timeZone, setTimeZone] = useState<string>(init.preferences?.timeZone ?? '');
  const [consentChecked, setConsentChecked] = useState<boolean>(Boolean(init.preferences?.communicationsConsent ?? false));

  // ETAPA 5 — Aceites (controlados; enviados via hidden inputs)
  const [acceptTerms, setAcceptTerms] = useState<boolean>(false);
  const [acceptPrivacy, setAcceptPrivacy] = useState<boolean>(false);

  // Client UA (LGPD: hash no server; aqui só coletamos string)
  const [clientUa, setClientUa] = useState<string>('');

  const [viaCepState, setViaCepState] = useState<'idle' | 'loading' | 'ok' | 'invalid'>('idle');

  const [state, formAction] = useFormState<SaveState, FormData>(upsertUserAdministrativeProfileAction, {
    ok: true,
    message: '',
  });

  const completenessLabel = props.completeness.isComplete
    ? 'Cadastro completo'
    : props.completeness.exists
      ? 'Cadastro incompleto'
      : 'Cadastro incompleto';

  const statusClass = props.completeness.isComplete ? 'font-medium text-green-600' : 'font-medium text-red-600';

  const cpfFormatted = formatCpfInput(cpfDigits);
  const cepFormatted = formatCepInput(cepDigits);
  const phoneFormatted = formatPhoneBr(phoneDigits).formatted;

  async function tryViaCepFill(cep8: string) {
    if (cep8.length !== 8) return;

    setViaCepState('loading');
    try {
      const url = `https://viacep.com.br/ws/${encodeURIComponent(cep8)}/json/`;
      const res = await fetch(url, { method: 'GET' });
      const data = (await res.json().catch(() => null)) as ViaCepResponse | null;

      if (!res.ok || !data || !isViaCepOk(data)) {
        setViaCepState('invalid');
        return;
      }

      const nextUf = (data.uf ?? '').toUpperCase();
      const nextCity = data.localidade ?? '';
      const nextNeighborhood = data.bairro ?? '';
      const nextStreet = data.logradouro ?? '';

      // Só preenche se o campo estiver vazio (não sobrescreve o que o usuário já digitou)
      if (!uf && nextUf) setUf(nextUf);
      if (!city && nextCity) setCity(nextCity);
      if (!neighborhood && nextNeighborhood) setNeighborhood(nextNeighborhood);
      if (!street && nextStreet) setStreet(nextStreet);

      setViaCepState('ok');
    } catch {
      setViaCepState('invalid');
    }
  }

  useEffect(() => {
    if (cepDigits.length === 8) {
      void tryViaCepFill(cepDigits);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepDigits]);

  useEffect(() => {
    try {
      setClientUa(String(navigator.userAgent ?? '').slice(0, 512));
    } catch {
      setClientUa('');
    }
  }, []);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ajustes</CardTitle>
          <CardDescription>Dados pessoais e complementares.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className={statusClass}>{completenessLabel}</span>
          </div>

          {props.reason === 'billing_profile_incomplete' ? (
            <Alert>
              <AlertTitle>Complete seus dados para assinar</AlertTitle>
              <AlertDescription>
                Para iniciar o checkout, precisamos do CPF e do endereço completo (dados fiscais/nota).
              </AlertDescription>
            </Alert>
          ) : null}

          {props.reason === 'legal_not_accepted' ? (
            <Alert>
              <AlertTitle>Aceite obrigatório</AlertTitle>
              <AlertDescription>
                Para assinar o Premium, é obrigatório aceitar os Termos de Uso e a Política de Privacidade.
              </AlertDescription>
            </Alert>
          ) : null}

          {!props.completeness.isComplete && props.completeness.validation ? (
            <Alert>
              <AlertTitle>Cadastro incompleto</AlertTitle>
              <AlertDescription>{props.completeness.validation.message}</AlertDescription>
            </Alert>
          ) : null}

          {state.message ? (
            <Alert>
              <AlertTitle>{state.ok ? 'Ok' : 'Atenção'}</AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <form action={formAction} className="space-y-4">
        {/* Informações cadastrais (inclui CPF no mesmo card) */}
        <Card>
          <CardHeader>
            <CardTitle>Informações cadastrais</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" name="fullName" defaultValue={init.fullName} placeholder="Seu nome completo" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="socialName">Nome social</Label>
              <Input
                id="socialName"
                name="socialName"
                defaultValue={init.socialName ?? ''}
                placeholder="Como prefere ser chamado(a)"
              />
            </div>

            <div className="grid gap-2">
              <Label>Data de nascimento</Label>

              <Popover>
                <PopoverTrigger asChild>
                  <Button type="button" variant="outline" className="justify-start text-left font-normal">
                    {birthDateLabel}
                  </Button>
                </PopoverTrigger>

                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    captionLayout="dropdown"
                    fromYear={1900}
                    toYear={new Date().getFullYear()}
                    selected={birthDateSelected}
                    onSelect={(d) => {
                      if (!d) {
                        setBirthDateIso('');
                        return;
                      }
                      setBirthDateIso(isoDateFromDate(d));
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>

              <input type="hidden" name="birthDate" value={birthDateIso} />
            </div>

            <div className="grid gap-2">
              <Label>Gênero</Label>
              <Select value={genderCode} onValueChange={(v) => setGenderCode(v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MASCULINO">Masculino</SelectItem>
                  <SelectItem value="FEMININO">Feminino</SelectItem>
                  <SelectItem value="PREFIRO_NAO_INFORMAR">Prefiro não informar</SelectItem>
                  <SelectItem value="OUTRO">Outro</SelectItem>
                </SelectContent>
              </Select>

              <input type="hidden" name="genderCode" value={genderCode} />

              {genderCode === 'OUTRO' ? (
                <div className="grid gap-2">
                  <Label htmlFor="genderOtherDescription">Descreva</Label>
                  <Input
                    id="genderOtherDescription"
                    name="genderOtherDescription"
                    defaultValue={init.gender?.otherDescription ?? ''}
                    placeholder="Ex.: não-binário, etc."
                  />
                </div>
              ) : (
                <input type="hidden" name="genderOtherDescription" value="" />
              )}
            </div>

            <Separator />

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="cpf">CPF (para emissão de nota fiscal)</Label>
                {cpfMaskedStored ? (
                  <span className="text-sm text-muted-foreground">
                    Atual: <span className="font-medium text-foreground">{cpfMaskedStored}</span>
                  </span>
                ) : (
                  <span className="text-sm text-muted-foreground">Nenhum CPF informado</span>
                )}
              </div>

              <Input
                id="cpf"
                name="cpf"
                value={cpfFormatted}
                onChange={(e) => setCpfDigits(digitsOnly(e.target.value).slice(0, 11))}
                placeholder="___.___.___-__"
                inputMode="numeric"
                autoComplete="off"
              />
            </div>
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone_visible">Telefone</Label>
              <Input
                id="phone_visible"
                value={phoneFormatted}
                onChange={(e) => setPhoneDigits(digitsOnly(e.target.value).slice(0, 11))}
                placeholder="(__) _____-____"
                inputMode="numeric"
                autoComplete="tel"
              />
              <input type="hidden" name="phone" value={phoneDigits} />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secondaryEmail">Email secundário</Label>
              <Input
                id="secondaryEmail"
                name="secondaryEmail"
                defaultValue={init.secondaryEmail ?? ''}
                placeholder="email@exemplo.com"
                autoComplete="email"
              />
            </div>
          </CardContent>
        </Card>

        {/* Endereço */}
        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="addressCep_visible">CEP</Label>
              <Input
                id="addressCep_visible"
                value={cepFormatted}
                onChange={(e) => {
                  const d = digitsOnly(e.target.value).slice(0, 8);
                  setCepDigits(d);
                  if (d.length < 8) setViaCepState('idle');
                }}
                onBlur={() => {
                  if (cepDigits.length === 8) void tryViaCepFill(cepDigits);
                }}
                placeholder="_____-___"
                inputMode="numeric"
                autoComplete="postal-code"
              />
              <input type="hidden" name="addressCep" value={cepDigits || ''} />

              {viaCepState === 'loading' ? (
                <div className="text-xs text-muted-foreground">Buscando endereço pelo CEP...</div>
              ) : null}
              {viaCepState === 'invalid' ? (
                <div className="text-xs text-muted-foreground">CEP não encontrado (ViaCEP).</div>
              ) : null}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>UF</Label>
                <Select value={uf} onValueChange={(v) => setUf(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    {UF_OPTIONS.map((code) => (
                      <SelectItem key={code} value={code}>
                        {code}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="addressUf" value={uf} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="addressCity">Cidade</Label>
                <Input
                  id="addressCity"
                  name="addressCity"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Ex.: Brasília"
                  autoComplete="address-level2"
                />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="addressNeighborhood">Bairro</Label>
                <Input
                  id="addressNeighborhood"
                  name="addressNeighborhood"
                  value={neighborhood}
                  onChange={(e) => setNeighborhood(e.target.value)}
                  autoComplete="address-level3"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="addressStreet">Rua</Label>
                <Input
                  id="addressStreet"
                  name="addressStreet"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  autoComplete="address-line1"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="addressNumber">Número</Label>
                <Input
                  id="addressNumber"
                  name="addressNumber"
                  value={number}
                  onChange={(e) => setNumber(e.target.value)}
                  autoComplete="address-line2"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="addressComplement">Complemento</Label>
                <Input
                  id="addressComplement"
                  name="addressComplement"
                  value={complement}
                  onChange={(e) => setComplement(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preferências */}
        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="preferredLanguage">Idioma preferido</Label>
              <Input
                id="preferredLanguage"
                name="preferredLanguage"
                value={preferredLanguage}
                onChange={(e) => setPreferredLanguage(e.target.value)}
                placeholder="Ex.: pt-BR"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeZone">Fuso horário</Label>
              <Input
                id="timeZone"
                name="timeZone"
                value={timeZone}
                onChange={(e) => setTimeZone(e.target.value)}
                placeholder="Ex.: America/Sao_Paulo"
              />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="communicationsConsent"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(Boolean(v))}
              />
              <Label htmlFor="communicationsConsent">Aceito comunicações administrativas</Label>
              <input type="hidden" name="communicationsConsent" value={consentChecked ? 'true' : ''} />
            </div>
          </CardContent>
        </Card>

        {/* Termos e Privacidade (ETAPA 5) */}
        <Card>
          <CardHeader>
            <CardTitle>Termos e Privacidade</CardTitle>
            <CardDescription>Obrigatório para assinar o Premium.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptTerms"
                checked={acceptTerms}
                onCheckedChange={(v) => setAcceptTerms(Boolean(v))}
              />
              <div className="space-y-1">
                <Label htmlFor="acceptTerms">
                  Li e aceito os{' '}
                  <Link className="underline" href="/termos-de-uso" target="_blank" rel="noreferrer">
                    Termos de Uso
                  </Link>
                </Label>
                <div className="text-xs text-muted-foreground">O aceite é registrado com versão e timestamp.</div>
              </div>
            </div>
            <input type="hidden" name="acceptTerms" value={acceptTerms ? 'true' : ''} />

            <div className="flex items-start gap-2">
              <Checkbox
                id="acceptPrivacy"
                checked={acceptPrivacy}
                onCheckedChange={(v) => setAcceptPrivacy(Boolean(v))}
              />
              <div className="space-y-1">
                <Label htmlFor="acceptPrivacy">
                  Li e aceito a{' '}
                  <Link className="underline" href="/politica-de-privacidade" target="_blank" rel="noreferrer">
                    Política de Privacidade
                  </Link>
                </Label>
                <div className="text-xs text-muted-foreground">O aceite é registrado com versão e timestamp.</div>
              </div>
            </div>
            <input type="hidden" name="acceptPrivacy" value={acceptPrivacy ? 'true' : ''} />

            {/* Metadados (opcionais) para hashing no server; IP não é coletado no client */}
            <input type="hidden" name="client_ua" value={clientUa} />
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
