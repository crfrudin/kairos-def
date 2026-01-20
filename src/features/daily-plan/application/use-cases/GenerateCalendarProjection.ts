import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';
import type { IPlanningContextPort } from '../ports/IPlanningContextPort';
import type { ICalendarProjectionPersistencePort } from '../ports/ICalendarProjectionPersistencePort';
import { assertIsoDate } from '../services/DateUtil';
import { stableStringify, sha256Hex } from '../services/HashUtil';
import { InvalidInputError } from '../errors/InvalidInputError';
import { PlanningBlockedError } from '../errors/PlanningBlockedError';
import { DailyPlanComposer } from '../services/DailyPlanComposer';

export interface GenerateCalendarProjectionInput {
  userId: string;
  rangeStart: string; // YYYY-MM-DD (inclusive)
  rangeEnd: string;   // YYYY-MM-DD (inclusive)
}

export interface GenerateCalendarProjectionOutput {
  rangeStart: string;
  rangeEnd: string;
  days: DailyPlanDTO[];
}

export interface GenerateCalendarProjectionDeps {
  contextPort: IPlanningContextPort;
  projectionPersistencePort: ICalendarProjectionPersistencePort;
  composer: DailyPlanComposer;

  /**
   * Clock injetável (não afeta output, só auditoria).
   */
  nowIso: () => string;
}

/**
 * UC-02: Projeção regenerável por intervalo.
 * - NÃO escreve executed_days.
 * - Pode gravar cache regenerável em calendar_projections.
 * - Regra defensiva: máx 90 dias (DDL já impõe).
 */
export class GenerateCalendarProjectionUseCase {
  constructor(private readonly deps: GenerateCalendarProjectionDeps) {}

  public async execute(input: GenerateCalendarProjectionInput): Promise<GenerateCalendarProjectionOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new InvalidInputError({ message: 'userId é obrigatório.', field: 'userId' });
    }

    assertIsoDate(input.rangeStart);
    assertIsoDate(input.rangeEnd);

    const start = new Date(`${input.rangeStart}T00:00:00.000Z`);
    const end = new Date(`${input.rangeEnd}T00:00:00.000Z`);

    if (Number.isNaN(start.getTime())) {
      throw new InvalidInputError({ message: 'rangeStart inválido.', field: 'rangeStart' });
    }
    if (Number.isNaN(end.getTime())) {
      throw new InvalidInputError({ message: 'rangeEnd inválido.', field: 'rangeEnd' });
    }
    if (start.getTime() > end.getTime()) {
      throw new InvalidInputError({ message: 'rangeStart deve ser <= rangeEnd.', field: 'rangeStart' });
    }

    // Inclusivo
    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
    if (diffDays > 90) {
      throw new InvalidInputError({ message: 'Intervalo máximo é 90 dias.', field: 'rangeEnd' });
    }

    const days: DailyPlanDTO[] = [];

    for (let i = 0; i <= diffDays; i++) {
      const d = new Date(start.getTime() + i * 86400000);
      const iso = d.toISOString().slice(0, 10);

      const ctx = await this.deps.contextPort.getPlanningContext({
        userId: input.userId,
        date: iso,
      });

      if (ctx.userId !== input.userId) {
        throw new InvalidInputError({ message: 'Contexto inconsistente (userId).', field: 'userId' });
      }
      if (ctx.date !== iso) {
        throw new InvalidInputError({ message: 'Contexto inconsistente (date).', field: 'rangeStart' });
      }

      // Bloqueios (mesma filosofia UC-01)
      if (ctx.hasExecution) {
        throw new PlanningBlockedError({ date: iso, reason: 'day_already_executed' });
      }
      if (ctx.profile.studyMode === 'CICLO') {
        throw new PlanningBlockedError({ date: iso, reason: 'cycle_cursor_storage_not_defined' });
      }

      const { plan } = this.deps.composer.compose(ctx);
      days.push(plan);
    }

    const inputHash = sha256Hex(
      stableStringify({
        userId: input.userId,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        daysCount: days.length,
      })
    );

    const outputHash = sha256Hex(stableStringify(days));

    const generationLogId = await this.deps.projectionPersistencePort.createProjectionGenerationLog({
      userId: input.userId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      reason: 'system',
      normativeContext: { inputHash, outputHash },
      occurredAtIso: this.deps.nowIso(),
      notes: null,
    });

    await this.deps.projectionPersistencePort.upsertCalendarProjection({
      userId: input.userId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      generationLogId,
      normativeContext: { inputHash, outputHash },
      projectionPayload: {
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        days,
      },
    });

    return {
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      days,
    };
  }
}
