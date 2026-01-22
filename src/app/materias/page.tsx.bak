import "server-only";

import Link from "next/link";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import { softDeleteMateriaAction } from "./actions";
import { SubjectOrderEditor } from "./ordem/SubjectOrderEditor";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Matérias</div>
          <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function MateriasPage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  const { listSubjectsMinimalUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listSubjectsMinimalUseCase.execute({ userId });

  const items = res.ok ? res.value.items : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold">Matérias</div>
            <div className="text-sm text-muted-foreground">
              Lista, cria, edita e soft delete. A ordem exibida respeita a prioridade salva (quando existir).
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild>
              <Link href="/materias/nova">Nova matéria</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {!res.ok ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold">Erro</div>
            <div className="text-sm text-muted-foreground">
              {res.error.code}: {res.error.message}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                    Nenhuma matéria cadastrada.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell className="font-medium">
                      <Link className="underline underline-offset-4" href={`/materias/${it.id}`}>
                        {it.name}
                      </Link>
                    </TableCell>

                    <TableCell>{it.isActive ? "Sim" : "Não"}</TableCell>

                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button asChild variant="outline" size="sm">
                          <Link href={`/materias/${it.id}`}>Abrir</Link>
                        </Button>

                        <form
                          action={async () => {
                            "use server";
                            await softDeleteMateriaAction({ subjectId: it.id });
                          }}
                        >
                          <Button
                            type="submit"
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            aria-label="Soft delete"
                            title="Soft delete"
                          >
                            ✕
                          </Button>
                        </form>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm font-semibold">Prioridade (ordem)</div>
          <div className="text-sm text-muted-foreground">
            Reordene e salve. A lista acima passa a refletir a prioridade salva.
          </div>
<div className="flex items-center gap-2">
  <Button asChild variant="outline">
    <Link href="/materias/ordem">Abrir em tela cheia</Link>
  </Button>
  </div>
          <SubjectOrderEditor items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
