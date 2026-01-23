'use client';

import { useMemo, useState } from 'react';
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
  };
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

function isoDateFromDate(d: Date): string {
  // ⚠️ Sem timezone/UTC “inteligente”: usa o dia local (UI), persistindo YYYY-MM-DD.
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
  // Date local; se inválida vira NaN.
  const d = new Date(y, mm - 1, dd);
  if (Number.isNaN(d.getTime())) return undefined;
  return d;
}

export function UserAdministrativeProfileForm(props: Props) {
  const init = useMemo(() => normalizeInit(props.initialProfile), [props.initialProfile]);

  const [genderCode, setGenderCode] = useState<string>(init.gender?.code ?? '');
  const [consentChecked, setConsentChecked] = useState<boolean>(Boolean(init.preferences?.communicationsConsent ?? false));

  // BirthDate UI state (shadcn calendar)
  const [birthDateIso, setBirthDateIso] = useState<string>(init.birthDate ?? '');
  const birthDateSelected = useMemo(() => parseIsoDate(birthDateIso || null), [birthDateIso]);
  const birthDateLabel = birthDateIso ? birthDateIso : 'Selecionar data';

  const [state, formAction] = useFormState<SaveState, FormData>(upsertUserAdministrativeProfileAction, {
    ok: true,
    message: '',
  });

  const completenessLabel = props.completeness.isComplete
    ? 'Completo'
    : props.completeness.exists
      ? 'Incompleto'
      : 'Não cadastrado';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Ajustes</CardTitle>
          <CardDescription>Dados pessoais e complementares (administrativos).</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Status:</span>
            <span className={props.completeness.isComplete ? 'font-medium text-foreground' : 'font-medium text-amber-600'}>
              {completenessLabel}
            </span>
          </div>

          {!props.completeness.isComplete && props.completeness.validation ? (
            <Alert>
              <AlertTitle>Cadastro incompleto</AlertTitle>
              <AlertDescription>
                Alguns campos não passaram na validação. Ajuste os dados e salve novamente.
              </AlertDescription>
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
        <Card>
          <CardHeader>
            <CardTitle>Identificação</CardTitle>
            <CardDescription>Informações básicas (não afetam regras de estudo).</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="fullName">Nome completo</Label>
              <Input id="fullName" name="fullName" defaultValue={init.fullName} placeholder="Seu nome completo" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="socialName">Nome social (opcional)</Label>
              <Input
                id="socialName"
                name="socialName"
                defaultValue={init.socialName ?? ''}
                placeholder="Como prefere ser chamado(a)"
              />
            </div>

            <div className="grid gap-2">
              <Label>Data de nascimento (opcional)</Label>

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
/>                </PopoverContent>
              </Popover>

              {/* hidden para submit (contrato espera YYYY-MM-DD | null) */}
              <input type="hidden" name="birthDate" value={birthDateIso} />
            </div>

            <div className="grid gap-2">
              <Label>Gênero (opcional)</Label>
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
                  <Label htmlFor="genderOtherDescription">Descreva (obrigatório quando “Outro”)</Label>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
            <CardDescription>Dados de contato administrativos.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="phone">Telefone (opcional)</Label>
              <Input id="phone" name="phone" defaultValue={init.phone ?? ''} placeholder="(DDD) número" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="secondaryEmail">Email secundário (opcional)</Label>
              <Input id="secondaryEmail" name="secondaryEmail" defaultValue={init.secondaryEmail ?? ''} placeholder="email@exemplo.com" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Endereço</CardTitle>
            <CardDescription>
              Se você informar CEP, o contrato exige UF e Cidade (validação no domínio).
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="addressCep">CEP (opcional)</Label>
              <Input id="addressCep" name="addressCep" defaultValue={init.address?.cep ?? ''} placeholder="Somente números" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="addressUf">UF</Label>
                <Input id="addressUf" name="addressUf" defaultValue={init.address?.uf ?? ''} placeholder="Ex.: DF" />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="addressCity">Cidade</Label>
                <Input id="addressCity" name="addressCity" defaultValue={init.address?.city ?? ''} placeholder="Ex.: Brasília" />
              </div>
            </div>

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="addressNeighborhood">Bairro</Label>
                <Input id="addressNeighborhood" name="addressNeighborhood" defaultValue={init.address?.neighborhood ?? ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="addressStreet">Rua</Label>
                <Input id="addressStreet" name="addressStreet" defaultValue={init.address?.street ?? ''} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="addressNumber">Número</Label>
                <Input id="addressNumber" name="addressNumber" defaultValue={init.address?.number ?? ''} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="addressComplement">Complemento</Label>
                <Input id="addressComplement" name="addressComplement" defaultValue={init.address?.complement ?? ''} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Preferências</CardTitle>
            <CardDescription>Preferências administrativas de comunicação/exibição.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="preferredLanguage">Idioma preferido (opcional)</Label>
              <Input id="preferredLanguage" name="preferredLanguage" defaultValue={init.preferences?.preferredLanguage ?? ''} placeholder="Ex.: pt-BR" />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="timeZone">Fuso horário (opcional)</Label>
              <Input id="timeZone" name="timeZone" defaultValue={init.preferences?.timeZone ?? ''} placeholder="Ex.: America/Sao_Paulo" />
            </div>

            <div className="flex items-center gap-2">
              <Checkbox
                id="communicationsConsent"
                checked={consentChecked}
                onCheckedChange={(v) => setConsentChecked(Boolean(v))}
              />
              <Label htmlFor="communicationsConsent">Aceito comunicações administrativas (opcional)</Label>
              <input type="hidden" name="communicationsConsent" value={consentChecked ? 'true' : ''} />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-2">
          <SubmitButton />
        </div>
      </form>
    </div>
  );
}
