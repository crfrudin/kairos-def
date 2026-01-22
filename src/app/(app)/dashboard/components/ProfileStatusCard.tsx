import "server-only";

import { headers } from "next/headers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { createProfileSsrComposition } from "@/core/composition/profile.ssr.composition";

export async function ProfileStatusCard() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";

  if (!userId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Perfil</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">Não autenticado</CardContent>
      </Card>
    );
  }

  const { getProfileUseCase } = createProfileSsrComposition({ userId });

  // UC-01 — GetProfile (factual). UI apenas exibe.
  const contract = await getProfileUseCase.execute(userId);

  const configured = contract !== null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Perfil</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">{configured ? "Perfil configurado" : "Perfil incompleto"}</CardContent>
    </Card>
  );
}
