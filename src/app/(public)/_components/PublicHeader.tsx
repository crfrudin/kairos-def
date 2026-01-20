import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function PublicHeader() {
  return (
    <header className="border-b bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          KAIROS
        </Link>

        <nav className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/signup">Criar conta</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}
