import "server-only";

import Link from "next/link";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import { replaceMateriaAction, softDeleteMateriaByIdAction } from "./actions";

import { LawConfigPanel } from "../components/LawConfigPanel";
import { QuestionsConfigPanel } from "../components/QuestionsConfigPanel";
import { TheoryCategoryDialog } from "../components/TheoryCategoryDialog";

function AuthFail() {
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="p-6">
          <div className="text-lg font-semibold">Matéria</div>
          <div className="text-sm text-muted-foreground">Falha de autenticação. Volte ao login.</div>
        </CardContent>
      </Card>
    </div>
  );
}

export default async function MateriaDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) return <AuthFail />;

  // Lista de matérias existentes para o seletor de Lei Seca (Subject | Outro).
  const { listSubjectsMinimalUseCase } = createSubjectsSsrComposition({ userId });
  const listRes = await listSubjectsMinimalUseCase.execute({ userId });
  const subjectNames = listRes.ok ? listRes.value.items.map((x) => x.name) : [];

  const { getSubjectAggregateUseCase } = createSubjectsSsrComposition({ userId });
  const res = await getSubjectAggregateUseCase.execute({ userId, subjectId: id });

  if (!res.ok) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <Card>
          <CardContent className="flex items-start justify-between gap-4 p-6">
            <div>
              <div className="text-lg font-semibold">Matéria</div>
              <div className="text-sm text-muted-foreground">
                ID: <code>{id}</code>
              </div>
            </div>
            <Button asChild variant="outline">
              <Link href="/materias">Voltar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold">Erro</div>
            <div className="text-sm text-muted-foreground">
              {res.error.code}: {res.error.message}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const agg = res.value.aggregate;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold">Matéria</div>
            <div className="text-sm text-muted-foreground">
              ID: <code>{id}</code>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline">
              <Link href="/materias">Voltar</Link>
            </Button>

            <form
              action={async () => {
                "use server";
                await softDeleteMateriaByIdAction({ subjectId: id });
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
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm font-semibold">Editar (Use-Case ReplaceSubjectAggregate)</div>

          <form
            action={async (fd: FormData) => {
              "use server";
              await replaceMateriaAction({ subjectId: id, formData: fd });
            }}
            className="space-y-6"
          >
            <div className="space-y-2">
              <div className="text-sm font-medium">Nome</div>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                name="name"
                defaultValue={agg.subject.name}
                required
              />
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Categorias</div>
              <div className="space-y-3">
                {/* Fonte única para THEORY: switch + modal + hidden categories=THEORY */}
                <TheoryCategoryDialog
                  defaultChecked={agg.subject.categories.includes("THEORY")}
                  autoOpenOnCheck
                  defaults={{
                    reading_enabled: !!agg.readingTrack,
                    reading_total_pages: agg.readingTrack?.totalPages ?? 0,
                    reading_read_pages: agg.readingTrack?.readPages ?? 0,
                    reading_pacing_mode: agg.readingTrack?.pacingMode ?? "FIXED_PAGES_PER_DAY",
                    reading_pages_per_day: agg.readingTrack?.pagesPerDay ?? null,
                    reading_pages_per_hour: agg.readingTrack?.pagesPerHour ?? null,

                    video_enabled: !!agg.videoTrack,
                    video_total_blocks: agg.videoTrack?.totalBlocks ?? 0,
                    video_watched_blocks: agg.videoTrack?.watchedBlocks ?? 0,
                    video_pacing_mode: agg.videoTrack?.pacingMode ?? "FIXED_BLOCKS_PER_DAY",
                    video_blocks_per_day: agg.videoTrack?.blocksPerDay ?? null,
                    video_avg_minutes: agg.videoTrack?.avgMinutes ?? null,
                    video_playback_speed: agg.videoTrack?.playbackSpeed ?? "1x",
                  }}
                />

                {/* ✅ Removido: checkboxes de QUESTIONS e LAW (fonte única agora = boxes próprios) */}
                <div className="text-xs text-muted-foreground">
                  Questões e Lei Seca são ativadas nos blocos próprios abaixo.
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <select
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                name="status"
                defaultValue={agg.subject.status}
              >
                <option value="ATIVA">ATIVA</option>
                <option value="EM_ANDAMENTO">EM_ANDAMENTO</option>
                <option value="PAUSADA">PAUSADA</option>
                <option value="BLOQUEADA">BLOQUEADA</option>
                <option value="CONCLUIDA">CONCLUIDA</option>
              </select>
              <div className="text-xs text-muted-foreground">Lista controlada. O backend ainda valida.</div>
            </div>

            {/* ✅ Questões: padrão Switch + hidden inputs + emite categories=QUESTIONS quando habilitado */}
            <QuestionsConfigPanel
              emitCategoryWhenEnabled
              defaults={{
                enabled: !!agg.questionsMeta,
                dailyTarget: agg.questionsMeta?.dailyTarget ?? 0,
              }}
            />

            {/* ✅ Lei Seca: já era Switch + hidden; agora emite categories=LAW quando habilitado */}
            <LawConfigPanel
              emitCategoryWhenEnabled
              subjectNames={subjectNames}
              defaults={{
                enabled: !!agg.lawConfig,
                lawName: agg.lawConfig?.lawName ?? "",
                totalArticles: agg.lawConfig?.totalArticles ?? 0,
                readArticles: agg.lawConfig?.readArticles ?? 0,
                lawMode: agg.lawConfig?.lawMode ?? "COUPLED_TO_THEORY",
                fixedArticlesPerDay: agg.lawConfig?.fixedArticlesPerDay ?? null,
              }}
            />

            <div className="flex justify-end gap-2">
              <Button asChild variant="outline">
                <Link href="/materias">Cancelar</Link>
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
