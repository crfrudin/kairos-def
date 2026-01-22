"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { replaceOrderAction } from "./actions";

export type SubjectOrderItem = {
  id: string;
  name: string;
  isActive: boolean;
};

export function SubjectOrderEditor(props: { items: SubjectOrderItem[] }) {
  const [items, setItems] = React.useState<SubjectOrderItem[]>(() => [...props.items]);
  const [query, setQuery] = React.useState<string>("");

  // Mantém o estado sincronizado se o SSR renderizar uma lista diferente (ex.: após salvar/refresh)
  React.useEffect(() => {
    setItems([...props.items]);
  }, [props.items]);

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;

    return items.filter((it) => it.name.toLowerCase().includes(q));
  }, [items, query]);

  function moveById(subjectId: string, direction: -1 | 1) {
    setItems((prev) => {
      const from = prev.findIndex((x) => x.id === subjectId);
      if (from < 0) return prev;

      const to = from + direction;
      if (to < 0 || to >= prev.length) return prev;

      const next = [...prev];
      const [it] = next.splice(from, 1);
      next.splice(to, 0, it);
      return next;
    });
  }

  function indexOfId(id: string): number {
    return items.findIndex((x) => x.id === id);
  }

  return (
    <form action={replaceOrderAction} className="space-y-4">
      {/* Hidden inputs SEMPRE na ordem total atual do estado (não da lista filtrada) */}
      {items.map((it) => (
        <input key={it.id} type="hidden" name="subject_id" value={it.id} />
      ))}

      <div className="space-y-2">
        <div className="text-sm font-medium">Pesquisar</div>
        <Input
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
          placeholder="Digite para filtrar matérias…"
        />
        <div className="text-xs text-muted-foreground">
          A busca é apenas visual. A ordem salva é a sequência total exibida no editor.
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[72px]">#</TableHead>
              <TableHead>Matéria</TableHead>
              <TableHead className="w-[180px]">Status</TableHead>
              <TableHead className="w-[160px] text-right">Mover</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-sm text-muted-foreground">
                  Nenhuma matéria encontrada.
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((it) => {
                const idx = indexOfId(it.id);
                const isFirst = idx === 0;
                const isLast = idx === items.length - 1;

                return (
                  <TableRow key={it.id}>
                    <TableCell>{idx + 1}</TableCell>
                    <TableCell className="font-medium">{it.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {it.isActive ? "Ativa" : "Inativa"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isFirst}
                          onClick={() => moveById(it.id, -1)}
                          aria-label="Mover para cima"
                        >
                          ↑
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isLast}
                          onClick={() => moveById(it.id, 1)}
                          aria-label="Mover para baixo"
                        >
                          ↓
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-end">
        <Button type="submit" disabled={items.length === 0}>
          Salvar ordem
        </Button>
      </div>
    </form>
  );
}
