import { Lock } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PremiumBadgeProps = {
  className?: string;
  tooltipText?: string;
};

export function PremiumBadge({
  className,
  tooltipText = "Recurso Premium. Seu estudo funciona normalmente no plano gratuito.",
}: PremiumBadgeProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={className}>
            <Badge variant="secondary" className="gap-1">
              <Lock className="h-3.5 w-3.5" />
              Premium
            </Badge>
          </span>
        </TooltipTrigger>
        <TooltipContent>{tooltipText}</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
