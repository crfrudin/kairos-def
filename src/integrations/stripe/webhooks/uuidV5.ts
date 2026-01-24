import { createHash } from "crypto";

/**
 * UUIDv5 (RFC 4122) — SHA-1(namespace + name)
 * - determinístico
 * - perfeito para representar stripe_event_id como UUID sem criar coluna nova
 *
 * Observação: usamos namespace UUID fixo do KAIROS (constante interna).
 */

// Namespace UUID fixo (gerado uma vez e fixado no código)
const KAIROS_STRIPE_EVENT_NAMESPACE = "6ba7b810-9dad-11d1-80b4-00c04fd430c8"; // namespace DNS (válido RFC), usado como base estável

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/-/g, "");
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function formatUuidFromBytes(bytes16: Uint8Array): string {
  const hex = bytesToHex(bytes16);
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
}

export function uuidV5(name: string, namespaceUuid: string = KAIROS_STRIPE_EVENT_NAMESPACE): string {
  const ns = hexToBytes(namespaceUuid);

  const nameBytes = Buffer.from(String(name), "utf8");

  const toHash = Buffer.concat([Buffer.from(ns), nameBytes]);
  const hash = createHash("sha1").update(toHash).digest();

  const bytes = new Uint8Array(hash.subarray(0, 16));

  // version (5)
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  // variant (RFC 4122)
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  return formatUuidFromBytes(bytes);
}
