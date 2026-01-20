import Link from "next/link";
import { PublicShell } from "../_components/PublicShell";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

import { requestPasswordResetAction, resetPasswordAction } from "./actions";

export default async function RecuperarSenhaPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; e?: string; token?: string }>;
}) {
  const sp = await searchParams;
  const sent = sp?.sent === "1";
  const error = typeof sp?.e === "string" ? sp.e : null;
  const token = typeof sp?.token === "string" ? sp.token.trim() : "";

  const isResetMode = Boolean(token);

  return (
    <PublicShell
      title="Recuperar senha"
      description={
        isResetMode
          ? "Defina uma nova senha usando o link recebido por email."
          : "Informe seu email para receber instruções de redefinição."
      }
    >
      {sent ? (
        <Alert>
          <AlertTitle>Solicitação enviada</AlertTitle>
          <AlertDescription>
            Se o email estiver correto, você receberá instruções para redefinir sua senha.
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>Não foi possível concluir</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!isResetMode ? (
        <form action={requestPasswordResetAction as never} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" required autoComplete="email" />
          </div>

          <Button type="submit" className="w-full">
            Enviar link
          </Button>
        </form>
      ) : (
        <form action={resetPasswordAction as never} className="space-y-4">
          <input type="hidden" name="token" value={token} />

          <div className="space-y-2">
            <Label htmlFor="newPassword">Nova senha</Label>
            <Input id="newPassword" name="newPassword" type="password" required autoComplete="new-password" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPasswordConfirm">Confirmar nova senha</Label>
            <Input
              id="newPasswordConfirm"
              name="newPasswordConfirm"
              type="password"
              required
              autoComplete="new-password"
            />
          </div>

          <Button type="submit" className="w-full">
            Redefinir senha
          </Button>
        </form>
      )}

      <div className="mt-6 flex items-center justify-between text-sm">
        <Link className="text-muted-foreground hover:text-foreground" href="/login">
          Voltar para entrar
        </Link>
        <Link className="text-muted-foreground hover:text-foreground" href="/signup">
          Criar conta
        </Link>
      </div>
    </PublicShell>
  );
}
