"use client";

import * as React from "react";
import { Switch } from "@/components/ui/switch";

type Props = {
  /** nome do campo no FormData (ex.: "questions_enabled") */
  name: string;
  /** valor enviado quando ligado (ex.: "on" ou "LAW") */
  valueOn: string;
  /** valor enviado quando desligado (default: "") */
  valueOff?: string;
  /** label visual */
  label: string;
  /** descrição (opcional) */
  description?: string;
  /** estado inicial */
  defaultChecked?: boolean;
  /** callback opcional */
  onCheckedChange?: (checked: boolean) => void;
};

/**
 * UI passiva: Switch apenas controla o valor enviado no submit.
 * Envia via <input type="hidden">, sem "inteligência".
 */
export function ToggleSwitchField(props: Props) {
  const [checked, setChecked] = React.useState<boolean>(!!props.defaultChecked);

  const value = checked ? props.valueOn : (props.valueOff ?? "");

  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <div className="text-sm font-medium">{props.label}</div>
        {props.description ? (
          <div className="text-xs text-muted-foreground">{props.description}</div>
        ) : null}
      </div>

      {/* determinístico no submit */}
      <input type="hidden" name={props.name} value={value} />

      <Switch
        checked={checked}
        onCheckedChange={(v) => {
          setChecked(v);
          props.onCheckedChange?.(v);
        }}
      />
    </div>
  );
}
