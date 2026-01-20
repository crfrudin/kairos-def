import type { ExtrasDurationsDTO, WeekdayRuleDTO } from '../dtos/PlanTypes';
import type { DailyPlanItemDTO } from '../dtos/DailyPlanDTO';
import { InsufficientTimeError } from '../errors/InsufficientTimeError';

export class ExtrasAllocator {
  public allocate(params: {
    date: string;
    weekdayRule: WeekdayRuleDTO;
    extras: ExtrasDurationsDTO;
    remainingMinutes: number;
  }): { extrasMinutes: number; remainingMinutes: number; items: DailyPlanItemDTO[] } {
    const { date, weekdayRule, extras, remainingMinutes } = params;

    const items: DailyPlanItemDTO[] = [];
    let total = 0;

    if (weekdayRule.hasQuestions) {
      total += extras.questionsMinutes;
      items.push({ type: 'QUESTIONS', title: 'Questões', minutes: extras.questionsMinutes });
    }

    if (weekdayRule.hasInformatives) {
      total += extras.informativesMinutes;
      items.push({ type: 'INFORMATIVES', title: 'Informativos', minutes: extras.informativesMinutes });
    }

    if (weekdayRule.hasLeiSeca) {
      total += extras.leiSecaMinutes;
      items.push({ type: 'LEI_SECA', title: 'Lei Seca', minutes: extras.leiSecaMinutes });
    }

    const nextRemaining = remainingMinutes - total;
    if (nextRemaining < 0) {
      throw new InsufficientTimeError({
        date,
        stage: 'EXTRAS',
        requiredMinutes: total,
        availableMinutes: remainingMinutes,
        missingMinutes: Math.abs(nextRemaining),
      });
    }

    return { extrasMinutes: total, remainingMinutes: nextRemaining, items };
  }
}
