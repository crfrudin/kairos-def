import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function EstatisticasPlaceholderPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Estatísticas</h1>
        <Badge variant="secondary">Em breve</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidade futura</CardTitle>
          <CardDescription>
            Esta área será ativada em uma fase futura (Fase 4 — Estatísticas).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder estritamente informativo. Nenhum dado é consumido e nenhuma regra de negócio é aplicada aqui.
        </CardContent>
      </Card>
    </div>
  );
}
