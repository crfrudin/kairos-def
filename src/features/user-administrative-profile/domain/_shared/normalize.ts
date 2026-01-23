export function trimToNull(input: string | null | undefined): string | null {
  if (input == null) return null;
  const v = input.trim();
  return v.length === 0 ? null : v;
}

export function collapseSpaces(input: string): string {
  // colapsa espaços internos (inclui tabs/linhas) para 1 espaço
  return input.replace(/\s+/g, " ").trim();
}

export function digitsOnly(input: string): string {
  return input.replace(/\D+/g, "");
}

export function upper(input: string): string {
  return input.toUpperCase();
}

export function lower(input: string): string {
  return input.toLowerCase();
}
