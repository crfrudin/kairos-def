export function PublicFooter() {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto max-w-5xl px-6 py-6 text-xs text-muted-foreground">
        © {new Date().getFullYear()} KAIROS. Todos os direitos reservados.
      </div>
    </footer>
  );
}
