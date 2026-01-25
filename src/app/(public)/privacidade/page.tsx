import "server-only";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getPrivacyVersion(): string {
  return String(process.env.KAIROS_PRIVACY_VERSION ?? "").trim() || "2026-01-24";
}

export default async function PrivacidadePage() {
  const version = getPrivacyVersion();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Política de Privacidade</CardTitle>
          <CardDescription>Versão: {version}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Esta política descreve como o KAIROS trata dados pessoais e administrativos. (Conteúdo a ser finalizado na ETAPA 5.)
          </p>
          <p>
            O aceite é registrado com data/hora e versão do documento, para fins de conformidade.
          </p>

          <div className="pt-2">
            <Button asChild variant="outline">
              <Link href="/ajustes">Voltar para Ajustes</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
