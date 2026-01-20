import type { ReviewTaskDTO } from '../dtos/PlanTypes';
import type { DailyPlanItemDTO } from '../dtos/DailyPlanDTO';
import { InsufficientTimeError } from '../errors/InsufficientTimeError';

export class ReviewAllocator {
  public allocate(params: {
    date: string;
    dailyMinutes: number;
    reviewTasks: ReviewTaskDTO[];
  }): { reviewMinutes: number; remainingMinutes: number; items: DailyPlanItemDTO[] } {
    const { date, dailyMinutes, reviewTasks } = params;

    const items: DailyPlanItemDTO[] = [];
    let total = 0;

    for (const r of reviewTasks) {
      total += r.reviewMinutes;
      items.push({
        type: 'REVIEW',
        title: `Revisão: ${r.subjectName}`,
        minutes: r.reviewMinutes,
        metadata: {
          reviewId: r.id,
          subjectId: r.subjectId,
          sourceDate: r.sourceDate,
          scheduledDate: r.scheduledDate,
        },
      });
    }

    const remaining = dailyMinutes - total;
    if (remaining < 0) {
      throw new InsufficientTimeError({
        date,
        stage: 'REVIEWS',
        requiredMinutes: total,
        availableMinutes: dailyMinutes,
        missingMinutes: Math.abs(remaining),
      });
    }

    return { reviewMinutes: total, remainingMinutes: remaining, items };
  }
}
