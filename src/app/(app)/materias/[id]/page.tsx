import "server-only";

import Link from "next/link";
import { headers } from "next/headers";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";
import { replaceMateriaAction, softDeleteMateriaByIdAction } from "./actions";

import { LawConfigPanel } from "../components/LawConfigPanel";
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

                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    name="categories"
                    value="QUESTIONS"
                    defaultChecked={agg.subject.categories.includes("QUESTIONS")}
                  />
                  Questões
                </label>

                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" name="categories" value="LAW" defaultChecked={agg.subject.categories.includes("LAW")} />
                  Lei Seca
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium">Status</div>
              <input
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                name="status"
                defaultValue={agg.subject.status}
                placeholder="ATIVA | EM_ANDAMENTO | PAUSADA | BLOQUEADA | CONCLUIDA"
              />
              <div className="text-xs text-muted-foreground">Input explícito; o backend valida.</div>
            </div>

            <div className="space-y-3 rounded-lg border p-4">
              <div className="text-sm font-semibold">Questões (opcional)</div>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="questions_enabled" defaultChecked={!!agg.questionsMeta} />
                Habilitar
              </label>
              <div className="space-y-1">
                <div className="text-sm">Meta diária</div>
                <input
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  name="questions_daily_target"
                  type="number"
                  min={0}
                  defaultValue={agg.questionsMeta?.dailyTarget ?? 0}
                />
              </div>
            </div>

            <LawConfigPanel
              subjectNames={subjectNames}
              defaults={{
                enabled: !!agg.lawConfig,
                lawName: agg.lawConfig?.lawName ?? "",
                totalArticles: agg.lawConfig?.totalArticles ?? 0,
                readArticles: agg.lawConfig?.readArticles ?? 0,
                lawMode: (agg.lawConfig?.lawMode as any) ?? "COUPLED_TO_THEORY",
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

      <Card>
        <CardContent className="p-6 space-y-2">
          <div className="text-sm font-semibold">Snapshot do agregado (DTO)</div>
          <pre className="max-h-[420px] overflow-auto rounded-md border bg-muted p-3 text-xs">
            {JSON.stringify(agg, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
