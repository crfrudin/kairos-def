import Link from "next/link";
import { PublicShell } from "../_components/PublicShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function ErrorPublicPage() {
  return (
    <PublicShell title="Erro" description="Ocorreu um problema ao carregar esta página.">
      <Alert variant="destructive">
        <AlertTitle>Falha inesperada</AlertTitle>
        <AlertDescription>Tente novamente em instantes.</AlertDescription>
      </Alert>

      <Button asChild className="w-full">
        <Link href="/">Voltar para a home</Link>
      </Button>
    </PublicShell>
  );
}
