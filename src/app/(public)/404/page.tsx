import Link from "next/link";
import { PublicShell } from "../_components/PublicShell";
import { Button } from "@/components/ui/button";

export default function NotFoundPublicPage() {
  return (
    <PublicShell title="Página não encontrada" description="O endereço informado não existe.">
      <Button asChild className="w-full">
        <Link href="/">Voltar para a home</Link>
      </Button>
    </PublicShell>
  );
}
