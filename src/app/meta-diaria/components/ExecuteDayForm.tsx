"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { ExecutedDayResultStatus } from "@/features/daily-plan/application/ports/IExecutionPersistencePort";
import { executeDayAction } from "../actions";

const RESULT_STATUS_OPTIONS: Array<{ value: ExecutedDayResultStatus; label: string }> = [
  { value: "COMPLETED", label: "Concluída" },
  { value: "PARTIAL", label: "Parcial" },
  { value: "NOT_COMPLETED", label: "Não concluída" },
  { value: "REST_DAY", label: "Dia de descanso" },
];

export function ExecuteDayForm(props: {
  isoDate: string; // YYYY-MM-DD (servidor decide qual dia está sendo exibido)
  disabled: boolean;
}) {
  const [resultStatus, setResultStatus] = React.useState<ExecutedDayResultStatus>("COMPLETED");
  const [minutes, setMinutes] = React.useState<string>("0");
  const [open, setOpen] = React.useState(false);

  async function onConfirm() {
    const totalExecutedMinutes = Number.parseInt(minutes, 10);
    await executeDayAction({
      date: props.isoDate,
      resultStatus,
      totalExecutedMinutes: Number.isFinite(totalExecutedMinutes) ? totalExecutedMinutes : 0,
    });
    setOpen(false);
  }

  return (
    <div className="rounded-lg border p-4 space-y-4">
      <div className="space-y-1">
        <div className="text-sm font-semibold">Registrar execução do dia</div>
        <div className="text-xs text-muted-foreground">
          Esta ação é factual e auditável. Não recalcula plano.
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="space-y-2">
          <Label>Resultado do dia</Label>
          <Select
            value={resultStatus}
            onValueChange={(v) => setResultStatus(v as ExecutedDayResultStatus)}
            disabled={props.disabled}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione..." />
            </SelectTrigger>
            <SelectContent>
              {RESULT_STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Total executado (minutos)</Label>
          <Input
            inputMode="numeric"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            disabled={props.disabled}
            placeholder="0..1440"
          />
          <div className="text-xs text-muted-foreground">Informe um inteiro entre 0 e 1440.</div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" disabled={props.disabled}>
            Marcar dia como executado
          </Button>
        </DialogTrigger>

        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmar execução</DialogTitle>
            <DialogDescription>
              Você está registrando a execução factual do dia {props.isoDate}. Isso não recalcula o plano.
            </DialogDescription>
          </DialogHeader>

          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Resultado: </span>
              <span className="font-medium">{resultStatus}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Minutos executados: </span>
              <span className="font-medium">{minutes}</span>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={() => void onConfirm()}>
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
