"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Info } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

type FreePlanBannerProps = {
  /** Se fornecido, permite esconder o banner em cenários futuros (ex.: Premium). */
  visible?: boolean;
};

export function FreePlanBanner({ visible = true }: FreePlanBannerProps) {
  const router = useRouter();
  const [dismissed, setDismissed] = useState(false);

  if (!visible || dismissed) return null;

  return (
    <Card>
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Info className="mt-0.5 h-5 w-5 text-muted-foreground" />
          <div>
            <div className="font-medium">Você está no plano gratuito</div>
            <p className="text-sm text-muted-foreground">
              O plano gratuito oferece acesso completo ao núcleo de estudo do KAIROS. O plano Premium libera
              ferramentas extras de visualização e organização.
            </p>
          </div>
        </div>

        <div className="flex gap-2 sm:flex-shrink-0">
          <Button onClick={() => router.push("/assinatura")}>Ver plano Premium</Button>
          <Button variant="ghost" onClick={() => setDismissed(true)}>
            Entendi
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
