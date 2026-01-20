import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';

export interface IDailyPlanReadPort {
  /**
   * Retorna o plano materializado do dia (daily_plans + daily_plan_items),
   * ou null se ainda não existir materialização para a data.
   */
  getDailyPlan(params: { userId: string; date: string }): Promise<DailyPlanDTO | null>;
}
