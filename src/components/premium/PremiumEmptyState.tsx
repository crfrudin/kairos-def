import { Button } from "@/components/ui/button";

type PremiumEmptyStateProps = {
  title?: string;
  description: string;
  ctaLabel?: string;
  onCta?: () => void;
};

export function PremiumEmptyState({
  title = "Análises Premium",
  description,
  ctaLabel = "Conhecer planos Premium",
  onCta,
}: PremiumEmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed p-6 text-center">
      <div className="text-base font-semibold">{title}</div>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4">
        <Button onClick={onCta}>{ctaLabel}</Button>
      </div>
    </div>
  );
}
