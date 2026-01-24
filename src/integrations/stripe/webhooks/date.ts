/**
 * Stripe envia timestamps em segundos (Unix).
 * Convertendo para YYYY-MM-DD (UTC).
 */
export function unixSecondsToYYYYMMDD(unixSeconds: number): string {
  const ms = unixSeconds * 1000;
  const iso = new Date(ms).toISOString();
  return iso.slice(0, 10);
}
