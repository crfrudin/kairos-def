"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  /**
   * Quando true, envia categories=QUESTIONS automaticamente ao habilitar.
   * Útil quando removemos os checkboxes de categoria (fonte única = box).
   */
  emitCategoryWhenEnabled?: boolean;

  defaults?: {
    enabled?: boolean;
    dailyTarget?: number;
  };
};

function nToString(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (!Number.isFinite(v)) return "";
  return String(v);
}

export function QuestionsConfigPanel(props: Props) {
  const [enabled, setEnabled] = React.useState<boolean>(!!props.defaults?.enabled);
  const [dailyTarget, setDailyTarget] = React.useState<string>(nToString(props.defaults?.dailyTarget ?? 0));

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="text-sm font-semibold">Questões (opcional)</div>

      {/* Hidden determinísticos (contrato atual) */}
      <input type="hidden" name="questions_enabled" value={enabled ? "on" : ""} />
      <input type="hidden" name="questions_daily_target" value={dailyTarget} />

      {/* remove a necessidade do checkbox em "Categorias" */}
      {props.emitCategoryWhenEnabled && enabled ? <input type="hidden" name="categories" value="QUESTIONS" /> : null}

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">Habilitar</div>
          <div className="text-xs text-muted-foreground">Opcional. O backend valida consistência.</div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      <div className="space-y-2">
        <Label>Meta diária</Label>
        <Input
          type="number"
          min={0}
          value={dailyTarget}
          onChange={(e) => setDailyTarget(e.currentTarget.value)}
        />
        <div className="text-xs text-muted-foreground">Campo enviado explicitamente. O backend valida a consistência.</div>
      </div>
    </div>
  );
}
