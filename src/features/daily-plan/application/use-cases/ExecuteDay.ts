import type { IPlanningContextPort } from '../ports/IPlanningContextPort';
import type { IExecutionPersistencePort, ExecutedDayResultStatus } from '../ports/IExecutionPersistencePort';
import { assertIsoDate } from '../services/DateUtil';
import { InvalidInputError } from '../errors/InvalidInputError';
import { PlanningBlockedError } from '../errors/PlanningBlockedError';

export interface ExecuteDayInput {
  userId: string;
  date: string; // YYYY-MM-DD

  resultStatus: ExecutedDayResultStatus;
  totalExecutedMinutes: number; // 0..1440

  factualSummary?: Record<string, unknown> | null;
}

export interface ExecuteDayOutput {
  ok: true;
}

export interface ExecuteDayDeps {
  contextPort: IPlanningContextPort;
  executionPersistencePort: IExecutionPersistencePort;

  /**
   * Clock injetável:
   * - NÃO afeta determinismo do planejamento; apenas auditoria factual.
   */
  nowIso: () => string;
}

function assertResultStatus(v: unknown): asserts v is ExecutedDayResultStatus {
  const allowed: ExecutedDayResultStatus[] = ['COMPLETED', 'PARTIAL', 'NOT_COMPLETED', 'REST_DAY'];
  if (typeof v !== 'string' || !allowed.includes(v as ExecutedDayResultStatus)) {
    throw new InvalidInputError({ message: 'resultStatus inválido.', field: 'resultStatus' });
  }
}

function assertTotalMinutes(v: unknown): number {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > 1440) {
    throw new InvalidInputError({ message: 'totalExecutedMinutes inválido (0..1440).', field: 'totalExecutedMinutes' });
  }
  return v;
}

function assertObjectOrEmpty(v: unknown): Record<string, unknown> {
  if (v == null) return {};
  if (typeof v !== 'object' || Array.isArray(v)) {
    throw new InvalidInputError({ message: 'factualSummary deve ser um objeto.', field: 'factualSummary' });
  }
  return v as Record<string, unknown>;
}

export class ExecuteDayUseCase {
  constructor(private readonly deps: ExecuteDayDeps) {}

  public async execute(input: ExecuteDayInput): Promise<ExecuteDayOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new InvalidInputError({ message: 'userId é obrigatório.', field: 'userId' });
    }

    assertIsoDate(input.date);
    assertResultStatus(input.resultStatus);

    const totalExecutedMinutes = assertTotalMinutes(input.totalExecutedMinutes);
    const factualSummary = assertObjectOrEmpty(input.factualSummary);

    // Fail-fast normativo: não permite registrar execução duplicada.
    // Usamos o contextPort porque ele já é a fonte oficial de "hasExecution" (executed_days).
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

    if (ctx.hasExecution) {
      throw new PlanningBlockedError({ date: input.date, reason: 'day_already_executed' });
    }

    await this.deps.executionPersistencePort.insertExecutedDay({
      userId: input.userId,
      date: input.date,
      resultStatus: input.resultStatus,
      totalExecutedMinutes,
      factualSummary,
      executedAtIso: this.deps.nowIso(),
    });

    return { ok: true };
  }
}
