import "server-only";

import Link from "next/link";
import { headers } from "next/headers";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import { createMateriaAction } from "./actions";

import { TheoryCategoryDialog } from "../components/TheoryCategoryDialog";
import { LawConfigPanel } from "../components/LawConfigPanel";
import { QuestionsConfigPanel } from "../components/QuestionsConfigPanel";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Nova matéria</div>
          <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function MateriasNovaPage() {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  // ✅ SSR: carrega matérias existentes para o painel de Lei Seca (vínculo visual)
  const { listSubjectsMinimalUseCase } = createSubjectsSsrComposition({ userId });
  const listRes = await listSubjectsMinimalUseCase.execute({ userId });
  const subjectNames = listRes.ok ? listRes.value.items.map((x) => x.name) : [];

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold">Nova matéria</div>
            <div className="text-sm text-muted-foreground">Criação via Use-Case (Application). Campos são explícitos; sem inferência.</div>
          </div>
          <Button asChild variant="outline">
            <Link href="/materias">Voltar</Link>
          </Button>
        </CardContent>
      </Card>

      {!listRes.ok ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold">Aviso</div>
            <div className="text-sm text-muted-foreground">
              Não foi possível carregar a lista de matérias existentes para o painel de Lei Seca. Você ainda pode usar “Outro”.
              <br />
              {listRes.error.code}: {listRes.error.message}
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardContent className="p-6 space-y-6">
          <form action={createMateriaAction} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" name="name" placeholder="Ex.: Direito Constitucional" required />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Categorias</div>

              <div className="space-y-3">
                {/* ✅ THEORY abre modal ao selecionar (já emite categories=THEORY quando ligado) */}
                <TheoryCategoryDialog defaultChecked={false} autoOpenOnCheck />

                {/* ✅ Removidos os checkboxes amarelos (QUESTIONS / LAW).
                    Agora cada painel emite a categoria determinística quando habilitado. */}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-semibold">Status</div>
              <Select name="status" defaultValue="ATIVA">
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ATIVA">ATIVA</SelectItem>
                  <SelectItem value="EM_ANDAMENTO">EM_ANDAMENTO</SelectItem>
                  <SelectItem value="PAUSADA">PAUSADA</SelectItem>
                  <SelectItem value="BLOQUEADA">BLOQUEADA</SelectItem>
                  <SelectItem value="CONCLUIDA">CONCLUIDA</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* ✅ Questões com Switch + emite categories=QUESTIONS quando habilitado */}
            <QuestionsConfigPanel emitCategoryWhenEnabled defaults={{ enabled: false, dailyTarget: 0 }} />

            {/* ✅ Lei Seca via painel + emite categories=LAW quando habilitado */}
            <LawConfigPanel
              subjectNames={subjectNames}
              emitCategoryWhenEnabled
              defaults={{
                enabled: false,
                lawMode: "COUPLED_TO_THEORY",
              }}
            />

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/materias">Cancelar</Link>
              </Button>
              <Button type="submit">Criar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
