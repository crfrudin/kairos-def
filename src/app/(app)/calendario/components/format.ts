export type IsoDate = string; // YYYY-MM-DD

export function getTodayIsoDateInSaoPaulo(): IsoDate {
  // en-CA => YYYY-MM-DD
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(new Date());
}

export function formatIsoDatePtBr(iso: IsoDate): string {
  // Usamos meio-dia UTC para evitar edge cases de DST ao formatar datas “puras”.
  const d = isoToStableDate(iso);
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "medium" }).format(d);
}

export function isoToStableDate(iso: IsoDate): Date {
  // Meio-dia UTC evita “voltar um dia” em timezones/DST.
  return new Date(`${iso}T12:00:00.000Z`);
}

export function dateToIsoUTC(d: Date): IsoDate {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysIso(iso: IsoDate, days: number): IsoDate {
  const d = isoToStableDate(iso);
  d.setUTCDate(d.getUTCDate() + days);
  return dateToIsoUTC(d);
}

export function startOfMonthIso(iso: IsoDate): IsoDate {
  const d = isoToStableDate(iso);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  return `${y}-${m}-01`;
}

export function endOfMonthIso(iso: IsoDate): IsoDate {
  const d = isoToStableDate(iso);
  const y = d.getUTCFullYear();
  const m = d.getUTCMonth();
  const firstNextMonth = new Date(Date.UTC(y, m + 1, 1, 12, 0, 0));
  firstNextMonth.setUTCDate(firstNextMonth.getUTCDate() - 1);
  return dateToIsoUTC(firstNextMonth);
}

export function startOfWeekIsoMonday(iso: IsoDate): IsoDate {
  const d = isoToStableDate(iso);
  // getUTCDay(): 0=Dom, 1=Seg, ... 6=Sáb
  const dow = d.getUTCDay();
  const deltaToMonday = (dow + 6) % 7; // Seg->0, Ter->1, ... Dom->6
  d.setUTCDate(d.getUTCDate() - deltaToMonday);
  return dateToIsoUTC(d);
}

export function endOfWeekIsoSunday(iso: IsoDate): IsoDate {
  const start = startOfWeekIsoMonday(iso);
  return addDaysIso(start, 6);
}

export function isIsoInRange(iso: IsoDate, start: IsoDate, end: IsoDate): boolean {
  return iso >= start && iso <= end;
}
