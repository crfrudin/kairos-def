import "server-only";

import { redirect } from "next/navigation";

/**
 * Compatibilidade: item antigo do menu.
 * Fonte de verdade: /ajustes (FASE 6 · ETAPA 5).
 */
export default function ConfiguracoesPage() {
  redirect("/ajustes");
}
