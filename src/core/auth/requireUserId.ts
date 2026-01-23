import "server-only";

import { headers } from "next/headers";

/**
 * Boundary de autenticação (server-only).
 *
 * FASE 8 já implementa autenticação e o middleware injeta claims confiáveis via headers:
 * - x-kairos-user-id
 *
 * Regra desta correção: NÃO criar mecanismo paralelo de autenticação.
 * Aqui apenas consumimos as claims injetadas pelo middleware.
 */

const UUID_LIKE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function requireAuthenticatedUserId(): Promise<string> {
  // Next.js 16+: headers() é async (Promise) e deve ser aguardado.
  const h = await headers();

  // Fonte da verdade do runtime autenticado (middleware)
  const raw = h.get("x-kairos-user-id") ?? "";

  const userId = raw.trim();
  if (!userId) {
    throw new Error("AUTH_REQUIRED: userId ausente nas claims do middleware (x-kairos-user-id).");
  }

  if (!UUID_LIKE.test(userId)) {
    throw new Error("AUTH_INVALID: userId inválido nas claims do middleware (x-kairos-user-id).");
  }

  return userId;
}
