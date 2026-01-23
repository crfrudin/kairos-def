"use client";

import * as React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { runRobotDebugAction, runRobotPersistAction } from "./actions";

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

export function RoboDebugClient() {
  const [running, setRunning] = useState<"none" | "debug" | "persist">("none");
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);

  async function onRunDebug() {
    setRunning("debug");
    setError(null);
    try {
      const r = await runRobotDebugAction();
      setResult(r ?? null);
    } catch (e: unknown) {
      setError(toErrorMessage(e));
    } finally {
      setRunning("none");
    }
  }

  async function onRunPersist() {
    setRunning("persist");
    setError(null);
    try {
      const r = await runRobotPersistAction();
      setResult(r ?? null);
    } catch (e: unknown) {
      setError(toErrorMessage(e));
    } finally {
      setRunning("none");
    }
  }

  return (
    <Card>
      <CardContent className="p-6 space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-semibold">Robô (laboratório)</div>
            <div className="text-sm text-muted-foreground">
              Debug não persiste. Execução PROD persiste no DB e respeita guard (1x/dia).
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={onRunDebug} disabled={running !== "none"} variant="secondary">
              {running === "debug" ? "Executando..." : "Executar (debug)"}
            </Button>

            <Button onClick={onRunPersist} disabled={running !== "none"}>
              {running === "persist" ? "Persistindo..." : "Executar (persistir no DB)"}
            </Button>
          </div>
        </div>

        {error ? (
          <div className="text-sm text-destructive">{error}</div>
        ) : result ? (
          <div className="space-y-2">
            <div className="text-sm font-semibold">Resultado (retorno do robô)</div>
            <pre className="text-xs overflow-auto rounded-md border p-3">{JSON.stringify(result, null, 2)}</pre>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">Nenhuma execução nesta sessão.</div>
        )}
      </CardContent>
    </Card>
  );
}
