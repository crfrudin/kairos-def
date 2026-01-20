import type { ProfileRulesDTO } from '../dtos/PlanTypes';
import { weekdayFromIsoDate, isDateInRangeInclusive } from './DateUtil';

export type RestReason = 'WEEKLY_SCHEDULE' | 'REST_PERIOD';

export class RestDayEvaluator {
  public evaluate(params: { date: string; profile: ProfileRulesDTO }): { isRestDay: boolean; reason?: RestReason } {
    const { date, profile } = params;

    const weekday = weekdayFromIsoDate(date);
    const weekdayRule = profile.weekdayRules.find((r) => r.weekday === weekday);

    // Se não existir regra do dia, isso é erro de dados do provider; aqui tratamos como descanso por segurança determinística.
    if (!weekdayRule) {
      return { isRestDay: true, reason: 'WEEKLY_SCHEDULE' };
    }

    // Descanso por horário semanal: dailyMinutes == 0
    if (weekdayRule.dailyMinutes === 0) {
      return { isRestDay: true, reason: 'WEEKLY_SCHEDULE' };
    }

    // Descanso por RestPeriod explícito
    for (const rp of profile.restPeriods) {
      if (isDateInRangeInclusive(date, rp.startDate, rp.endDate)) {
        return { isRestDay: true, reason: 'REST_PERIOD' };
      }
    }

    return { isRestDay: false };
  }
}
