// src/features/daily-plan/application/ports/ISubjectsReader.ts

import type { SubjectTheoryDTO } from '../dtos/PlanTypes';

/**
 * Leitura das matérias ativas (Fase 2) para planejamento.
 *
 * IMPORTANTÍSSIMO (Governança):
 * - Esta interface NÃO pode importar a feature de Fase 2 diretamente.
 * - A integração com a Fase 2 será feita via adapter na infra/composition root.
 * - Assim, a Fase 3 permanece buildável e a Fase 2 pode ser implementada depois sem quebrar o motor.
 */
export interface ISubjectsReader {
  /**
   * Lista de matérias ativas e elegíveis para teoria/planejamento.
   * Retorna o "read model" mínimo necessário para o motor (sem acoplamento em entidade da Fase 2).
   */
  listActiveSubjects(params: { userId: string }): Promise<SubjectTheoryDTO[]>;
}
