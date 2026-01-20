import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';
import type { IDailyPlanPersistencePort } from '../ports/IDailyPlanPersistencePort';
import type { IPlanningContextPort } from '../ports/IPlanningContextPort';
import { assertIsoDate } from '../services/DateUtil';
import { DailyPlanComposer } from '../services/DailyPlanComposer';
import { stableStringify, sha256Hex } from '../services/HashUtil';
import { InvalidInputError } from '../errors/InvalidInputError';
import { PlanningBlockedError } from '../errors/PlanningBlockedError';

export interface RegenerateDailyPlanInput {
  userId: string;
  date: string; // YYYY-MM-DD
  notes?: string | null; // optional human-audit notes
}

export interface RegenerateDailyPlanOutput {
  plan: DailyPlanDTO;
  nextCycleCursor?: number;
}

export interface RegenerateDailyPlanDeps {
  contextPort: IPlanningContextPort;
  persistencePort: IDailyPlanPersistencePort;
  composer: DailyPlanComposer;

  // injectable clock: does not affect plan content, only auditing
  nowIso: () => string;
}

export class RegenerateDailyPlanUseCase {
  constructor(private readonly deps: RegenerateDailyPlanDeps) {}

  public async execute(input: RegenerateDailyPlanInput): Promise<RegenerateDailyPlanOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new InvalidInputError({ message: 'userId é obrigatório.', field: 'userId' });
    }

    assertIsoDate(input.date);

    const ctx = await this.deps.contextPort.getPlanningContext({
      userId: input.userId,
      date: input.date,
    });

    if (ctx.userId !== input.userId) {
      throw new InvalidInputError({ message: 'Contexto inconsistente (userId).', field: 'userId' });
    }
    if (ctx.date !== input.date) {
      throw new InvalidInputError({ message: 'Contexto inconsistente (date).', field: 'date' });
    }

    // NORMATIVE BLOCKS (fail-fast)
    if (ctx.hasExecution) {
      throw new PlanningBlockedError({ date: input.date, reason: 'day_already_executed' });
    }

    if (ctx.profile.studyMode === 'CICLO') {
      throw new PlanningBlockedError({ date: input.date, reason: 'cycle_cursor_storage_not_defined' });
    }

    const { plan, nextCycleCursor } = this.deps.composer.compose(ctx);

    await this.deps.persistencePort.upsertDailyPlan({
      userId: input.userId,
      plan,
    });

    // kept by contract, but blocked above until CICLO cursor storage exists
    if (typeof nextCycleCursor === 'number') {
      await this.deps.persistencePort.updateCycleCursor({
        userId: input.userId,
        nextCursor: nextCycleCursor,
      });
    }

    const inputHash = sha256Hex(
      stableStringify({
        userId: ctx.userId,
        date: ctx.date,
        profile: ctx.profile,
        subjects: ctx.subjects,
        reviewTasks: ctx.reviewTasks,
        cycle: ctx.cycle ?? null,
        hasExecution: ctx.hasExecution,
      })
    );

    const outputHash = sha256Hex(stableStringify(plan));

    await this.deps.persistencePort.appendGenerationLog({
      userId: input.userId,
      date: input.date,
      generatedAtIso: this.deps.nowIso(),
      reason: 'manual_regenerate',
      inputHash,
      outputHash,
      notes: input.notes ?? null,
    });

    return { plan, nextCycleCursor };
  }
}
