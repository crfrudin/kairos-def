import { Badge } from "@/components/ui/badge";

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className="bg-transparent text-foreground border" variant="outline">
        Planejado
      </Badge>
      <Badge className="bg-transparent text-foreground border" variant="outline">
        Descanso
      </Badge>
      <Badge className="bg-transparent text-foreground border" variant="outline">
        Executado
      </Badge>
    </div>
  );
}
