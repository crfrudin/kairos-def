import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';
import type { IPlanningContextPort } from '../ports/IPlanningContextPort';
import type { ICalendarProjectionPersistencePort } from '../ports/ICalendarProjectionPersistencePort';
import { assertIsoDate } from '../services/DateUtil';
import { DailyPlanComposer } from '../services/DailyPlanComposer';
import { stableStringify, sha256Hex } from '../services/HashUtil';
import { InvalidInputError } from '../errors/InvalidInputError';
import { PlanningBlockedError } from '../errors/PlanningBlockedError';

export interface GenerateCalendarProjectionInput {
  userId: string;
  rangeStart: string; // YYYY-MM-DD
  rangeEnd: string;   // YYYY-MM-DD (inclusive)
}

export interface GenerateCalendarProjectionOutput {
  rangeStart: string;
  rangeEnd: string; // inclusive
  days: DailyPlanDTO[];
}

export interface GenerateCalendarProjectionDeps {
  contextPort: IPlanningContextPort;
  persistencePort: ICalendarProjectionPersistencePort;
  composer: DailyPlanComposer;

  /**
   * Clock injetável:
   * - NÃO afeta o conteúdo do plano (output), apenas auditoria.
   */
  nowIso: () => string;
}

function toUtcMidnight(dateIso: string): Date {
  // YYYY-MM-DD => Date em UTC midnight (determinístico, sem timezone local)
  const [y, m, d] = dateIso.split('-').map((x) => Number(x));
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
}

function addDaysUtc(base: Date, days: number): Date {
  const d = new Date(base.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function toIsoDateUtc(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export class GenerateCalendarProjectionUseCase {
  constructor(private readonly deps: GenerateCalendarProjectionDeps) {}

  public async execute(input: GenerateCalendarProjectionInput): Promise<GenerateCalendarProjectionOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new InvalidInputError({ message: 'userId é obrigatório.', field: 'userId' });
    }

    assertIsoDate(input.rangeStart);
    assertIsoDate(input.rangeEnd);

    const start = toUtcMidnight(input.rangeStart);
    const end = toUtcMidnight(input.rangeEnd);

    if (start.getTime() > end.getTime()) {
      throw new InvalidInputError({ message: 'rangeStart deve ser <= rangeEnd.', field: 'rangeStart' });
    }

    const diffDays = Math.floor((end.getTime() - start.getTime()) / 86400000);
    const totalDaysInclusive = diffDays + 1;

    // DDL tem CHECK <= 90 dias (range_end - range_start <= 90).
    // Como o modelo é inclusive, aqui impomos <= 91 dias no máximo se o DDL fosse estrito.
    // Porém o DDL usa diferença de dates, então para estar sempre compatível:
    // range_end - range_start <= 90  => inclusive totalDays <= 91.
    if (totalDaysInclusive < 1 || totalDaysInclusive > 91) {
      throw new InvalidInputError({
        message: 'Intervalo inválido. Máximo permitido: 91 dias (inclusive), conforme CHECK do schema.',
        field: 'rangeEnd',
      });
    }

    // Geração determinística: dia a dia, sem materializar daily_plans (apenas projeção).
    const days: DailyPlanDTO[] = [];

    for (let i = 0; i < totalDaysInclusive; i++) {
      const date = toIsoDateUtc(addDaysUtc(start, i));

      const ctx = await this.deps.contextPort.getPlanningContext({
        userId: input.userId,
        date,
      });

      // consistência mínima
      if (ctx.userId !== input.userId) {
        throw new InvalidInputError({ message: 'Contexto inconsistente (userId).', field: 'userId' });
      }
      if (ctx.date !== date) {
        throw new InvalidInputError({ message: 'Contexto inconsistente (date).', field: 'rangeStart' });
      }

      // BLOQUEIOS NORMATIVOS (fail-fast)
      if (ctx.hasExecution) {
        throw new PlanningBlockedError({ date, reason: 'day_already_executed' });
      }
      if (ctx.profile.studyMode === 'CICLO') {
        throw new PlanningBlockedError({ date, reason: 'cycle_cursor_storage_not_defined' });
      }

      const { plan } = this.deps.composer.compose(ctx);
      days.push(plan);
    }

    const inputHash = sha256Hex(
      stableStringify({
        userId: input.userId,
        rangeStart: input.rangeStart,
        rangeEnd: input.rangeEnd,
        // NOTA: o conteúdo exato depende do provider por dia; registramos o array final de planos (outputHash) e range aqui.
      })
    );

    const outputHash = sha256Hex(stableStringify(days));

    // 1) log auditável do intervalo
    const log = await this.deps.persistencePort.appendProjectionGenerationLog({
      userId: input.userId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      generatedAtIso: this.deps.nowIso(),
      inputHash,
      outputHash,
    });

    // 2) persistência da projeção regenerável
    await this.deps.persistencePort.upsertCalendarProjection({
      userId: input.userId,
      rangeStart: input.rangeStart,
      rangeEnd: input.rangeEnd,
      generationLogId: log.generationLogId,
      normativeContext: {
        inputHash,
        outputHash,
      },
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
