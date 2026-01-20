// src/features/daily-plan/application/dto/review.dto.ts

import type { CalendarDate, PlannedDuration } from "../../domain/value-objects";

/**
 * Tarefa de revisão derivada de teoria concluída (ou informativos, quando previsto),
 * respeitando estritamente a regra de NÃO-ACÚMULO.
 */
export interface ReviewTaskDTO {
  /** Identidade determinística da revisão (definida/derivada sem heurística). */
  reviewId: string;

  /** Data em que a teoria foi concluída (origem). */
  originDate: CalendarDate;

  /** Data em que a revisão deve ocorrer (originDate + frequency). */
  scheduledDate: CalendarDate;

  /** Duração normativa da revisão. */
  duration: PlannedDuration;

  /**
   * Referência do “alvo” revisado (ex.: subjectId + trilha).
   * Estrutura concreta depende do domínio/subjects; aqui é um contrato conceitual.
   */
  targetRef: {
    kind: "SUBJECT_THEORY" | "INFORMATIVES";
    refId: string;
  };
}

export interface ComputeReviewTasksInput {
  /**
   * Intervalo para o qual queremos derivar revisões (normalmente D+1 em diante).
   * Não prescreve algoritmo; apenas intenção.
   */
  startDate: CalendarDate;
  endDateInclusive: CalendarDate;
}

export interface ComputeReviewTasksOutput {
  startDate: CalendarDate;
  endDateInclusive: CalendarDate;

  /**
   * Revisões que DEVEM ser apresentadas no planejamento (ou já reservadas),
   * respeitando não-acúmulo: revisões perdidas não reaparecem.
   */
  reviewTasks: ReviewTaskDTO[];
}
