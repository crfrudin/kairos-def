import { Lock } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";

type PremiumLockedCardProps = {
  title?: string;
  description: React.ReactNode;
  primaryCtaLabel?: string;
  secondaryCtaLabel?: string;
  onPrimaryCta?: () => void;
  onSecondaryCta?: () => void;
};

export function PremiumLockedCard({
  title = "Recurso Premium",
  description,
  primaryCtaLabel = "Ver planos",
  secondaryCtaLabel = "Agora não",
  onPrimaryCta,
  onSecondaryCta,
}: PremiumLockedCardProps) {
  return (
    <Card className="border-dashed">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Lock className="h-5 w-5 text-muted-foreground" />
          <CardTitle>{title}</CardTitle>
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-sm text-muted-foreground">{description}</div>
      </CardContent>

      <CardFooter className="flex gap-2">
        <Button size="sm" onClick={onPrimaryCta}>
          {primaryCtaLabel}
        </Button>
        <Button variant="ghost" size="sm" onClick={onSecondaryCta}>
          {secondaryCtaLabel}
        </Button>
      </CardFooter>
    </Card>
  );
}
