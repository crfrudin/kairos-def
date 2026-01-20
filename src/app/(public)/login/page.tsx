import Link from "next/link";
import { PublicShell } from "../_components/PublicShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { loginAction } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ e?: string; reset?: string }>;
}) {
  const sp = await searchParams;
  const error = typeof sp?.e === "string" ? sp.e : null;
  const reset = typeof sp?.reset === "string" ? sp.reset : null;

  return (
    <PublicShell title="Entrar" description="Acesse sua conta do KAIROS.">
      {reset ? (
        <Alert>
          <AlertTitle>Senha redefinida</AlertTitle>
          <AlertDescription>Agora você já pode entrar com a nova senha.</AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={loginAction as never} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required autoComplete="current-password" />
        </div>

        <Button type="submit" className="w-full">
          Entrar
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link className="text-muted-foreground hover:text-foreground" href="/recuperar-senha">
          Esqueci minha senha
        </Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/signup">
          Criar conta
        </Link>
      </div>
    </PublicShell>
  );
}
