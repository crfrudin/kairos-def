import type { DailyPlanDTO, DailyPlanItemDTO } from '../dtos/DailyPlanDTO';
import type { PlanningContext } from '../ports/IPlanningContextPort';
import { RestDayEvaluator } from './RestDayEvaluator';
import { ReviewAllocator } from './ReviewAllocator';
import { ExtrasAllocator } from './ExtrasAllocator';
import { TheoryAllocator } from './TheoryAllocator';
import { weekdayFromIsoDate } from './DateUtil';
import { RestDayError } from '../errors/RestDayError';
import { ExecutionAlreadyExistsError } from '../errors/ExecutionAlreadyExistsError';

export class DailyPlanComposer {
  constructor(
    private readonly restDayEvaluator: RestDayEvaluator,
    private readonly reviewAllocator: ReviewAllocator,
    private readonly extrasAllocator: ExtrasAllocator,
    private readonly theoryAllocator: TheoryAllocator
  ) {}

  public compose(ctx: PlanningContext): { plan: DailyPlanDTO; nextCycleCursor?: number } {
    const { date, profile } = ctx;

    // 0) Proibição absoluta: se já existe execução, plano é imutável
    if (ctx.hasExecution) {
      throw new ExecutionAlreadyExistsError({ date });
    }

    // 1) Descanso (precedência absoluta)
    const rest = this.restDayEvaluator.evaluate({ date, profile });
    if (rest.isRestDay) {
      throw new RestDayError({ date, reason: rest.reason! });
    }

    const weekday = weekdayFromIsoDate(date);
    const weekdayRule = profile.weekdayRules.find((r) => r.weekday === weekday);

    // Fallback seguro (determinístico)
    const dailyMinutes = weekdayRule?.dailyMinutes ?? 0;
    const effectiveWeekdayRule = weekdayRule ?? {
      weekday,
      dailyMinutes,
      hasTheory: false,
      hasQuestions: false,
      hasInformatives: false,
      hasLeiSeca: false,
    };

    // 2) Revisões (antes de extras e teoria)
    const reviews = this.reviewAllocator.allocate({
      date,
      dailyMinutes,
      reviewTasks: ctx.reviewTasks,
    });

    // 3) Extras (antes de teoria)
    const extras = this.extrasAllocator.allocate({
      date,
      weekdayRule: effectiveWeekdayRule,
      extras: profile.extrasDurations,
      remainingMinutes: reviews.remainingMinutes,
    });

    // 4) Teoria (camada final)
    const theory = this.theoryAllocator.allocate({
      date,
      studyMode: profile.studyMode,
      subjectsPerDayLimit: profile.subjectsPerDayLimit,
      weekdayHasTheory: effectiveWeekdayRule.hasTheory,
      remainingMinutes: extras.remainingMinutes,
      subjects: ctx.subjects,
      cycleCursor: ctx.cycle?.cursor,
    });

    const items: DailyPlanItemDTO[] = [
      ...reviews.items,
      ...extras.items,
      ...theory.items,
    ];

    const plan: DailyPlanDTO = {
      date,
      status: 'PLANNED',
      dailyMinutes,
      reviewMinutes: reviews.reviewMinutes,
      extrasMinutes: extras.extrasMinutes,
      theoryMinutes: theory.theoryMinutes,
      items,
      trace: {
        remainingAfterReviews: reviews.remainingMinutes,
        remainingAfterExtras: extras.remainingMinutes,
        remainingAfterTheory: theory.remainingMinutes,
      },
    };

    return { plan, nextCycleCursor: theory.nextCycleCursor };
  }
}
