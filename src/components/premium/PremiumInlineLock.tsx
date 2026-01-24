import { Lock } from "lucide-react";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

type PremiumInlineLockProps = {
  label?: string;
  helperText?: string;
  tooltipText?: string;
  className?: string;
};

export function PremiumInlineLock({
  label = "🔒 Premium",
  helperText = "Disponível no plano Premium. Não afeta suas metas.",
  tooltipText = "Este recurso oferece análises adicionais. Sua rotina de estudo não é afetada.",
  className,
}: PremiumInlineLockProps) {
  return (
    <div className={className}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Lock className="h-4 w-4" />
              <span className="font-medium">{label}</span>
            </div>
          </TooltipTrigger>
          <TooltipContent>{tooltipText}</TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <div className="mt-1 text-xs text-muted-foreground">{helperText}</div>
    </div>
  );
}
