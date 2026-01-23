import type { ExtrasDurationsDTO, WeekdayRuleDTO } from '../dtos/PlanTypes';
import type { DailyPlanItemDTO } from '../dtos/DailyPlanDTO';
import { InsufficientTimeError } from '../errors/InsufficientTimeError';
import { InvalidInputError } from '../errors/InvalidInputError';

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

    // Regra: se o dia exige o extra, duracao precisa ser >= 1 (DDL exige planned_minutes >= 1).
    if (weekdayRule.hasQuestions) {
      if (!Number.isInteger(extras.questionsMinutes) || extras.questionsMinutes < 1) {
        throw new InvalidInputError({
  message: `Profile extras invalid: leiSecaMinutes must be >= 1 when hasLeiSeca=true (date=${date}).`,
  field: 'extras.leiSecaMinutes',
});

      }
      total += extras.questionsMinutes;
      items.push({ type: 'QUESTIONS', title: 'Questões', minutes: extras.questionsMinutes });
    }

    if (weekdayRule.hasInformatives) {
      if (!Number.isInteger(extras.informativesMinutes) || extras.informativesMinutes < 1) {
       throw new InvalidInputError({
  message: `Profile extras invalid: informativesMinutes must be >= 1 when hasInformatives=true (date=${date}).`,
  field: 'extras.informativesMinutes',
});

      }
      total += extras.informativesMinutes;
      items.push({ type: 'INFORMATIVES', title: 'Informativos', minutes: extras.informativesMinutes });
    }

    if (weekdayRule.hasLeiSeca) {
      if (!Number.isInteger(extras.leiSecaMinutes) || extras.leiSecaMinutes < 1) {
        throw new InvalidInputError({
  message: `Profile extras invalid: questionsMinutes must be >= 1 when hasQuestions=true (date=${date}).`,
  field: 'extras.questionsMinutes',
});

      }
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