import "server-only";

import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

function getTermsVersion(): string {
  return String(process.env.KAIROS_TERMS_VERSION ?? "").trim() || "2026-01-24";
}

export default async function TermosPage() {
  const version = getTermsVersion();

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Termos de Uso</CardTitle>
          <CardDescription>Versão: {version}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-muted-foreground">
          <p>
            Este documento descreve os termos de uso do KAIROS. (Conteúdo a ser finalizado na ETAPA 5 — versão jurídica.)
          </p>
          <p>
            O KAIROS é um sistema de planejamento e execução de estudos. A assinatura Premium controla acesso a recursos
            auxiliares e não altera regras do núcleo.
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
