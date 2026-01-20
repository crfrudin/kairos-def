import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';
import { createSupabaseServerClient } from '@/features/auth/infra/ssr/createSupabaseServerClient';

import type { IExecutionPersistencePort, ExecuteDayEntry } from '@/features/daily-plan/application/ports/IExecutionPersistencePort';

export class SupabaseExecutionPersistencePortSSR implements IExecutionPersistencePort {
  private async getClient(): Promise<SupabaseClient> {
    return createSupabaseServerClient() as unknown as SupabaseClient;
  }

  public async insertExecutedDay(entry: ExecuteDayEntry): Promise<void> {
    const client = await this.getClient();

    const ins = await client.from('executed_days').insert({
      user_id: entry.userId,
      plan_date: entry.date,
      executed_at: entry.executedAtIso,
      result_status: entry.resultStatus,
      total_executed_minutes: entry.totalExecutedMinutes,
      factual_summary: entry.factualSummary,
    });

    if (ins.error) {
      // Postgres unique violation: 23505 (uq_executed_days_user_date)
      // A aplicação já faz fail-fast via contextPort, mas isso cobre race condition.
      const anyErr = ins.error as unknown as { code?: string; message: string };
      if (anyErr?.code === '23505') {
        throw new Error('EXECUTION_ALREADY_EXISTS: executed_days já possui registro para este userId+date.');
      }
      throw new Error(`DB_INSERT_EXECUTED_DAYS_FAILED: ${ins.error.message}`);
    }

    // Opcional (consistência visual): marcar daily_plans como EXECUTED se existir.
    // Não criamos daily_plans se não existir (sem inventar plano).
    const upd = await client
      .from('daily_plans')
      .update({ status: 'EXECUTED', updated_at: entry.executedAtIso })
      .eq('user_id', entry.userId)
      .eq('plan_date', entry.date);

    // Se falhar aqui, NÃO desfazemos executed_days (factual). Logamos como erro duro, porque é DB.
    if (upd.error) {
      throw new Error(`DB_UPDATE_DAILY_PLANS_EXECUTED_FAILED: ${upd.error.message}`);
    }
  }
}
