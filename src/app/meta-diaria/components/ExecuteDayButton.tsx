"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";

export function ExecuteDayButton(props: {
  disabled: boolean;
  onExecute: () => Promise<void>;
}) {
  const [isPending, startTransition] = React.useTransition();

  return (
    <Button
      type="button"
      disabled={props.disabled || isPending}
      onClick={() => startTransition(() => void props.onExecute())}
    >
      {isPending ? "Marcando execução..." : "Marcar dia como executado"}
    </Button>
  );
}
