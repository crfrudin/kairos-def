import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "KAIROS",
  description: "KAIROS — Planejamento determinístico de estudos",
};

function PublicHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4">
        <Link href="/" className="font-semibold tracking-tight">
          KAIROS
        </Link>

        <nav className="flex items-center gap-4 text-sm">
          <Link href="/login" className="text-muted-foreground hover:text-foreground">
            Entrar
          </Link>
          <Link href="/signup" className="text-muted-foreground hover:text-foreground">
            Criar conta
          </Link>
        </nav>
      </div>
    </header>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 text-xs text-muted-foreground">
        <span>© {new Date().getFullYear()} KAIROS</span>
        <span className="hidden sm:inline">Autenticação e fluxos públicos</span>
      </div>
    </footer>
  );
}

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-muted/20">
      <PublicHeader />
      <div className="mx-auto w-full max-w-5xl px-4 py-10">{children}</div>
      <PublicFooter />
    </div>
  );
}
