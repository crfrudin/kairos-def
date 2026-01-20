"use client";

import { Calendar } from "@/components/ui/calendar";
import type { CalendarProjectionPayload } from "@/features/daily-plan/application/ports/ICalendarProjectionPersistencePort";

import { isoToStableDate } from "./format";

type Props = {
  projection: CalendarProjectionPayload | null;
  monthStartIso: string; // YYYY-MM-DD
};

type DayPlanStatus = "REST_DAY" | "PLANNED" | "EXECUTED";

function buildModifierDates(projection: CalendarProjectionPayload | null): {
  planned: Date[];
  rest: Date[];
  executed: Date[];
} {
  if (!projection) return { planned: [], rest: [], executed: [] };

  const planned: Date[] = [];
  const rest: Date[] = [];
  const executed: Date[] = [];

  projection.days.forEach((d) => {
    const dt = isoToStableDate(d.date);
    const status = d.status as DayPlanStatus;

    if (status === "EXECUTED") executed.push(dt);
    else if (status === "REST_DAY") rest.push(dt);
    else planned.push(dt);
  });

  return { planned, rest, executed };
}

export function CalendarMonthView(props: Props) {
  const { planned, rest, executed } = buildModifierDates(props.projection);

  return (
    <div className="rounded-lg border p-3">
      <Calendar
        mode="single"
        selected={undefined}
        onSelect={undefined}
        month={isoToStableDate(props.monthStartIso)}
        modifiers={{
          planned,
          rest,
          executed,
        }}
        modifiersClassNames={{
          planned: "bg-muted text-foreground",
          rest: "bg-secondary text-foreground",
          executed: "bg-primary text-primary-foreground",
        }}
      />

      {!props.projection ? (
        <div className="mt-3 text-sm text-muted-foreground">
          Nenhuma projeção materializada para este intervalo.
        </div>
      ) : null}
    </div>
  );
}
