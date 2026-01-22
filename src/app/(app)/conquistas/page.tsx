import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function ConquistasPlaceholderPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-semibold">Conquistas</h1>
        <Badge variant="secondary">Em breve</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Funcionalidade futura</CardTitle>
          <CardDescription>
            Esta área será ativada em uma fase futura (Fase 5 — Gamificação).
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Placeholder estritamente informativo. Nenhum progresso é simulado e nenhuma métrica é exibida.
        </CardContent>
      </Card>
    </div>
  );
}
