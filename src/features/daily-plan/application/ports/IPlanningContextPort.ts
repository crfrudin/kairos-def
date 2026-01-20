import type { ProfileRulesDTO, ReviewTaskDTO, SubjectTheoryDTO } from '../dtos/PlanTypes';

export interface PlanningContext {
  userId: string;
  date: string; // YYYY-MM-DD

  profile: ProfileRulesDTO;

  // matérias de teoria elegíveis (já ordenadas por prioridade determinística)
  subjects: SubjectTheoryDTO[];

  // revisões agendadas exatamente para o dia (não-acúmulo deve ser garantido pelo provider)
  reviewTasks: ReviewTaskDTO[];

  // estado do ciclo (apenas para CICLO)
  cycle?: {
    cursor: number; // índice base 0
  };

  // se já existe execução registrada para a data
  hasExecution: boolean;
}

export interface IPlanningContextPort {
  getPlanningContext(params: { userId: string; date: string }): Promise<PlanningContext>;
}
