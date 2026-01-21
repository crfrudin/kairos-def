import "server-only";

import Link from "next/link";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import { SubjectOrderEditor } from "./SubjectOrderEditor";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Ordem das matérias</div>
          <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function MateriasOrdemPage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  const { listSubjectsMinimalUseCase } = createSubjectsSsrComposition({ userId });
  const res = await listSubjectsMinimalUseCase.execute({ userId });

  const items = res.ok ? [...res.value.items] : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold">Ordem das matérias</div>
            <div className="text-sm text-muted-foreground">
              Ajuste a ordem explicitamente (↑/↓). A UI envia os IDs na ordem escolhida para o Use-Case de substituição integral.
            </div>
          </div>

          <Button asChild variant="outline">
            <Link href="/materias">Voltar</Link>
          </Button>
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
        <CardContent className="p-6 space-y-4">
          <div className="text-sm font-semibold">Reordenação</div>
          <div className="text-sm text-muted-foreground">
            Nenhuma regra é aplicada no frontend. Você define a ordem manualmente e salva.
          </div>

          <SubjectOrderEditor items={items} />
        </CardContent>
      </Card>
    </div>
  );
}
