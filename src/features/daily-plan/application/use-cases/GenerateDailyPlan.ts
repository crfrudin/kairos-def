import type { DailyPlanDTO } from '../dtos/DailyPlanDTO';
import type { IDailyPlanPersistencePort } from '../ports/IDailyPlanPersistencePort';
import type { IPlanningContextPort } from '../ports/IPlanningContextPort';
import { assertIsoDate } from '../services/DateUtil';
import { DailyPlanComposer } from '../services/DailyPlanComposer';
import { stableStringify, sha256Hex } from '../services/HashUtil';
import { InvalidInputError } from '../errors/InvalidInputError';
import { PlanningBlockedError } from '../errors/PlanningBlockedError';

export interface GenerateDailyPlanInput {
  userId: string;
  date: string; // YYYY-MM-DD
}

export interface GenerateDailyPlanOutput {
  plan: DailyPlanDTO;
  nextCycleCursor?: number;
}

export interface GenerateDailyPlanDeps {
  contextPort: IPlanningContextPort;
  persistencePort: IDailyPlanPersistencePort;
  composer: DailyPlanComposer;

  /**
   * Clock injetável:
   * - NÃO afeta o plano (output), apenas auditoria.
   */
  nowIso: () => string;
}

export class GenerateDailyPlanUseCase {
  constructor(private readonly deps: GenerateDailyPlanDeps) {}

  public async execute(input: GenerateDailyPlanInput): Promise<GenerateDailyPlanOutput> {
    if (!input.userId || typeof input.userId !== 'string') {
      throw new InvalidInputError({ message: 'userId é obrigatório.', field: 'userId' });
    }

    assertIsoDate(input.date);

    // 1) Carrega contexto (perfil + matérias + revisões + estado de ciclo + execução)
    const ctx = await this.deps.contextPort.getPlanningContext({
      userId: input.userId,
      date: input.date,
    });

    // Garantia de consistência mínima do provider
    if (ctx.userId !== input.userId) {
      throw new InvalidInputError({ message: 'Contexto inconsistente (userId).', field: 'userId' });
    }
    if (ctx.date !== input.date) {
      throw new InvalidInputError({ message: 'Contexto inconsistente (date).', field: 'date' });
    }

    // 1.1) BLOQUEIOS NORMATIVOS (fail-fast, determinístico)

    // Proibição de gerar/regerar após execução registrada (executed_days é factual/imutável)
    if (ctx.hasExecution) {
      throw new PlanningBlockedError({
        date: input.date,
        reason: 'day_already_executed',
      });
    }

    // Modo CICLO requer persistência oficial do cursor; enquanto não existir, é proibido prosseguir.
    // (Não é permitido "inventar" storage, nem ignorar updateCycleCursor silenciosamente.)
    if (ctx.profile.studyMode === 'CICLO') {
      throw new PlanningBlockedError({
        date: input.date,
        reason: 'cycle_cursor_storage_not_defined',
      });
    }

    // 2) Compõe o plano (ordem normativa fixa):
    // descanso -> revisões -> extras -> teoria
    const { plan, nextCycleCursor } = this.deps.composer.compose(ctx);

    // 3) Persiste o plano (sem executar nada; apenas materialização do dia)
    await this.deps.persistencePort.upsertDailyPlan({
      userId: input.userId,
      plan,
    });

    // 4) Atualiza cursor do CICLO (se aplicável)
    // Observação: atualmente bloqueado acima por regra normativa (CICLO indisponível sem storage oficial).
    if (typeof nextCycleCursor === 'number') {
      await this.deps.persistencePort.updateCycleCursor({
        userId: input.userId,
        nextCursor: nextCycleCursor,
      });
    }

    // 5) Log auditável de geração (plan_generation_log)
    // Hash do input: contexto relevante para determinismo.
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

    // Hash do output: plano resultante.
    const outputHash = sha256Hex(stableStringify(plan));

    await this.deps.persistencePort.appendGenerationLog({
      userId: input.userId,
      date: input.date,
      generatedAtIso: this.deps.nowIso(),
      inputHash,
      outputHash,
    });

    return { plan, nextCycleCursor };
  }
}
