"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { Menu } from "lucide-react";
import { AppSidebar } from "./AppSidebar";

export function AppHeader(props: { userLabel: string; emailLabel: string }) {
  const [open, setOpen] = useState(false);

  return (
    <header className="h-16 w-full border-b bg-background">
      <div className="flex h-full items-center justify-between px-4">
        <div className="flex items-center gap-2">
          {/* Mobile hamburger */}
          <div className="lg:hidden">
            <Sheet open={open} onOpenChange={setOpen}>
              <SheetTrigger asChild>
                <Button type="button" variant="ghost" size="icon" aria-label="Abrir menu">
                  <Menu className="size-5" />
                </Button>
              </SheetTrigger>

              <SheetContent side="left" className="p-0">
                <SheetHeader className="sr-only">
                  <SheetTitle>Menu</SheetTitle>
                </SheetHeader>

                <AppSidebar onNavigate={() => setOpen(false)} />
              </SheetContent>
            </Sheet>
          </div>

          {/* Contexto informativo (sem lógica) */}
          <div className="hidden lg:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Área autenticada</span>
          </div>
        </div>

        {/* User info (passivo; vem do server wrapper via props) */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:block text-right leading-tight">
            <div className="text-sm font-medium">{props.userLabel}</div>
            <div className="text-xs text-muted-foreground">{props.emailLabel}</div>
          </div>
          <Avatar>
            <AvatarFallback>U</AvatarFallback>
          </Avatar>
        </div>
      </div>
    </header>
  );
}
