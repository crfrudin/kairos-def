import "server-only";

import { headers } from "next/headers";
import Link from "next/link";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

import { getAdministrativeProfileFlags } from "@/core/read-models/administrative-profile.flags";

export async function AdministrativeProfileStatusCard() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Dados administrativos</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">Não autenticado</CardContent>
      </Card>
    );
  }

  const flags = await getAdministrativeProfileFlags(userId);

  const statusText = flags.isAdministrativeProfileComplete
    ? "Perfil administrativo completo"
    : "Dados administrativos incompletos";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados administrativos</CardTitle>
      </CardHeader>

      <CardContent className="text-sm space-y-2">
        <div>{statusText}</div>

        <Button asChild variant="outline" size="sm">
          <Link href="/ajustes" aria-label="Abrir página de ajustes administrativos">
            Abrir ajustes
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
