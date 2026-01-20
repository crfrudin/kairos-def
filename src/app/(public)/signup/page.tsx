import Link from "next/link";
import { PublicShell } from "../_components/PublicShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { signUpAction } from "./actions";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; e?: string }>;
}) {
  const sp = await searchParams;
  const ok = sp?.ok === "1";
  const error = typeof sp?.e === "string" ? sp.e : null;

  if (ok) {
    return (
      <PublicShell
        title="Confirme seu email"
        description="Enviamos um link de confirmação. Verifique sua caixa de entrada para ativar sua conta."
      >
        <Alert>
          <AlertTitle>Quase lá</AlertTitle>
          <AlertDescription>
            Se você não encontrar o email, verifique também o spam/lixo eletrônico.
          </AlertDescription>
        </Alert>

        <Button asChild className="w-full">
          <Link href="/login">Voltar para entrar</Link>
        </Button>
      </PublicShell>
    );
  }

  return (
    <PublicShell title="Criar conta" description="Crie sua conta no KAIROS.">
      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <form action={signUpAction as never} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required autoComplete="email" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Senha</Label>
          <Input id="password" name="password" type="password" required autoComplete="new-password" />
        </div>

        <div className="space-y-2">
          <Label htmlFor="passwordConfirm">Confirmar senha</Label>
          <Input
            id="passwordConfirm"
            name="passwordConfirm"
            type="password"
            required
            autoComplete="new-password"
          />
        </div>

        <Button type="submit" className="w-full">
          Criar conta
        </Button>
      </form>

      <div className="flex items-center justify-between text-sm">
        <Link className="text-muted-foreground hover:text-foreground" href="/login">
          Já tenho conta
        </Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/recuperar-senha">
          Esqueci minha senha
        </Link>
      </div>
    </PublicShell>
  );
}
