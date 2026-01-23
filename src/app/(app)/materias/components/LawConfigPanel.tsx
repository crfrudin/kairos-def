"use client";

import * as React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type LawMode = "COUPLED_TO_THEORY" | "FIXED_ARTICLES_PER_DAY";

type Props = {
  subjectNames: string[];

  /**
   * Quando true, envia categories=LAW automaticamente ao habilitar.
   * Útil para /materias/nova (onde removemos os checkboxes de categoria).
   */
  emitCategoryWhenEnabled?: boolean;

  defaults?: {
    enabled?: boolean;

    lawName?: string;
    totalArticles?: number;
    readArticles?: number;

    lawMode?: LawMode | string;
    fixedArticlesPerDay?: number | null;

    // (UI-only) defaults opcionais para vínculo visual
    link_choice?: string; // subject name | "OTHER" | ""
    link_other_label?: string;
  };
};

function nToString(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (!Number.isFinite(v)) return "";
  return String(v);
}

function s(v: unknown, fallback = ""): string {
  const x = String(v ?? "").trim();
  return x ? x : fallback;
}

function normalizeLawMode(v: unknown): LawMode {
  const x = String(v ?? "").trim();
  return x === "FIXED_ARTICLES_PER_DAY" ? "FIXED_ARTICLES_PER_DAY" : "COUPLED_TO_THEORY";
}

export function LawConfigPanel(props: Props) {
  const subjectNames = props.subjectNames ?? [];

  const [enabled, setEnabled] = React.useState<boolean>(!!props.defaults?.enabled);

  // ✅ Nome da lei = sempre input livre
  const [lawName, setLawName] = React.useState<string>(s(props.defaults?.lawName, ""));

  const [totalArticles, setTotalArticles] = React.useState<string>(nToString(props.defaults?.totalArticles ?? 0));
  const [readArticles, setReadArticles] = React.useState<string>(nToString(props.defaults?.readArticles ?? 0));

  const [lawMode, setLawMode] = React.useState<LawMode>(normalizeLawMode(props.defaults?.lawMode));
  const [fixedArticlesPerDay, setFixedArticlesPerDay] = React.useState<string>(nToString(props.defaults?.fixedArticlesPerDay ?? null));

  // ✅ Vínculo (UI-only): dropdown separado, não preenche nome da lei.
  const [linkChoice, setLinkChoice] = React.useState<string>(() => {
    const d = s(props.defaults?.link_choice, "");
    if (!d) return "";
    if (d === "OTHER") return "OTHER";
    if (subjectNames.includes(d)) return d;
    return "OTHER";
  });

  const [linkOtherLabel, setLinkOtherLabel] = React.useState<string>(s(props.defaults?.link_other_label, ""));

  React.useEffect(() => {
    if (!linkChoice) return;
    if (linkChoice === "OTHER") return;
    if (subjectNames.includes(linkChoice)) return;
    setLinkChoice("OTHER");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subjectNames.join("|")]);

  return (
    <div className="space-y-3 rounded-lg border p-4">
      <div className="text-sm font-semibold">Lei Seca (opcional)</div>

      {/* Hidden determinísticos (contrato atual) */}
      <input type="hidden" name="law_enabled" value={enabled ? "on" : ""} />
      <input type="hidden" name="law_mode" value={lawMode} />
      <input type="hidden" name="law_name" value={lawName} />
      <input type="hidden" name="law_total_articles" value={totalArticles} />
      <input type="hidden" name="law_read_articles" value={readArticles} />
      <input type="hidden" name="law_fixed_articles_per_day" value={fixedArticlesPerDay} />

      {/* remove a necessidade do checkbox amarelo em "Categorias" */}
      {props.emitCategoryWhenEnabled && enabled ? <input type="hidden" name="categories" value="LAW" /> : null}

      {/* (UI-only) Hidden explícitos para vínculo visual (backend pode ignorar) */}
      <input type="hidden" name="law_link_choice" value={linkChoice} />
      <input type="hidden" name="law_link_other_label" value={linkOtherLabel} />

      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">Habilitar</div>
          <div className="text-xs text-muted-foreground">Opcional. O backend valida consistência.</div>
        </div>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>

      {/* ✅ Nome da Lei = input livre sempre */}
      <div className="space-y-2">
        <Label>Nome da lei</Label>
        <Input value={lawName} onChange={(e) => setLawName(e.currentTarget.value)} placeholder="Ex.: CF/88" />
        <div className="text-xs text-muted-foreground">Campo livre. Enviado explicitamente.</div>
      </div>

      {/* ✅ Dropdown separado: vínculo (não preenche o nome) */}
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <Label>Vincular a uma matéria (opcional)</Label>
          <div className="text-xs text-muted-foreground">Deseja vincular esta lei a uma matéria?</div>
        </div>

        <Select value={linkChoice} onValueChange={setLinkChoice}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione (opcional)" />
          </SelectTrigger>
          <SelectContent>
            {subjectNames.map((n) => (
              <SelectItem key={n} value={n}>
                {n}
              </SelectItem>
            ))}
            <SelectItem value="OTHER">Outro</SelectItem>
          </SelectContent>
        </Select>

        {linkChoice === "OTHER" ? (
          <div className="space-y-2">
            <Label>Outro (texto livre)</Label>
            <Input
              value={linkOtherLabel}
              onChange={(e) => setLinkOtherLabel(e.currentTarget.value)}
              placeholder="Informe uma referência (opcional)"
            />
            <div className="text-xs text-muted-foreground">Campo opcional e explícito (UI-only). Não altera o nome da lei.</div>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Total artigos</Label>
          <Input type="number" min={0} value={totalArticles} onChange={(e) => setTotalArticles(e.currentTarget.value)} />
        </div>

        <div className="space-y-2">
          <Label>Artigos lidos</Label>
          <Input type="number" min={0} value={readArticles} onChange={(e) => setReadArticles(e.currentTarget.value)} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Modo</Label>
        <Select
          value={lawMode}
          onValueChange={(v) => {
            setLawMode(normalizeLawMode(v));
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Selecione" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="COUPLED_TO_THEORY">Vincular com Teoria</SelectItem>
            <SelectItem value="FIXED_ARTICLES_PER_DAY">Fixar meta diária</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {lawMode === "FIXED_ARTICLES_PER_DAY" ? (
        <div className="space-y-2">
          <Label>Meta diária (artigos/dia)</Label>
          <Input type="number" min={0} value={fixedArticlesPerDay} onChange={(e) => setFixedArticlesPerDay(e.currentTarget.value)} />
          <div className="text-xs text-muted-foreground">Campo enviado explicitamente. O backend valida a consistência.</div>
        </div>
      ) : null}
    </div>
  );
}
