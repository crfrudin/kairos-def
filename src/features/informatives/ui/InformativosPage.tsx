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
  uc_i01_list_extra,
  uc_i02_add,
  uc_i02_add_extra,
  uc_i03_mark_read_up_to,
  uc_i03_mark_read_up_to_extra,
  uc_i04_remove,
  uc_i04_remove_extra,
  uc_i05_refresh_latest,
  type InformativeFollowDTO,
  type InformativeExtraFollowDTO,
} from "@/app/(app)/informativos/actions";

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

function statusBadge(status?: "EM_DIA" | "NOVOS" | null, unreadCount?: number | null) {
  if (!status) return null;

  if (status === "EM_DIA") {
    return <Badge variant="secondary">Em dia</Badge>;
  }

  const unread = typeof unreadCount === "number" ? unreadCount : undefined;
  return <Badge>{typeof unread === "number" ? `Novos: ${unread}` : "Novos"}</Badge>;
}

export function InformativosPage({ userId, planAuthorization }: Props) {
  const plan = useMemo(() => parsePlanAuthorization(planAuthorization), [planAuthorization]);
  const isBlocked = plan === "FREE";

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [follows, setFollows] = useState<InformativeFollowDTO[]>([]);
  const [extraFollows, setExtraFollows] = useState<InformativeExtraFollowDTO[]>([]);

  const [refreshing, setRefreshing] = useState(false);

  // Add regular (+ extra STJ dentro do mesmo modal)
  const [addOpen, setAddOpen] = useState(false);
  const [addTribunal, setAddTribunal] = useState<Tribunal | "">("");
  const [addLastRead, setAddLastRead] = useState<string>("");
  const [addExtraLastRead, setAddExtraLastRead] = useState<string>(""); // STJ extraordinário

  // Mark read (regular)
  const [markOpenFor, setMarkOpenFor] = useState<Tribunal | null>(null);
  const [markValue, setMarkValue] = useState<string>("");

  // Mark read (extra)
  const [markExtraOpen, setMarkExtraOpen] = useState(false);
  const [markExtraValue, setMarkExtraValue] = useState<string>("");

  // Remove dialogs
  const [removeOpenFor, setRemoveOpenFor] = useState<Tribunal | null>(null);
  const [removeExtraOpen, setRemoveExtraOpen] = useState(false);

  const activeFollows = useMemo(() => follows.filter((f) => f.isActive), [follows]);
  const followedTribunals = useMemo(() => new Set(activeFollows.map((f) => f.tribunal)), [activeFollows]);

  const remainingTribunals = useMemo(() => {
    const all: Tribunal[] = ["STF", "STJ", "TST", "TSE"];
    return all.filter((t) => !followedTribunals.has(t));
  }, [followedTribunals]);

  const activeExtra = useMemo(() => extraFollows.find((x) => x.isActive) ?? null, [extraFollows]);
  const hasExtraActive = Boolean(activeExtra);

  async function loadAll() {
    setLoading(true);
    setErrorMessage(null);

    const [r1, r2] = await Promise.all([uc_i01_list(userId), uc_i01_list_extra(userId)]);

    if (!r1.ok) {
      setErrorMessage(r1.errorMessage);
      setFollows([]);
      setExtraFollows([]);
      setLoading(false);
      return;
    }

    if (!r2.ok) {
      // não bloqueia tudo, mas informa — e mantém regular funcionando
      setErrorMessage((prev) => prev ?? r2.errorMessage);
      setExtraFollows([]);
    } else {
      setExtraFollows(r2.data.follows);
    }

    setFollows(r1.data.follows);
    setLoading(false);
  }

  useEffect(() => {
    void loadAll();
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

    await loadAll();
    toast.success("Atualizado.", { description: "Números mais recentes sincronizados." });
  }

  async function submitAdd() {
    if (!addTribunal) return;

    const tribunal = addTribunal;
    const lastReadNumber = addLastRead.trim() === "" ? undefined : Number(addLastRead);

    // 1) Regular sempre
    const r1 = await uc_i02_add(userId, { tribunal, lastReadNumber });
    if (!r1.ok) {
      toast.error("Não foi possível adicionar.", { description: r1.errorMessage });
      return;
    }

    // 2) Extra STJ: só tenta se STJ + campo preenchido + ainda não ativo
    let extraAttempted = false;
    let extraFailedMessage: string | null = null;

    if (tribunal === "STJ" && !hasExtraActive && addExtraLastRead.trim() !== "") {
      const extraLastReadNumber = Number(addExtraLastRead);
      if (Number.isNaN(extraLastReadNumber)) {
        // não desfaz o regular; apenas informa e segue
        extraFailedMessage = "Campo 'Último lido extraordinário' inválido (não é número).";
      } else {
        extraAttempted = true;
        const r2 = await uc_i02_add_extra(userId, { lastReadNumber: extraLastReadNumber });
        if (!r2.ok) {
          extraFailedMessage = r2.errorMessage;
        }
      }
    }

    setAddOpen(false);
    setAddTribunal("");
    setAddLastRead("");
    setAddExtraLastRead("");

    await loadAll();

    if (extraAttempted && extraFailedMessage) {
      toast.success("Tribunal adicionado.", { description: `Regular OK, mas STJ Extra falhou: ${extraFailedMessage}` });
      return;
    }

    toast.success("Tribunal adicionado.", { description: `Agora você acompanha ${r1.data.follow.tribunal}.` });
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
    await loadAll();
    toast.success("Atualizado.", { description: `${tribunal}: marcado como lido até ${n}.` });
  }

  async function submitMarkReadUpToExtra() {
    const n = Number(markExtraValue);
    const res = await uc_i03_mark_read_up_to_extra(userId, { markUpToNumber: n });

    if (!res.ok) {
      toast.error("Não foi possível marcar como lido (STJ Extra).", { description: res.errorMessage });
      return;
    }

    setMarkExtraOpen(false);
    setMarkExtraValue("");
    await loadAll();
    toast.success("Atualizado.", { description: `STJ (Extraordinário): marcado como lido até ${n}.` });
  }

  async function submitRemove(tribunal: Tribunal) {
    const res = await uc_i04_remove(userId, { tribunal });

    if (!res.ok) {
      toast.error("Não foi possível remover.", { description: res.errorMessage });
      return;
    }

    setRemoveOpenFor(null);
    await loadAll();
    toast.success("Removido.", { description: `${tribunal} não será mais acompanhado.` });
  }

  async function submitRemoveExtra() {
    const res = await uc_i04_remove_extra(userId);

    if (!res.ok) {
      toast.error("Não foi possível remover STJ Extra.", { description: res.errorMessage });
      return;
    }

    setRemoveExtraOpen(false);
    await loadAll();
    toast.success("Removido.", { description: "STJ (Extraordinário) não será mais acompanhado." });
  }

  const showEmptyState = !loading && activeFollows.length === 0 && !hasExtraActive;

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <Card>
        <CardContent className="flex items-start justify-between gap-4 p-6">
          <div>
            <div className="text-lg font-semibold">Informativos</div>
            <div className="text-sm text-muted-foreground">
              Acompanhe tribunais (regular). Para STJ, você pode configurar também o acompanhamento extraordinário no mesmo cadastro.
            </div>
            <div className="mt-2">
              <Badge variant="outline">Plano: {planAuthorization ?? "N/D"}</Badge>
              {isBlocked ? (
                <Badge variant="outline" className="ml-2">
                  🔒 Premium
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={onRefresh}
              disabled={refreshing || loading || isBlocked || (activeFollows.length === 0 && !hasExtraActive)}
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Atualizar
            </Button>

            {/* Add regular (e STJ extra dentro do modal) */}
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
                    Selecione um tribunal para acompanhar. Opcionalmente, informe o último número já lido. Para STJ, você pode também informar o último lido extraordinário.
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
                    <Select
                      value={addTribunal}
                      onValueChange={(v) => {
                        setAddTribunal(v as Tribunal);
                        // quando trocar tribunal, limpa o campo extraordinário para evitar “vazar”
                        setAddExtraLastRead("");
                      }}
                      disabled={isBlocked}
                    >
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

                  {addTribunal === "STJ" ? (
                    <div className="space-y-2">
                      <div className="text-sm font-medium">Último lido extraordinário</div>
                      <Input
                        inputMode="numeric"
                        placeholder={hasExtraActive ? "Já configurado" : "Ex.: 10"}
                        value={addExtraLastRead}
                        onChange={(e) => setAddExtraLastRead(e.target.value)}
                        disabled={isBlocked || hasExtraActive}
                      />
                      {hasExtraActive ? (
                        <div className="text-xs text-muted-foreground">
                          STJ (Extraordinário) já está ativo. Para alterar, use “Marcar como lido até…” no card do STJ Extra.
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground">
                          Opcional. Se preencher, o sistema também criará o acompanhamento do STJ (Extraordinário).
                        </div>
                      )}
                    </div>
                  ) : null}
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

      {/* Erro */}
      {!loading && errorMessage ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm font-semibold">Erro</div>
            <div className="text-sm text-muted-foreground">{errorMessage}</div>
            <div className="mt-4">
              <Button variant="outline" onClick={loadAll}>
                Tentar novamente
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Loading skeleton */}
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
      ) : showEmptyState ? (
        <Card>
          <CardContent className="p-6">
            <div className="text-sm text-muted-foreground">Nenhum acompanhamento configurado.</div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {/* EXTRA CARD (STJ) */}
          {hasExtraActive ? (
            <Card className={isBlocked ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-2">
                  <CardTitle className="text-base">STJ (Extraordinário)</CardTitle>

                  {statusBadge(activeExtra?.status ?? null, activeExtra?.unreadCount ?? null)}

                  <div className="text-xs text-muted-foreground">
                    Último lido: <span className="font-medium">{activeExtra?.lastReadNumber ?? 0}</span>
                    {typeof activeExtra?.latestAvailableNumber === "number" ? (
                      <>
                        {" "}
                        · Último disponível: <span className="font-medium">{activeExtra.latestAvailableNumber}</span>
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
                        setMarkExtraOpen(true);
                        setMarkExtraValue(String(activeExtra?.lastReadNumber ?? 0));
                      }}
                    >
                      Marcar como lido até…
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setRemoveExtraOpen(true)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      Remover acompanhamento
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mark extra dialog */}
                <Dialog open={markExtraOpen} onOpenChange={setMarkExtraOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Marcar como lido até…</DialogTitle>
                      <DialogDescription>STJ (Extraordinário): informe o número máximo lido.</DialogDescription>
                    </DialogHeader>

                    <div className="space-y-2">
                      <div className="text-sm font-medium">Número</div>
                      <Input
                        inputMode="numeric"
                        value={markExtraValue}
                        onChange={(e) => setMarkExtraValue(e.target.value)}
                        placeholder="Ex.: 20"
                      />
                    </div>

                    <DialogFooter>
                      <Button variant="outline" onClick={() => setMarkExtraOpen(false)}>
                        Cancelar
                      </Button>
                      <Button
                        onClick={submitMarkReadUpToExtra}
                        disabled={markExtraValue.trim() === "" || Number.isNaN(Number(markExtraValue))}
                      >
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Remove extra dialog */}
                <AlertDialog open={removeExtraOpen} onOpenChange={setRemoveExtraOpen}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover acompanhamento</AlertDialogTitle>
                      <AlertDialogDescription>Isso fará remoção lógica (soft delete) via isActive=false.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancelar</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={submitRemoveExtra}
                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      >
                        Remover
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardHeader>

              <CardContent className="pt-0">
                <div className="text-sm text-muted-foreground">Dica: use “Marcar como lido até…” para atualizar seu número.</div>
              </CardContent>
            </Card>
          ) : null}

          {/* REGULAR CARDS */}
          {activeFollows.map((f) => (
            <Card key={f.tribunal} className={isBlocked ? "opacity-60" : ""}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div className="space-y-2">
                  <CardTitle className="text-base">{f.tribunal}</CardTitle>

                  {statusBadge(f.status ?? null, f.unreadCount ?? null)}

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

                {/* Mark regular dialog */}
                <Dialog open={markOpenFor === f.tribunal} onOpenChange={(o) => setMarkOpenFor(o ? f.tribunal : null)}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Marcar como lido até…</DialogTitle>
                      <DialogDescription>Informe o número máximo lido. Erros serão exibidos exatamente como retornados pelo use-case.</DialogDescription>
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
                      <Button onClick={() => submitMarkReadUpTo(f.tribunal)} disabled={markValue.trim() === "" || Number.isNaN(Number(markValue))}>
                        Salvar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                {/* Remove regular dialog */}
                <AlertDialog open={removeOpenFor === f.tribunal} onOpenChange={(o) => setRemoveOpenFor(o ? f.tribunal : null)}>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Remover acompanhamento</AlertDialogTitle>
                      <AlertDialogDescription>Isso fará remoção lógica (soft delete) via isActive=false.</AlertDialogDescription>
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
                <div className="text-sm text-muted-foreground">Dica: use “Marcar como lido até…” para atualizar seu número.</div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
