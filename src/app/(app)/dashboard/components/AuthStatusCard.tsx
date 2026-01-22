import "server-only";

import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export async function AuthStatusCard() {
  const h = await headers();

  const authenticated = (h.get("x-kairos-is-authenticated") ?? "") === "true";
  const emailConfirmed = (h.get("x-kairos-email-confirmed") ?? "") === "true";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Autenticação</CardTitle>
      </CardHeader>
      <CardContent className="text-sm space-y-1">
        <div>{authenticated ? "Usuário autenticado" : "Não autenticado"}</div>
        <div>{emailConfirmed ? "Email confirmado" : "Email não confirmado"}</div>
      </CardContent>
    </Card>
  );
}
