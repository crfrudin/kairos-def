"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type Props = {
  defaultChecked: boolean;
  autoOpenOnCheck?: boolean;

  defaults?: {
    reading_enabled?: boolean;
    reading_total_pages?: number;
    reading_read_pages?: number;
    reading_pacing_mode?: string;
    reading_pages_per_day?: number | null;
    reading_pages_per_hour?: number | null;

    video_enabled?: boolean;
    video_total_blocks?: number;
    video_watched_blocks?: number;
    video_pacing_mode?: string;
    video_blocks_per_day?: number | null;
    video_avg_minutes?: number | null;
    video_playback_speed?: string;
  };
};

function nToString(v: number | null | undefined): string {
  if (v === null || v === undefined) return "";
  if (!Number.isFinite(v)) return "";
  return String(v);
}

function s(v: unknown, fallback = ""): string {
  const x = String(v ?? "").trim();
  return x ? x : fallback;
}

export function TheoryCategoryDialog(props: Props) {
  const [checked, setChecked] = React.useState<boolean>(props.defaultChecked);
  const [open, setOpen] = React.useState<boolean>(false);

  // Reading state
  const [readingEnabled, setReadingEnabled] = React.useState<boolean>(!!props.defaults?.reading_enabled);
  const [readingTotalPages, setReadingTotalPages] = React.useState<string>(nToString(props.defaults?.reading_total_pages ?? 0));
  const [readingReadPages, setReadingReadPages] = React.useState<string>(nToString(props.defaults?.reading_read_pages ?? 0));
  const [readingPacingMode, setReadingPacingMode] = React.useState<string>(
    s(props.defaults?.reading_pacing_mode, "PACE_PAGES_PER_HOUR")
  );
  const [readingPagesPerDay, setReadingPagesPerDay] = React.useState<string>(nToString(props.defaults?.reading_pages_per_day ?? null));
  const [readingPagesPerHour, setReadingPagesPerHour] = React.useState<string>(nToString(props.defaults?.reading_pages_per_hour ?? null));

  // Video state
  const [videoEnabled, setVideoEnabled] = React.useState<boolean>(!!props.defaults?.video_enabled);
  const [videoTotalBlocks, setVideoTotalBlocks] = React.useState<string>(nToString(props.defaults?.video_total_blocks ?? 0));
  const [videoWatchedBlocks, setVideoWatchedBlocks] = React.useState<string>(nToString(props.defaults?.video_watched_blocks ?? 0));
  const [videoPacingMode, setVideoPacingMode] = React.useState<string>(s(props.defaults?.video_pacing_mode, "AUTO_BY_DURATION"));
  const [videoBlocksPerDay, setVideoBlocksPerDay] = React.useState<string>(nToString(props.defaults?.video_blocks_per_day ?? null));
  const [videoAvgMinutes, setVideoAvgMinutes] = React.useState<string>(nToString(props.defaults?.video_avg_minutes ?? null));
  const [videoPlaybackSpeed, setVideoPlaybackSpeed] = React.useState<string>(s(props.defaults?.video_playback_speed, "1x"));

  React.useEffect(() => {
    if (!checked) setOpen(false);
  }, [checked]);

  return (
    <div className="space-y-2">
      {/* ✅ Switch no lugar do checkbox (circulado) */}
      <div className="flex items-center justify-between rounded-md border p-3">
        <div>
          <div className="text-sm font-medium">Teoria (Leitura/Vídeo)</div>
          <div className="text-xs text-muted-foreground">Ativa a categoria THEORY e permite configurar o modal.</div>
        </div>

        {/* determinístico: envia categories=THEORY somente quando ligado */}
        {checked ? <input type="hidden" name="categories" value="THEORY" /> : null}

        <Switch
          checked={checked}
          onCheckedChange={(next) => {
            setChecked(next);
            if (props.autoOpenOnCheck !== false && next) setOpen(true);
          }}
        />
      </div>

      {/* ✅ Hidden inputs SEMPRE presentes: submit determinístico */}
      <input type="hidden" name="reading_enabled" value={readingEnabled ? "on" : ""} />
      <input type="hidden" name="reading_total_pages" value={readingTotalPages} />
      <input type="hidden" name="reading_read_pages" value={readingReadPages} />
      <input type="hidden" name="reading_pacing_mode" value={readingPacingMode} />
      <input type="hidden" name="reading_pages_per_day" value={readingPagesPerDay} />
      <input type="hidden" name="reading_pages_per_hour" value={readingPagesPerHour} />

      <input type="hidden" name="video_enabled" value={videoEnabled ? "on" : ""} />
      <input type="hidden" name="video_total_blocks" value={videoTotalBlocks} />
      <input type="hidden" name="video_watched_blocks" value={videoWatchedBlocks} />
      <input type="hidden" name="video_pacing_mode" value={videoPacingMode} />
      <input type="hidden" name="video_blocks_per_day" value={videoBlocksPerDay} />
      <input type="hidden" name="video_avg_minutes" value={videoAvgMinutes} />
      <input type="hidden" name="video_playback_speed" value={videoPlaybackSpeed} />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button type="button" variant="outline" size="sm" disabled={!checked}>
            Configurar Teoria
          </Button>
        </DialogTrigger>

        <DialogContent className="sm:max-w-[760px]">
          <DialogHeader>
            <DialogTitle>Teoria</DialogTitle>
            <DialogDescription>
              Configurações opcionais. A UI envia inputs explícitos; validações e regras ficam no backend.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Leitura */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">Teoria — Leitura (opcional)</div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Habilitar leitura</div>
                  <div className="text-xs text-muted-foreground">Opcional. O backend valida consistência.</div>
                </div>
                <Switch checked={readingEnabled} onCheckedChange={setReadingEnabled} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total de páginas</Label>
                  <Input type="number" min={0} value={readingTotalPages} onChange={(e) => setReadingTotalPages(e.currentTarget.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Páginas lidas</Label>
                  <Input type="number" min={0} value={readingReadPages} onChange={(e) => setReadingReadPages(e.currentTarget.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modo de ritmo</Label>
                <Select value={readingPacingMode} onValueChange={setReadingPacingMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PACE_PAGES_PER_HOUR">Páginas por hora (padrão)</SelectItem>
                    <SelectItem value="FIXED_PAGES_PER_DAY">Fixar meta diária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {readingPacingMode === "FIXED_PAGES_PER_DAY" ? (
                <div className="space-y-2">
                  <Label>Meta diária (páginas/dia)</Label>
                  <Input type="number" min={0} value={readingPagesPerDay} onChange={(e) => setReadingPagesPerDay(e.currentTarget.value)} />
                  <div className="text-xs text-muted-foreground">Campo enviado explicitamente. O backend valida a consistência com o modo escolhido.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Ritmo (páginas/hora)</Label>
                  <Input type="number" min={0} value={readingPagesPerHour} onChange={(e) => setReadingPagesPerHour(e.currentTarget.value)} />
                  <div className="text-xs text-muted-foreground">Campo enviado explicitamente. O backend valida a consistência com o modo escolhido.</div>
                </div>
              )}
            </div>

            <Separator />

            {/* Vídeo */}
            <div className="space-y-3">
              <div className="text-sm font-semibold">Teoria — Vídeo (opcional)</div>

              <div className="flex items-center justify-between rounded-md border p-3">
                <div>
                  <div className="text-sm font-medium">Habilitar vídeo</div>
                  <div className="text-xs text-muted-foreground">Opcional. O backend valida consistência.</div>
                </div>
                <Switch checked={videoEnabled} onCheckedChange={setVideoEnabled} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Total de blocos</Label>
                  <Input type="number" min={0} value={videoTotalBlocks} onChange={(e) => setVideoTotalBlocks(e.currentTarget.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Blocos vistos</Label>
                  <Input type="number" min={0} value={videoWatchedBlocks} onChange={(e) => setVideoWatchedBlocks(e.currentTarget.value)} />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Modo de ritmo</Label>
                <Select value={videoPacingMode} onValueChange={setVideoPacingMode}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AUTO_BY_DURATION">Por duração (padrão)</SelectItem>
                    <SelectItem value="FIXED_BLOCKS_PER_DAY">Fixar meta diária</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {videoPacingMode === "FIXED_BLOCKS_PER_DAY" ? (
                <div className="space-y-2">
                  <Label>Meta diária (blocos/dia)</Label>
                  <Input type="number" min={0} value={videoBlocksPerDay} onChange={(e) => setVideoBlocksPerDay(e.currentTarget.value)} />
                  <div className="text-xs text-muted-foreground">Campo enviado explicitamente. O backend valida a consistência com o modo escolhido.</div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label>Duração média (min) (nullable)</Label>
                  <Input type="number" min={0} value={videoAvgMinutes} onChange={(e) => setVideoAvgMinutes(e.currentTarget.value)} />
                  <div className="text-xs text-muted-foreground">Campo enviado explicitamente. O backend valida a consistência com o modo escolhido.</div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Velocidade</Label>
                <Select value={videoPlaybackSpeed} onValueChange={setVideoPlaybackSpeed}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1x">1x</SelectItem>
                    <SelectItem value="1.5x">1.5x</SelectItem>
                    <SelectItem value="2x">2x</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="button" onClick={() => setOpen(false)}>
                Fechar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
