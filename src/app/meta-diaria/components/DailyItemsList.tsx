import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type DailyPlanItemUiType = "REVIEW" | "EXTRA" | "THEORY";

const typeLabel: Record<DailyPlanItemUiType, string> = {
  REVIEW: "Revisão",
  EXTRA: "Extra",
  THEORY: "Teoria",
};

const typeVariant: Record<
  DailyPlanItemUiType,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  REVIEW: "secondary",
  EXTRA: "outline",
  THEORY: "default",
};

export type DailyPlanItemUi = {
  id: string;
  type: DailyPlanItemUiType;
  title: string; // string pronta do backend/DTO
  subtitle?: string; // string pronta (ex: "30min")
};

function Section(props: {
  title: string;
  type: DailyPlanItemUiType;
  items: DailyPlanItemUi[];
}) {
  if (props.items.length === 0) return null;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">{props.title}</h3>
        <Badge variant={typeVariant[props.type]}>{typeLabel[props.type]}</Badge>
      </div>

      <div className="space-y-2">
        {props.items.map((it) => (
          <div
            key={it.id}
            className="flex items-start justify-between gap-3 rounded-md border p-3"
          >
            <div className="space-y-1">
              <div className="text-sm font-medium">{it.title}</div>
              {it.subtitle ? (
                <div className="text-xs text-muted-foreground">{it.subtitle}</div>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DailyItemsList(props: {
  reviews: DailyPlanItemUi[];
  extras: DailyPlanItemUi[];
  theory: DailyPlanItemUi[];
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <CardTitle className="text-lg">Itens do dia</CardTitle>
        <div className="text-sm text-muted-foreground">
          Ordem normativa: Revisões → Extras → Teoria
        </div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-6">
        <Section title="Revisões" type="REVIEW" items={props.reviews} />
        <Section title="Extras" type="EXTRA" items={props.extras} />
        <Section title="Teoria" type="THEORY" items={props.theory} />
      </CardContent>
    </Card>
  );
}
