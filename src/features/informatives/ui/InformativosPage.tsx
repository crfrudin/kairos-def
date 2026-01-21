// src/features/informatives/ui/InformativosPage.tsx
"use client";

import * as React from "react";
import { useEffect, useMemo, useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { toast } from "sonner";

import { MoreVertical, Plus, RefreshCw, Trash2 } from "lucide-react";

import {
  uc_i01_list,
  uc_i02_add,
  uc_i03_mark_read_up_to,
  uc_i04_remove,
  uc_i05_refresh_latest,
  type InformativeFollowDTO,
} from "@/app/informativos/actions";

type Tribunal = "STF" | "STJ" | "TST" | "TSE";

type Props = {
  userId: string;
  planAuthorization?: string; // vem do middleware (placeholder hoje)
};

function parsePlanAuthorization(planAuthorization?: string): "FREE" | "PAID" | "UNKNOWN" {
  if (!planAuthorization) return "UNKNOWN";
  const p = planAuthorization.trim().toUpperCase();
  if (p === "FREE") return "FREE";
  if (p === "PAID") return "PAID";
  return "UNKNOWN";
}

function statusBadgeFromDto(f: InformativeFollowDTO) {
  // UI passiva: só exibe se o backend fornecer
  if (!f.status) return null;

  if (f.status === "EM_DIA") {
    return <Badge variant="secondary">Em dia</Badge>;
  }

  const unread = typeof f.unreadCount === "number" ? f.unreadCount : undefined;
  return <Badge>{typeof unread === "number" ? `Novos: ${unread}` : "Novos"}</Badge>;
}

export function InformativosPage({ userId, planAuthorization }: Props) {
  const plan = useMemo(() => parsePlanAuthorization(planAuthorization), [planAuthorization]);

  // Gate passivo: só bloqueia se backend disser FREE explicitamente
  const isBlocked = plan === "FREE";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [follows, setFollows] = useState<InformativeFollowDTO[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addTribunal, setAddTribunal] = useState<Tribunal | "">("");
  const [addLastRead, setAddLastRead] = useState<string>("");

  const [markOpenFor, setMarkOpenFor] = useState<Tribunal | null>(null);
  const [markValue, setMarkValue] = useState<string>("");

  const [removeOpenFor, setRemoveOpenFor] = useState<Tribunal | null>(null);

  const activeFollows = useMemo(() => follows.filter((f) => f.isActive), [follows]);

  const followedTribunals = useMemo(() => new Set(activeFollows.map((f) => f.tribunal)), [activeFollows]);

  const remainingTribunals = useMemo(() => {
    const all: Tribunal[] = ["STF", "STJ", "TST", "TSE"];
    return all.filter((t) => !followedTribunals.has(t));
  }, [followedTribunals]);

  async function load() {
    setLoading(true);
    setErrorMessage(null);

    const res = await uc_i01_list(userId);
    if (!res.ok) {
      setErrorMessage(res.errorMessage);
      setFollows([]);
      setLoading(false);
      return;
    }

    setFollows(res.data.follows);
    setLoading(false);
  }

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onRefresh() {
    setRefreshing(true);
    const tribunals = activeFollows.map((f) => f.tribunal) as Tribunal[];
    const res = await uc_i05_refresh_latest(userId, { tribunals });
    setRefreshing(false);

    if (!res.ok) {
      toast.error("Não foi possível atualizar.", { description: res.errorMessage });
      return;
    }

    await load();
    toast.success("Atualizado.", { description: "Números mais recentes sincronizados." });
  }

  async function submitAdd() {
    if (!addTribunal) return;

    const lastReadNumber = addLastRead.trim() === "" ? undefined : Number(addLastRead);

    const res = await uc_i02_add(userId, { tribunal: addTribunal, lastReadNumber });

    if (!res.ok) {
      toast.error("Não foi possível adicionar.", { description: res.errorMessage });
      return;
    }

    setAddOpen(false);
    setAddTribunal("");
    setAddLastRead("");
    await load();
    toast.success("Tribunal adicionado.", { description: `Agora você acompanha ${res.data.follow.tribunal}.` });
  }

  async function submitMarkReadUpTo(tribunal: Tribunal) {
    const n = Number(markValue);

    const res = await uc_i03_mark_read_up_to(userId, { tribunal, markUpToNumber: n });

    if (!res.ok) {
      toast.error("Não foi possível marcar como lido.", { description: res.errorMessage });
      return;
    }

    setMarkOpenFor(null);
    setMarkValue("");
    await load();
    toast.success("Atualizado.", { description: `${tribunal}: marcado como lido até ${n}.` });
  }

  async function submitRemove(tribunal: Tribunal) {
    const res = await uc_i04_remove(userId, { tribunal });

    if (!res.ok) {
      toast.error("Não foi possível remover.", { description: res.errorMessage });
      return;
    }

    setRemoveOpenFor(null);
    await load();
    toast.success("Removido.", { description: `${tribunal} não será mais acompanhado.` });
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      {/* Header (padrão /materias) */}
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold">Informativos</div>
            <div className="text-sm text-muted-foreground">
              Acompanhe tribunais, marque “lido até…” e faça remoção lógica (soft delete). Status/contagens só aparecem quando fornecidos pelo backend.
            </div>
            <div className="mt-2">
              <Badge variant="outline">Plano: {planAuthorization ?? "N/D"}</Badge>
              {isBlocked ? <Badge variant="outline" className="ml-2">🔒 Premium</Badge> : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={onRefresh} disabled={refreshing || loading || isBlocked || activeFollows.length === 0}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>

            <Dialog open={addOpen} onOpenChange={setAddOpen}>
              <DialogTrigger asChild>
                <Button disabled={isBlocked || remainingTribunals.length === 0}>
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar tribunal
                </Button>
              </DialogTrigger>

              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Adicionar tribunal</DialogTitle>
                  <DialogDescription>
                    Selecione um tribunal para acompanhar. Opcionalmente, informe o último número já lido.
                  </DialogDescription>
                </DialogHeader>

                {isBlocked ? (
                  <div className="rounded-md border p-3 text-sm">
                    <div className="font-medium">🔒 Recurso Premium</div>
                    <div className="text-muted-foreground">Faça upgrade para acompanhar informativos.</div>
                  </div>
                ) : null}

                <div className="space-y-3">
                  <div className="space-y-2">
                    <div className="text-sm font-medium">Tribunal</div>
                    <Select value={addTribunal} onValueChange={(v) => setAddTribunal(v as Tribunal)} disabled={isBlocked}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {remainingTribunals.map((t) => (
                          <SelectItem key={t} value={t}>
                            {t}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm font-medium">Último lido (opcional)</div>
                    <Input
                      inputMode="numeric"
                      placeholder="Ex.: 123"
                      value={addLastRead}
                      onChange={(e) => setAddLastRead(e.target.value)}
                      disabled={isBlocked}
                    />
                  </div>
                </div>

                <DialogFooter>
                  <Button variant="outline" onClick={() => setAddOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={submitAdd} disabled={isBlocked || !addTribunal}>
                    Salvar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Estado de erro do carregamento */}
      {!loading && errorMessage ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold">Erro</div>
            <div className="text-sm text-muted-foreground">{errorMessage}</div>
            <div className="mt-4">
              <Button variant="outline" onClick={load}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Conteúdo */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="space-y-2">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-4 w-40" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : activeFollows.length === 0 ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">Nenhum tribunal configurado.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {activeFollows.map((f) => (
            <Card key={f.tribunal} className={isBlocked ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-2">
                  <CardTitle className="text-base">{f.tribunal}</CardTitle>

                  {statusBadgeFromDto(f)}

                  <div className="text-xs text-muted-foreground">
                    Último lido: <span className="font-medium">{f.lastReadNumber}</span>
                    {typeof f.latestAvailableNumber === "number" ? (
                      <>
                        {" "}
                        · Último disponível: <span className="font-medium">{f.latestAvailableNumber}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" disabled={isBlocked}>
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => {
                        setMarkOpenFor(f.tribunal);
                        setMarkValue(String(f.lastReadNumber));
                      }}
                    >
                      Marcar como lido até…
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setRemoveOpenFor(f.tribunal)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover acompanhamento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Dialog Mark */}
                <Dialog open={markOpenFor === f.tribunal} onOpenChange={(o) => setMarkOpenFor(o ? f.tribunal : null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Marcar como lido até…</DialogTitle>
                      <DialogDescription>
                        Informe o número máximo lido. Erros serão exibidos exatamente como retornados pelo use-case.
                      </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Número</div>
                      <Input
                        inputMode="numeric"
                        value={markValue}
                        onChange={(e) => setMarkValue(e.target.value)}
                        placeholder="Ex.: 200"
                      />
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMarkOpenFor(null)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={() => submitMarkReadUpTo(f.tribunal)}
                        disabled={markValue.trim() === "" || Number.isNaN(Number(markValue))}
                      >
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Alert Remove */}
                <AlertDialog open={removeOpenFor === f.tribunal} onOpenChange={(o) => setRemoveOpenFor(o ? f.tribunal : null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover acompanhamento</AlertDialogTitle>
                      <AlertDialogDescription>
                        Isso fará remoção lógica (soft delete) via isActive=false.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => submitRemove(f.tribunal)}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">Dica: se necessário, use “Marcar como lido até…” para atualizar seu número.</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
