import { createHash } from 'crypto';

/**
 * Stringify determinístico: ordena chaves recursivamente.
 * - Evita variações por ordem de propriedades.
 * - Não usa heurística; é uma normalização estável.
 */
export const stableStringify = (value: unknown): string => {
  const seen = new WeakSet<object>();

  const normalize = (v: unknown): unknown => {
    if (v === null || v === undefined) return v;

    if (typeof v !== 'object') return v;

    if (seen.has(v as object)) {
      // Ciclos não são esperados em DTOs/ctx; se houver, falha determinística.
      throw new Error('stableStringify: objeto cíclico não suportado.');
    }
    seen.add(v as object);

    if (Array.isArray(v)) return v.map(normalize);

    const obj = v as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const out: Record<string, unknown> = {};
    for (const k of keys) out[k] = normalize(obj[k]);
    return out;
  };

  return JSON.stringify(normalize(value));
};

export const sha256Hex = (input: string): string => {
  return createHash('sha256').update(input, 'utf8').digest('hex');
};
