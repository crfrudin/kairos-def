import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

import type { CalendarProjectionPayload } from "@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort";
import { addDaysIso, formatIsoDatePtBr, isIsoInRange } from "./format";

type Props = {
  projection: CalendarProjectionPayload | null;
  rangeStartIso: string; // YYYY-MM-DD
  rangeEndIso: string;   // YYYY-MM-DD
};

function badgeForStatus(status: "REST_DAY" | "PLANNED" | "EXECUTED") {
  if (status === "EXECUTED") return <Badge>Executado</Badge>;
  if (status === "REST_DAY") return <Badge variant="secondary">Descanso</Badge>;
  return <Badge variant="outline">Planejado</Badge>;
}

function pickStatus(
  projection: CalendarProjectionPayload | null,
  iso: string
): "REST_DAY" | "PLANNED" | "EXECUTED" | null {
  if (!projection) return null;
  const hit = projection.days.find((d) => d.date === iso);
  return hit ? (hit.status as "REST_DAY" | "PLANNED" | "EXECUTED") : null;
}

export function CalendarWeekView(props: Props) {
  const days = Array.from({ length: 7 }).map((_, i) => addDaysIso(props.rangeStartIso, i));

  return (
    <div className="space-y-3">
      {!props.projection ? (
        <div className="rounded-lg border p-6 text-sm text-muted-foreground">
          Nenhuma projeção materializada para este intervalo.
        </div>
      ) : null}

      {days.map((iso) => {
        if (!isIsoInRange(iso, props.rangeStartIso, props.rangeEndIso)) return null;

        const status = pickStatus(props.projection, iso);

        return (
          <Card key={iso}>
            <CardContent className="flex items-center justify-between gap-4 p-4">
              <div>
                <div className="text-sm font-semibold">{formatIsoDatePtBr(iso)}</div>
                <div className="text-xs text-muted-foreground">{iso}</div>
              </div>

              <div className="shrink-0">
                {status ? badgeForStatus(status) : <Badge variant="outline">Sem dado</Badge>}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
