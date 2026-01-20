import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KAIROS — App',
  description: 'Área autenticada do KAIROS',
};

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <main className="mx-auto w-full max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
