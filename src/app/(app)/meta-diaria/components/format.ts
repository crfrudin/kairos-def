export function formatMinutesToLabel(totalMinutes: number): string {
  const m = Number.isFinite(totalMinutes) ? Math.max(0, Math.floor(totalMinutes)) : 0;
  const h = Math.floor(m / 60);
  const r = m % 60;

  if (h <= 0) return `${r}min`;
  if (r === 0) return `${h}h`;
  return `${h}h${String(r).padStart(2, "0")}min`;
}

export function getTodayIsoDateInSaoPaulo(): string {
  // “Hoje” apenas para seleção da data atual de visualização (UI).
  // NÃO é regra de negócio; backend continua soberano.
  return new Date().toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // YYYY-MM-DD
}

export function formatIsoDatePtBr(isoDate: string): string {
  // Formatação de exibição (não normativa)
  const [y, m, d] = isoDate.split("-").map((x) => Number(x));
  if (!y || !m || !d) return isoDate;
  return `${String(d).padStart(2, "0")}/${String(m).padStart(2, "0")}/${y}`;
}
