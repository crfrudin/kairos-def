// src/features/daily-plan/application/ports/ISubjectsReader.ts

import type { Subject } from "@/features/subjects"; // via Public API da feature subjects

/**
 * Leitura das matérias ativas (Fase 2) para planejamento.
 * Regras relevantes: teoria vs extras; limite de matérias/dia conta só teoria. :contentReference[oaicite:9]{index=9} :contentReference[oaicite:10]{index=10}
 */
export interface ISubjectsReader {
  /** Lista de matérias ativas e elegíveis para teoria/planejamento. */
  listActiveSubjects(): Promise<Subject[]>;
}
