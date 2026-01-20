'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

import { updateProfileAction } from '@/app/perfil/actions';

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

function tryParseContract(raw: string): { ok: true; contract: ProfileContract } | { ok: false; error: string } {
  if (!raw.trim()) return { ok: false, error: 'EMPTY' };
  try {
    const obj = JSON.parse(raw) as ProfileContract;
    if (!obj || typeof obj !== 'object') return { ok: false, error: 'NOT_OBJECT' };
    if (!obj.rules || !Array.isArray(obj.weekdayRules) || !obj.extrasDurations || !obj.autoReviewPolicy || !Array.isArray(obj.restPeriods)) {
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
    case 1: return 'Segunda';
    case 2: return 'Terça';
    case 3: return 'Quarta';
    case 4: return 'Quinta';
    case 5: return 'Sexta';
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

export function ProfileEditShell(props: { initialContractJson: string; authStatusMessage?: string }) {
  const [contractJson, setContractJson] = React.useState(props.initialContractJson);
  const parsed = React.useMemo(() => tryParseContract(contractJson), [contractJson]);

  const hasContract = parsed.ok;

  // Mantém um snapshot de objeto apenas quando o JSON for válido.
  const [contractObj, setContractObj] = React.useState<ProfileContract | null>(hasContract ? parsed.contract : null);

  React.useEffect(() => {
    if (parsed.ok) setContractObj(parsed.contract);
    // se JSON ficou inválido, não destruímos o último objeto (pra não “sumir” o form), mas o submit usará o JSON atual.
  }, [parsed]);

  const defaultTab = props.initialContractJson.trim() ? 'form' : 'json';

  const [state, formAction, isPending] = React.useActionState(updateProfileAction, initialState);

  const blockingErrors = state.ok ? [] : state.blockingErrors ?? [];
  const informativeIssues = state.informativeIssues ?? [];

  const formDisabledReason =
    !props.initialContractJson.trim()
      ? 'Sem perfil ainda. Crie o primeiro contrato pelo modo JSON.'
      : !hasContract
        ? 'JSON inválido. Corrija o JSON para habilitar o formulário.'
        : null;

  function syncFromObj(next: ProfileContract) {
    // Regra: UI não cria defaults normativos. Aqui só refletimos alterações explícitas do usuário.
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

  function updateRestPeriod(id: string, patch: Partial<ProfileContract['restPeriods'][number]>) {
    if (!contractObj) return;
    syncFromObj({
      ...contractObj,
      restPeriods: contractObj.restPeriods.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    });
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl">Editar Perfil (Fase 1)</CardTitle>

        {props.authStatusMessage ? (
          <Alert className="mt-3">
            <div className="text-sm">{props.authStatusMessage}</div>
          </Alert>
        ) : null}

        <p className="text-sm text-muted-foreground mt-2">
          Esta tela é <strong>camada de input</strong>. Nenhuma regra crítica é aplicada aqui.
          O backend valida e pode rejeitar estados inválidos.
        </p>
      </CardHeader>

      <CardContent>
        <Tabs defaultValue={defaultTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="form">Formulário</TabsTrigger>
            <TabsTrigger value="json">JSON</TabsTrigger>
          </TabsList>

          <TabsContent value="form">
            {formDisabledReason ? (
              <Alert>
                <div className="text-sm">{formDisabledReason}</div>
              </Alert>
            ) : null}

            <div className={formDisabledReason ? 'opacity-50 pointer-events-none' : ''}>
              <div className="space-y-6">
                {/* Regras gerais */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Regras gerais</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Modo de estudo</Label>
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
                      <Label>Limite de matérias de teoria por dia (1..9)</Label>
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

                {/* Regras por dia da semana */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Semana (horário + tipos)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {(contractObj?.weekdayRules ?? []).slice().sort((a, b) => a.weekday - b.weekday).map((r) => (
                      <div key={r.weekday} className="rounded-xl border p-4 space-y-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="font-medium">{weekdayLabel(r.weekday)}</div>

                          <div className="flex items-center gap-2">
                            <Label className="text-xs">Minutos do dia</Label>
                            <Input
                              className="w-28"
                              type="number"
                              min={0}
                              max={1440}
                              value={r.dailyMinutes}
                              onChange={(e) => updateWeekdayRule(r.weekday, { dailyMinutes: clampInt(e.target.value, r.dailyMinutes) })}
                            />
                          </div>
                        </div>

                        {r.dailyMinutes === 0 ? (
                          <p className="text-xs text-muted-foreground">
                            Observação: quando minutos = 0, o backend exige todos os tipos desmarcados.
                          </p>
                        ) : null}

                        <div className="grid grid-cols-2 gap-3">
                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={r.hasTheory}
                              onCheckedChange={(v) => updateWeekdayRule(r.weekday, { hasTheory: Boolean(v) })}
                            />
                            Teoria
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={r.hasQuestions}
                              onCheckedChange={(v) => updateWeekdayRule(r.weekday, { hasQuestions: Boolean(v) })}
                            />
                            Questões
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={r.hasInformatives}
                              onCheckedChange={(v) => updateWeekdayRule(r.weekday, { hasInformatives: Boolean(v) })}
                            />
                            Informativos
                          </label>

                          <label className="flex items-center gap-2 text-sm">
                            <Checkbox
                              checked={r.hasLeiSeca}
                              onCheckedChange={(v) => updateWeekdayRule(r.weekday, { hasLeiSeca: Boolean(v) })}
                            />
                            Lei Seca
                          </label>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Extras */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Durações globais de extras (minutos)</CardTitle>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Questões</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1440}
                        value={contractObj?.extrasDurations.questionsMinutes ?? 0}
                        onChange={(e) => updateExtras({ questionsMinutes: clampInt(e.target.value, 0) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Informativos</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1440}
                        value={contractObj?.extrasDurations.informativesMinutes ?? 0}
                        onChange={(e) => updateExtras({ informativesMinutes: clampInt(e.target.value, 0) })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Lei Seca</Label>
                      <Input
                        type="number"
                        min={0}
                        max={1440}
                        value={contractObj?.extrasDurations.leiSecaMinutes ?? 0}
                        onChange={(e) => updateExtras({ leiSecaMinutes: clampInt(e.target.value, 0) })}
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
                      <Label>Ativar revisões automáticas</Label>
                      <Switch
                        checked={Boolean(contractObj?.autoReviewPolicy.enabled)}
                        onCheckedChange={(v) => updateAutoReview({ enabled: Boolean(v) })}
                      />
                    </div>

                    {contractObj?.autoReviewPolicy.enabled ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Frequência (dias)</Label>
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
                          <Label>Duração da revisão (minutos)</Label>
                          <Input
                            type="number"
                            min={0}
                            max={1440}
                            value={contractObj.autoReviewPolicy.reviewMinutes ?? 0}
                            onChange={(e) => updateAutoReview({ reviewMinutes: clampInt(e.target.value, 0) })}
                          />
                        </div>

                        <div className="flex items-center justify-between md:items-end">
                          <Label>Reservar bloco de tempo</Label>
                          <Switch
                            checked={Boolean(contractObj.autoReviewPolicy.reserveTimeBlock)}
                            onCheckedChange={(v) => updateAutoReview({ reserveTimeBlock: Boolean(v) })}
                          />
                        </div>

                        <p className="text-xs text-muted-foreground md:col-span-3">
                          Observação: quando enabled=true, frequência e duração são obrigatórios (backend rejeita se faltar).
                        </p>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>

                {/* Descansos (somente editar existentes; sem add/remove neste bloco) */}
                <Card className="rounded-2xl">
                  <CardHeader>
                    <CardTitle className="text-base">Períodos de descanso (existentes)</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {(contractObj?.restPeriods ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        Nenhum período cadastrado. Para criar o primeiro, use o modo JSON neste momento.
                      </p>
                    ) : (
                      (contractObj?.restPeriods ?? []).map((p) => (
                        <div key={p.id} className="rounded-xl border p-4 space-y-3">
                          <div className="text-xs text-muted-foreground break-all">id: {p.id}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label>Início</Label>
                              <Input
                                type="date"
                                value={p.startDate}
                                onChange={(e) => updateRestPeriod(p.id, { startDate: e.target.value })}
                              />
                            </div>
                            <div className="space-y-2">
                              <Label>Fim</Label>
                              <Input
                                type="date"
                                value={p.endDate}
                                onChange={(e) => updateRestPeriod(p.id, { endDate: e.target.value })}
                              />
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="json">
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="contract_json">Contrato completo (JSON)</Label>
                <Textarea
                  id="contract_json"
                  name="contract_json"
                  value={contractJson}
                  onChange={(e) => setContractJson(e.target.value)}
                  rows={18}
                  placeholder="Cole aqui o ProfileContract completo (rules + 7 weekdayRules + extrasDurations + autoReviewPolicy + restPeriods)."
                />
                <p className="text-xs text-muted-foreground">
                  Não há “salvamento parcial”. O UC-02 exige substituição integral.
                </p>

                {!contractJson.trim() ? (
                  <Alert>
                    <div className="text-sm">
                      Sem perfil ainda: crie o primeiro contrato preenchendo o JSON completo.
                      (Nenhum template automático é gerado pela UI.)
                    </div>
                  </Alert>
                ) : null}

                {!parsed.ok && contractJson.trim() ? (
                  <Alert>
                    <div className="text-sm">
                      JSON inválido ou incompleto ({parsed.error}). Corrija para habilitar o formulário e/ou salvar.
                    </div>
                  </Alert>
                ) : null}
              </div>

              <div className="flex items-center gap-2">
                <Checkbox id="confirm_apply" name="confirm_apply" />
                <Label htmlFor="confirm_apply">Confirmo aplicar integralmente estas alterações</Label>
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

              <div className="flex gap-2">
                <Button type="submit" disabled={isPending}>
                  {isPending ? 'Salvando...' : 'Salvar Perfil'}
                </Button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
