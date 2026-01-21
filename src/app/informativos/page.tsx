// src/app/informativos/page.tsx
import "server-only";

import { headers } from "next/headers";

import { Card, CardContent } from "@/components/ui/card";
import { InformativosPage } from "@/features/informatives/ui/InformativosPage";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Informativos</div>
          <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function InformativosRoutePage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  const planAuthorization = h.get("x-kairos-plan-authorization") ?? undefined;

  return <InformativosPage userId={userId} planAuthorization={planAuthorization} />;
}
