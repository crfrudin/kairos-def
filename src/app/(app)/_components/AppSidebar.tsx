"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import {
  Activity,
  BarChart3,
  BookOpen,
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  Settings,
  Trophy,
  User,
} from "lucide-react";

type NavItem = {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  isPlaceholder?: boolean;
};

const NAV_ITEMS: readonly NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Meta Diária", href: "/meta-diaria", icon: Calendar },
  { label: "Calendário", href: "/calendario", icon: Calendar },
  { label: "Meu Perfil", href: "/perfil", icon: User },
  { label: "Matérias", href: "/materias", icon: BookOpen },
  { label: "Informativos", href: "/informativos", icon: FileText },

  // Placeholders explícitos — fases futuras (não-funcionais / informativos)
  { label: "Estatísticas", href: "/estatisticas", icon: BarChart3, isPlaceholder: true },

  // Gamificação (UI passiva)
  { label: "Conquistas", href: "/conquistas", icon: Trophy },
  { label: "Streaks", href: "/streaks", icon: Activity },

  { label: "Assinatura", href: "/assinatura", icon: CreditCard, isPlaceholder: true },

  // FASE 6 — Ajustes Administrativos
  { label: "Ajustes", href: "/ajustes", icon: Settings },
] as const;

export function AppSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-[240px] flex-col border-r bg-background">
      <div className="flex h-16 items-center gap-2 px-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2"
          onClick={() => onNavigate?.()}
          aria-label="Ir para Dashboard"
        >
          <div className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
            <span className="text-sm font-semibold">K</span>
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">KAIROS</div>
            <div className="text-xs text-muted-foreground">Study Focus</div>
          </div>
        </Link>
      </div>

      <Separator />

      <div className="px-2 py-3">
        <div className="space-y-1">
          {NAV_ITEMS.map((it) => {
            const Icon = it.icon;
            const isActive = pathname === it.href;

            return (
              <Button
                key={it.href}
                asChild
                variant="ghost"
                className={[
                  "w-full justify-start gap-2 rounded-md transition-colors",
                  "hover:bg-muted",
                  isActive ? "bg-primary/10 text-primary border-l-[3px] border-primary pl-[9px]" : "pl-3",
                ].join(" ")}
              >
                <Link href={it.href} onClick={() => onNavigate?.()} aria-current={isActive ? "page" : undefined}>
                  <Icon className="size-4" />
                  <span className="text-sm">{it.label}</span>
                  {it.isPlaceholder ? (
                    <Badge variant="secondary" className="ml-auto">
                      Em breve
                    </Badge>
                  ) : null}
                </Link>
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-auto px-2 pb-4">
        <Separator className="my-3" />
        <div className="space-y-1">
          <Button type="button" variant="ghost" className="w-full justify-start gap-2" disabled>
            <span className="text-sm text-muted-foreground">Tema (placeholder)</span>
          </Button>
          <Button type="button" variant="ghost" className="w-full justify-start gap-2" disabled>
            <span className="text-sm text-muted-foreground">Sair (placeholder)</span>
          </Button>
        </div>
      </div>
    </aside>
  );
}
