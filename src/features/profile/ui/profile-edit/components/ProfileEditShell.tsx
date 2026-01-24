'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import type { DateRange } from "react-day-picker";

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

import { updateProfileAction } from '@/app/(app)/perfil/actions';

type ActionState =
  | { ok: true; informativeIssues: unknown[]; message?: string }
  | { ok: false; blockingErrors: string[]; informativeIssues: unknown[]; message?: string };

const initialState: ActionState = {
  ok: false,
  blockingErrors: [],
  informativeIssues: [],
};

type StudyMode = 'FIXO' | 'CICLO';

type ProfileContract = {
  rules: {
    userId: string;
    subjectsPerDayLimit: number;
    studyMode: StudyMode;
    createdAt: string;
    updatedAt: string;
  };
  weekdayRules: Array<{
    userId: string;
    weekday: number; // 1..7
    dailyMinutes: number;
    hasTheory: boolean;
    hasQuestions: boolean;
    hasInformatives: boolean;
    hasLeiSeca: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  extrasDurations: {
    userId: string;
    questionsMinutes: number;
    informativesMinutes: number;
    leiSecaMinutes: number;
    createdAt: string;
    updatedAt: string;
  };
  autoReviewPolicy: {
    userId: string;
    enabled: boolean;
    frequencyDays: 1 | 7 | 30 | null;
    reviewMinutes: number | null;
    reserveTimeBlock: boolean;
    createdAt: string;
    updatedAt: string;
  };
  restPeriods: Array<{
    id: string;
    userId: string;
    startDate: string; // YYYY-MM-DD
    endDate: string; // YYYY-MM-DD
    createdAt: string;
  }>;
};

function HelpTip(props: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label="Ajuda"
          className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full border text-[11px] leading-none text-muted-foreground hover:bg-muted"
        >
          ?
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-[340px]">
        <p className="text-sm">{props.text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

function tryParseContract(raw: string): { ok: true; contract: ProfileContract } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: false, error: 'EMPTY' };
  try {
    const obj = JSON.parse(raw) as ProfileContract;
    if (!obj || typeof obj !== 'object') return { ok: false, error: 'NOT_OBJECT' };
    if (
      !obj.rules ||
      !Array.isArray(obj.weekdayRules) ||
      !obj.extrasDurations ||
      !obj.autoReviewPolicy ||
      !Array.isArray(obj.restPeriods)
    ) {
      return { ok: false, error: 'MISSING_KEYS' };
    }
    return { ok: true, contract: obj };
  } catch {
    return { ok: false, error: 'INVALID_JSON' };
  }
}

function pretty(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

function weekdayLabel(n: number): string {
  switch (n) {
    case 1: return 'Segunda-feira';
    case 2: return 'Terça-feira';
    case 3: return 'Quarta-feira';
    case 4: return 'Quinta-feira';
    case 5: return 'Sexta-feira';
    case 6: return 'Sábado';
    case 7: return 'Domingo';
    default: return `Dia ${n}`;
  }
}

function clampInt(v: string, fallback: number): number {
  const n = Number.parseInt(v, 10);
  if (Number.isNaN(n)) return fallback;
  return n;
}

function minutesToHHMM(totalMinutes: number): string {
  const m = Math.max(0, Math.min(1440, totalMinutes));
  const hh = Math.floor(m / 60);
  const mm = m % 60;
  return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

function tryHHMMToMinutes(input: string): { ok: true; minutes: number } | { ok: false } {
  const s = input.trim();
  // permite 0..24:00; minutos 00..59; 24 só permitido com :00
  const match = /^(\d{1,2}):([0-5]\d)$/.exec(s);
  if (!match) return { ok: false };
  const hh = Number(match[1]);
  const mm = Number(match[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return { ok: false };
  if (hh < 0 || hh > 24) return { ok: false };
  if (hh === 24 && mm !== 0) return { ok: false };
  const minutes = hh * 60 + mm;
  if (minutes < 0 || minutes > 1440) return { ok: false };
  return { ok: true, minutes };
}

function isoDateSaoPaulo(d: Date): string {
  // YYYY-MM-DD na timezone do produto
  const dtf = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return dtf.format(d);
}

function isoToBR(value: string): string {
  if (!value) return '';

  // 1) Preferência: YYYY-MM-DD (ou YYYY-MM-DDTHH...)
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (m) {
    const [, yyyy, mm, dd] = m;
    return `${dd}/${mm}/${yyyy}`;
  }

  // 2) Fallback: Date string parseável (ex.: "Sun Jan 25 2026 ...")
  const d = new Date(value);
  if (!Number.isNaN(d.getTime())) {
    return new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo' }).format(d);
  }

  // 3) Último recurso: devolve como veio
  return value;
}

function makeClientUuid(): string {
  // Não é regra de negócio; é apenas geração de id para o payload completo.
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  // fallback raríssimo; mantém funcionalidade em ambientes sem crypto.randomUUID
  return `rp_${Math.random().toString(16).slice(2)}_${Date.now()}`;
}

type StudyTypeKey = 'THEORY' | 'QUESTIONS' | 'INFORMATIVES' | 'LEI_SECA';

function selectedTypesFromRule(r: ProfileContract['weekdayRules'][number]): StudyTypeKey[] {
  const selected: StudyTypeKey[] = [];
  if (r.hasTheory) selected.push('THEORY');
  if (r.hasQuestions) selected.push('QUESTIONS');
  if (r.hasInformatives) selected.push('INFORMATIVES');
  if (r.hasLeiSeca) selected.push('LEI_SECA');
  return selected;
}

export function ProfileEditShell(props: { initialContractJson: string; authStatusMessage?: string }) {
  const router = useRouter();

  const [contractJson, setContractJson] = React.useState(props.initialContractJson);

  const parsed = React.useMemo(() => tryParseContract(contractJson), [contractJson]);
  const hasContract = parsed.ok;

  const [contractObj, setContractObj] = React.useState<ProfileContract | null>(hasContract ? parsed.contract : null);

  React.useEffect(() => {
    if (parsed.ok) setContractObj(parsed.contract);
  }, [parsed]);

  const [state, formAction, isPending] = React.useActionState(updateProfileAction, initialState);

  const blockingErrors = state.ok ? [] : state.blockingErrors ?? [];
  const informativeIssues = state.informativeIssues ?? [];

  // UI ONLY: agora não expomos mais JSON como modo. Mantemos a validação defensiva.
  const formDisabledReason =
    !props.initialContractJson.trim()
      ? 'Perfil ainda não carregado.'
      : !hasContract
        ? 'Não foi possível interpretar o contrato do perfil.'
        : null;

  function syncFromObj(next: ProfileContract) {
    setContractObj(next);
    setContractJson(pretty(next));
  }

  function updateRulesSubjectsPerDayLimit(v: number) {
    if (!contractObj) return;
    syncFromObj({
      ...contractObj,
      rules: { ...contractObj.rules, subjectsPerDayLimit: v },
    });
  }

  function updateRulesStudyMode(v: StudyMode) {
    if (!contractObj) return;
    syncFromObj({
      ...contractObj,
      rules: { ...contractObj.rules, studyMode: v },
    });
  }

  function updateWeekdayRule(weekday: number, patch: Partial<ProfileContract['weekdayRules'][number]>) {
    if (!contractObj) return;
    syncFromObj({
      ...contractObj,
      weekdayRules: contractObj.weekdayRules.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)),
    });
  }

  function updateExtras(patch: Partial<ProfileContract['extrasDurations']>) {
    if (!contractObj) return;
    syncFromObj({
      ...contractObj,
      extrasDurations: { ...contractObj.extrasDurations, ...patch },
    });
  }

  function updateAutoReview(patch: Partial<ProfileContract['autoReviewPolicy']>) {
    if (!contractObj) return;
    syncFromObj({
      ...contractObj,
      autoReviewPolicy: { ...contractObj.autoReviewPolicy, ...patch },
    });
  }

  function addRestPeriodWithDates(startDate: string, endDate: string) {
    if (!contractObj) return;

    const id = makeClientUuid();

    const next = {
      ...contractObj,
      restPeriods: [
        ...contractObj.restPeriods,
        {
          id,
          userId: contractObj.rules.userId,
          startDate,
          endDate,
          createdAt: new Date().toISOString(),
        },
      ],
    };

    syncFromObj(next);
  }

  function removeRestPeriod(id: string) {
    if (!contractObj) return;
    syncFromObj({
      ...contractObj,
      restPeriods: contractObj.restPeriods.filter((p) => p.id !== id),
    });
  }

  /**
   * confirm_apply:
   * - NÃO confiamos no shadcn Checkbox para FormData.
   * - Checkbox é UI-only; o valor real vai em hidden input (true/false).
   */
  const [confirmApplyUi, setConfirmApplyUi] = React.useState(false);


  /**
   * Releitura pós-save:
   * - Ao salvar com sucesso, fazemos router.refresh() para reexecutar SSR (loadProfileAction).
   * - Quando a prop initialContractJson mudar por causa desse refresh, sincronizamos o state local.
   * - NÃO sobrescrevemos edição do usuário em momentos arbitrários: só quando o refresh foi provocado por save ok.
   */
  const [pendingServerSync, setPendingServerSync] = React.useState(false);


  React.useEffect(() => {
    if (state.ok) {
      setPendingServerSync(true);
      router.refresh();
    }
  }, [state.ok, router]);

  React.useEffect(() => {
    if (!pendingServerSync) return;

    setContractJson(props.initialContractJson);
    setConfirmApplyUi(false);
    setPendingServerSync(false);
  }, [pendingServerSync, props.initialContractJson]);

  const canSubmit =
    contractJson.trim().length > 0 &&
    parsed.ok &&
    confirmApplyUi &&
    !isPending;

  // ===== Rest Periods Modal (UI-only) =====
  const [restDialogOpen, setRestDialogOpen] = React.useState(false);
  const [restRange, setRestRange] = React.useState<DateRange | undefined>(undefined);



  function openRestDialog() {
    setRestRange(undefined);
    setRestDialogOpen(true);
  }

  function confirmRestDialog() {
    const from = restRange?.from;
    const to = restRange?.to;

    // 1 clique (apenas from) => salva como 1 dia (from==to)
    if (from && !to) {
      const d = isoDateSaoPaulo(from);
      addRestPeriodWithDates(d, d);
      setRestDialogOpen(false);
      return;
    }

    // 2 cliques (range completo)
    if (from && to) {
      addRestPeriodWithDates(isoDateSaoPaulo(from), isoDateSaoPaulo(to));
      setRestDialogOpen(false);
    }
  }

  function restLabel(p: ProfileContract['restPeriods'][number]): string {
    const start = isoToBR(p.startDate);
    const end = isoToBR(p.endDate);
    if (!p.startDate || !p.endDate) return 'Período';
    if (p.startDate === p.endDate) return start;
    return `${start} até ${end}`;
  }

  return (
    <TooltipProvider delayDuration={150}>
      <Card className="rounded-2xl">
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-xl">Meu Perfil</CardTitle>
            <HelpTip text="Aqui você pode configurar todo o seu planejamento de estudos e o sistema monta o cronograma perfeito para você e o seu tempo." />
          </div>

          {props.authStatusMessage ? (
            <Alert className="mt-3">
              <div className="text-sm">{props.authStatusMessage}</div>
            </Alert>
          ) : null}
        </CardHeader>

        <CardContent>
          {formDisabledReason ? (
            <Alert className="mb-4">
              <div className="text-sm">{formDisabledReason}</div>
            </Alert>
          ) : null}

          <div className={formDisabledReason ? 'opacity-50 pointer-events-none' : ''}>
            <div className="space-y-6">
              {/* Modo de Estudos */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Modo de Estudos</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Método de Estudos</Label>
                      <HelpTip text="Fixo: repete as mesmas matérias no dia. Ciclo: alterna entre todas as matérias cadastradas." />
                    </div>

                    <Select
                      value={contractObj?.rules.studyMode ?? 'FIXO'}
                      onValueChange={(v) => updateRulesStudyMode(v as StudyMode)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FIXO">FIXO</SelectItem>
                        <SelectItem value="CICLO">CICLO</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Limite de matérias por dia</Label>
                      <HelpTip text="Defina quantas matérias principais você fará por dia. A leitura de lei seca, informativos e questões não entram nesse limite." />
                    </div>

                    <Input
                      type="number"
                      min={1}
                      max={9}
                      value={contractObj?.rules.subjectsPerDayLimit ?? 1}
                      onChange={(e) => updateRulesSubjectsPerDayLimit(clampInt(e.target.value, 1))}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Semana */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Horários Semanais e Atividades</CardTitle>
                    <HelpTip text="Aqui você informa quais os dias irá estudar, quanto tempo em cada dia, bem como o que pretende estudar." />
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {(contractObj?.weekdayRules ?? [])
                    .slice()
                    .sort((a, b) => a.weekday - b.weekday)
                    .map((r) => {
                      const disableTypes = r.dailyMinutes === 0;

                      const hhmm = minutesToHHMM(r.dailyMinutes);
                      const selected = selectedTypesFromRule(r);

                      return (
                        <div key={r.weekday} className="rounded-xl border p-4">
                          {/* Linha única (desktop) / quebra suave (mobile) */}
<div className="flex flex-col gap-3 md:grid md:grid-cols-[7.25rem_6.5rem_1fr] md:items-center md:gap-2">
  {/* Dia */}
  <div className="font-medium md:whitespace-nowrap">
  {weekdayLabel(r.weekday)}
</div>

  {/* Tempo (HH:MM) + tip */}
  <div className="flex items-center gap-1">
  <Input
    className="w-20 px-2 tabular-nums"
    inputMode="numeric"
    placeholder="HH:MM"
    value={hhmm}
    onChange={(e) => {
      const parsed = tryHHMMToMinutes(e.target.value);
      if (!parsed.ok) return;
      updateWeekdayRule(r.weekday, { dailyMinutes: parsed.minutes });
    }}
  />
  <HelpTip text="Quanto tempo você terá para estudar neste dia. Use o formato HH:MM." />
</div>

  {/* Atividades (tooltip ancorado à direita, fora do fluxo) */}
<div className="relative">
  <div className="flex items-center justify-start md:justify-end">
    <ToggleGroup
      type="multiple"
      disabled={disableTypes}
      value={disableTypes ? [] : selected}
      onValueChange={(values) => {
        const v = values as StudyTypeKey[];

        updateWeekdayRule(r.weekday, {
          hasTheory: v.includes('THEORY'),
          hasQuestions: v.includes('QUESTIONS'),
          hasInformatives: v.includes('INFORMATIVES'),
          hasLeiSeca: v.includes('LEI_SECA'),
        });
      }}
      className={`justify-start md:justify-end ${disableTypes ? 'opacity-60' : ''}`}
    >
      <ToggleGroupItem
        value="THEORY"
        aria-label="Teoria"
        className="rounded-full border border-muted-foreground/30 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-950 data-[state=on]:border-emerald-500/40 data-[state=on]:shadow"
      >
        Teoria
      </ToggleGroupItem>

      <ToggleGroupItem
        value="QUESTIONS"
        aria-label="Questões"
        className="rounded-full border border-muted-foreground/30 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-950 data-[state=on]:border-emerald-500/40 data-[state=on]:shadow"
      >
        Questões
      </ToggleGroupItem>

      <ToggleGroupItem
        value="INFORMATIVES"
        aria-label="Informativos"
        className="rounded-full border border-muted-foreground/30 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-950 data-[state=on]:border-emerald-500/40 data-[state=on]:shadow"
      >
        Informativos
      </ToggleGroupItem>

      <ToggleGroupItem
        value="LEI_SECA"
        aria-label="Lei Seca"
        className="rounded-full border border-muted-foreground/30 bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-muted hover:border-muted-foreground/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 data-[state=on]:bg-emerald-500/15 data-[state=on]:text-emerald-950 data-[state=on]:border-emerald-500/40 data-[state=on]:shadow"
      >
        Lei Seca
      </ToggleGroupItem>
    </ToggleGroup>
  </div>

  {/* Tooltip fora do fluxo (não desalinha a coluna) */}
  <div className="absolute right-0 top-1/2 -translate-y-1/2">
  </div>
</div>

</div>

                        </div>
                      );
                    })}
                </CardContent>
              </Card>

              {/* Extras */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <CardTitle className="text-base">Tempo para Questões, Informativos e Lei Seca</CardTitle>
                    <HelpTip text="Defina quanto tempo você quer reservar, no dia, para Questões, Informativos e Lei Seca." />
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Questões</Label>
                      <HelpTip text="Tempo diário reservado para resolver questões." />
                    </div>
                    <Input
                      inputMode="numeric"
                      placeholder="HH:MM"
                      value={minutesToHHMM(contractObj?.extrasDurations.questionsMinutes ?? 0)}
                      onChange={(e) => {
                        const parsed = tryHHMMToMinutes(e.target.value);
                        if (!parsed.ok) return;
                        updateExtras({ questionsMinutes: parsed.minutes });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Informativos</Label>
                      <HelpTip text="Tempo diário reservado para leitura de informativos." />
                    </div>
                    <Input
                      inputMode="numeric"
                      placeholder="HH:MM"
                      value={minutesToHHMM(contractObj?.extrasDurations.informativesMinutes ?? 0)}
                      onChange={(e) => {
                        const parsed = tryHHMMToMinutes(e.target.value);
                        if (!parsed.ok) return;
                        updateExtras({ informativesMinutes: parsed.minutes });
                      }}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center">
                      <Label>Lei Seca</Label>
                      <HelpTip text="Tempo diário reservado para leitura de lei seca." />
                    </div>
                    <Input
                      inputMode="numeric"
                      placeholder="HH:MM"
                      value={minutesToHHMM(contractObj?.extrasDurations.leiSecaMinutes ?? 0)}
                      onChange={(e) => {
                        const parsed = tryHHMMToMinutes(e.target.value);
                        if (!parsed.ok) return;
                        updateExtras({ leiSecaMinutes: parsed.minutes });
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Revisões */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Revisões automáticas</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Label>Ativar revisões automáticas</Label>
                      <HelpTip text="Ative para incluir revisões automáticas na sua rotina." />
                    </div>
                    <Switch
                      checked={Boolean(contractObj?.autoReviewPolicy.enabled)}
                      onCheckedChange={(v) => updateAutoReview({ enabled: Boolean(v) })}
                    />
                  </div>

                  {contractObj?.autoReviewPolicy.enabled ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Label>Frequência (dias)</Label>
                            <HelpTip text="Define de quanto em quanto tempo a revisão aparece." />
                          </div>
                          <Select
                            value={String(contractObj.autoReviewPolicy.frequencyDays ?? '')}
                            onValueChange={(v) => {
                              const n = Number(v) as 1 | 7 | 30;
                              updateAutoReview({ frequencyDays: n });
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">1</SelectItem>
                              <SelectItem value="7">7</SelectItem>
                              <SelectItem value="30">30</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Label>Duração da revisão</Label>
                            <HelpTip text="Quanto tempo você quer dedicar em cada revisão." />
                          </div>
                          <Input
                            inputMode="numeric"
                            placeholder="HH:MM"
                            value={minutesToHHMM(contractObj.autoReviewPolicy.reviewMinutes ?? 0)}
                            onChange={(e) => {
                              const parsed = tryHHMMToMinutes(e.target.value);
                              if (!parsed.ok) return;
                              updateAutoReview({ reviewMinutes: parsed.minutes });
                            }}
                          />
                        </div>

                        {/* Switch -> Select (UI only) */}
                        <div className="space-y-2">
                          <div className="flex items-center">
                            <Label>Reservar tempo na Meta Diária</Label>
                            <HelpTip text="Se ativado, a revisão entra como um bloco de tempo planejado no seu dia." />
                          </div>
                          <Select
                            value={contractObj.autoReviewPolicy.reserveTimeBlock ? 'true' : 'false'}
                            onValueChange={(v) => updateAutoReview({ reserveTimeBlock: v === 'true' })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">Não reservar</SelectItem>
                              <SelectItem value="true">Reservar</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Quando ativadas, as revisões aparecem automaticamente na sua rotina de estudos conforme a frequência escolhida.
                        Se você marcar Reservar tempo na Meta Diária, o sistema também separa um bloco de tempo para a revisão.
                      </p>
                    </div>
                  ) : null}
                </CardContent>
              </Card>

              {/* Descansos */}
              <Card className="rounded-2xl">
                <CardHeader>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center">
                      <CardTitle className="text-base">Períodos de descanso</CardTitle>
                      <HelpTip text="Nesses dias não há metas: o calendário fica livre, sistema não agenda atividades e seu streak não é prejudicado." />
                    </div>
                    <Button type="button" onClick={openRestDialog}>
                      Adicionar
                    </Button>
                  </div>
                </CardHeader>

                {/* Pills */}
                <CardContent className="space-y-3">
                  {(contractObj?.restPeriods ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum período cadastrado.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {(contractObj?.restPeriods ?? []).map((p) => (
                        <div
  key={p.id}
  className="group relative flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/15 px-3 py-2 text-sm text-emerald-950"
>
  <span className="text-base leading-none">🏖️</span>
  <span className="whitespace-nowrap">{restLabel(p)}</span>

  <button
    type="button"
    aria-label="Remover período de descanso"
    onClick={() => removeRestPeriod(p.id)}
    className="ml-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-red-600 hover:bg-red-500/10"
  >
    ✕
  </button>
</div>

                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Modal calendário (Adicionar descanso) */}
          <Dialog open={restDialogOpen} onOpenChange={setRestDialogOpen}>
            <DialogContent className="sm:max-w-[520px]">
              <DialogHeader>
                <DialogTitle>Selecionar período de descanso</DialogTitle>
              </DialogHeader>

              <div className="space-y-3">
                <Calendar
                  mode="range"
                  selected={restRange}
                  onSelect={setRestRange}
                  initialFocus
                />
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="secondary" onClick={() => setRestDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button
                  type="button"
                  onClick={confirmRestDialog}
                  disabled={!restRange?.from}
                >
                  Confirmar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* SUBMISSÃO ÚNICA (commit de persistência) — sticky */}
          <div className="mt-6 sticky bottom-0 z-10 -mx-6 px-6 pb-6 pt-4 bg-background/80 backdrop-blur border-t rounded-b-2xl">
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="contract_json" value={contractJson} />
              <input type="hidden" name="confirm_apply" value={confirmApplyUi ? 'true' : 'false'} />

              <div className="flex items-center gap-2">
                <Checkbox
                  id="confirm_apply_footer"
                  checked={confirmApplyUi}
                  onCheckedChange={(v) => setConfirmApplyUi(Boolean(v))}
                />
                <Label htmlFor="confirm_apply_footer">Confirmo aplicar integralmente estas alterações</Label>
                <HelpTip text="Esta confirmação é necessária para salvar as mudanças." />
              </div>

              {blockingErrors.length > 0 ? (
                <Alert>
                  <div className="text-sm font-medium">Erros bloqueantes</div>
                  <ul className="text-sm list-disc pl-5 mt-2">
                    {blockingErrors.map((e, idx) => (
                      <li key={`${e}-${idx}`}>{e}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}

              {informativeIssues.length > 0 ? (
                <Alert>
                  <div className="text-sm font-medium">Avisos informativos</div>
                  <ul className="text-sm list-disc pl-5 mt-2">
                    {informativeIssues.map((e, idx) => (
                      <li key={idx}>{typeof e === 'string' ? e : JSON.stringify(e)}</li>
                    ))}
                  </ul>
                </Alert>
              ) : null}

              {state.message ? <p className="text-sm">{state.message}</p> : null}

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!canSubmit}>
                  {isPending ? 'Salvando...' : 'Salvar Perfil'}
                </Button>

                {!confirmApplyUi ? (
                  <p className="text-xs text-muted-foreground">
                    Para salvar, marque a confirmação.
                  </p>
                ) : null}
              </div>

              <p className="text-xs text-muted-foreground">
                Nota: este botão é o único commit de persistência.
              </p>
            </form>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
