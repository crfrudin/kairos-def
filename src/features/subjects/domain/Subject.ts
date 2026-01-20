// src/features/subjects/domain/Subject.ts
// FASE 2 (Matérias): tipo mínimo para integração do Motor de Planejamento (FASE 3).
// Sem persistência aqui. Sem regras de negócio aqui.

export interface Subject {
  id: string;
  name: string;
  isActive: boolean;
}
