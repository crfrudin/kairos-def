"use client";

import * as React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { runRobotDebugAction } from "./actions";

export function RoboDebugClient() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRun() {
    setRunning(true);
    setError(null);
    try {
      const r = await runRobotDebugAction();
      setResult(r ?? null);
    } catch (e: any) {
      setError(String(e?.message ?? e));
    } finally {
      setRunning(false);
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Robô (laboratório)</div>
            <div className="text-sm text-muted-foreground">
              Execução manual com debug (preview do que foi lido). Não persiste no DB.
            </div>
          </div>

          <Button onClick={onRun} disabled={running}>
            {running ? "Executando..." : "Executar agora (debug)"}
          </Button>
        </div>

        {error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : result ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Resultado do debug (retorno do robô)</div>
            <pre className="text-xs overflow-auto rounded-md border p-3">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nenhuma execução de debug nesta sessão.</div>
        )}
      </CardContent>
    </Card>
  );
}
