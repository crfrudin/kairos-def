'use client';

import * as React from 'react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

import { updateProfileAction } from '@/app/perfil/actions';

type ActionState =
  | { ok: true; informativeIssues: unknown[]; message?: string }
  | { ok: false; blockingErrors: string[]; informativeIssues: unknown[]; message?: string };

const initialState: ActionState = {
  ok: false,
  blockingErrors: [],
  informativeIssues: [],
};

export function ProfileEditShell(props: { initialContractJson: string; authStatusMessage?: string }) {
  const [contractJson, setContractJson] = React.useState(props.initialContractJson);
  const [state, formAction, isPending] = React.useActionState(updateProfileAction, initialState);

  const blockingErrors = state.ok ? [] : state.blockingErrors ?? [];
  const informativeIssues = state.informativeIssues ?? [];

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-xl">Editar Perfil (Fase 1)</CardTitle>

        {props.authStatusMessage ? (
          <Alert className="mt-3">
            <div className="text-sm">
              {props.authStatusMessage}
            </div>
          </Alert>
        ) : null}

        <p className="text-sm text-muted-foreground mt-2">
          Esta tela é <strong>camada de input</strong>. Nenhuma regra crítica é aplicada aqui.
          O backend valida e pode rejeitar estados inválidos.
        </p>
      </CardHeader>

      <CardContent>
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
              Observação: não há “salvamento parcial”. O UC-02 exige substituição integral.
            </p>
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

          {state.message ? (
            <p className="text-sm">{state.message}</p>
          ) : null}

          <div className="flex gap-2">
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Salvando...' : 'Salvar Perfil'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
