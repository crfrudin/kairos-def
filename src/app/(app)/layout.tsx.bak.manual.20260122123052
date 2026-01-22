import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "KAIROS — App",
  description: "Área autenticada do KAIROS",
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <div className="flex min-h-dvh">
        {/* Sidebar (placeholder estrutural; sem navegação) */}
        <aside className="hidden w-64 shrink-0 border-r bg-background md:block">
          <div className="h-14 border-b" />
          <div className="p-4 text-sm text-muted-foreground">
            Sidebar (placeholder)
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          {/* Header (placeholder estrutural; sem navegação) */}
          <header className="h-14 border-b bg-background">
            <div className="flex h-full items-center px-6">
              <span className="text-sm text-muted-foreground">
                Header (placeholder)
              </span>
            </div>
          </header>

          {/* Main content */}
          <main className="flex-1">
            <div className="mx-auto w-full max-w-5xl px-6 py-10">{children}</div>
          </main>
        </div>
      </div>
    </div>
  );
}
