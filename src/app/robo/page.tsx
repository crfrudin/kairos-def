import "server-only";

import { headers } from "next/headers";

import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { getRobotStateAction } from "./actions";
import { RoboDebugClient } from "./RoboDebugClient";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Robô</div>
          <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function RoboPage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  const state = await getRobotStateAction();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* ✅ Debug real (retorno direto do robô) */}
      <RoboDebugClient />

      {/* ✅ Estado oficial (DB) */}
      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm font-semibold">Estado atual (DB)</div>

          {!state.ok ? (
            <div className="text-sm text-muted-foreground">{state.errorMessage}</div>
          ) : (
            <>
              <div className="text-sm text-muted-foreground">
                Última execução (dia SP): <span className="font-medium">{state.runDay ?? "N/D"}</span>
              </div>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tribunal</TableHead>
                    <TableHead>Latest (DB)</TableHead>
                    <TableHead>Checked day</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {state.latest.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                        Nenhum dado global ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    state.latest.map((r) => (
                      <TableRow key={r.tribunal}>
                        <TableCell className="font-medium">{r.tribunal}</TableCell>
                        <TableCell>{r.latestAvailableNumber}</TableCell>
                        <TableCell>{r.checkedDay}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

              {state.lastRunDetails ? (
                <div className="space-y-2">
                  <div className="text-sm font-semibold">Último log persistido (DB)</div>
                  <pre className="text-xs overflow-auto rounded-md border p-3">{JSON.stringify(state.lastRunDetails, null, 2)}</pre>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
