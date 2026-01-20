// src/features/daily-plan/application/ports/IProfileRulesReader.ts

import type { ProfileRules } from "@/features/profile"; // via Public API da feature profile

/**
 * Leitura do contrato vigente do Perfil (Fase 1).
 * Regra: application do daily-plan nunca lê DB direto; sempre via port/feature.
 */
export interface IProfileRulesReader {
  getProfileRules(): Promise<ProfileRules | null>;
}
