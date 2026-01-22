import "server-only";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function ShellPreviewPage() {
  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Shell Visual — Preview</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Esta página existe apenas para validar o layout global (sidebar + header) sem navegação funcional.
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Card Placeholder</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Conteúdo passivo.</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Card Placeholder</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">Conteúdo passivo.</CardContent>
        </Card>
      </div>
    </div>
  );
}
