import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export type DailyPlanUiStatus = "PLANNED" | "REST_DAY" | "EXECUTED";

const statusVariant: Record<
  DailyPlanUiStatus,
  React.ComponentProps<typeof Badge>["variant"]
> = {
  PLANNED: "secondary",
  REST_DAY: "outline",
  EXECUTED: "default",
};

const statusLabel: Record<DailyPlanUiStatus, string> = {
  PLANNED: "Planejado",
  REST_DAY: "Dia de descanso",
  EXECUTED: "Executado",
};

export function DailyStatusCard(props: {
  dateLabel: string; // string pronta (sem cálculo local)
  status: DailyPlanUiStatus;
  plannedDurationLabel: string; // string pronta (ex: "3h30min")
  availableDurationLabel: string; // string pronta (ex: "4h")
}) {
  return (
    <Card>
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <CardTitle className="text-lg">Meta Diária</CardTitle>
          <Badge variant={statusVariant[props.status]}>
            {statusLabel[props.status]}
          </Badge>
        </div>
        <div className="text-sm text-muted-foreground">{props.dateLabel}</div>
      </CardHeader>

      <Separator />

      <CardContent className="pt-4 space-y-2">
        <div className="text-sm">
          <span className="text-muted-foreground">Duração planejada: </span>
          <span className="font-medium">{props.plannedDurationLabel}</span>
        </div>
        <div className="text-sm">
          <span className="text-muted-foreground">Tempo disponível: </span>
          <span className="font-medium">{props.availableDurationLabel}</span>
        </div>
      </CardContent>
    </Card>
  );
}
