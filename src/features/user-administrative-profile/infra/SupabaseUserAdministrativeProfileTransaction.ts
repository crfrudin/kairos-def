// src/features/user-administrative-profile/infra/SupabaseUserAdministrativeProfileTransaction.ts

import "server-only";

import type {
  IUserAdministrativeProfileTransaction,
  IUserAdministrativeProfileRepository,
} from "@/features/user-administrative-profile/application";

import { SupabaseUserAdministrativeProfileRepository } from "./SupabaseUserAdministrativeProfileRepository";

/**
 * Transação (adapter) — Sem bypass de RLS e sem RPC nova (proibido).
 *
 * Como o Supabase (PostgREST) não expõe transação multi-statement sem RPC/functions,
 * este adapter:
 * - permite no máximo 1 escrita por "bloco transacional" (replaceFullContract),
 * - falha explicitamente se houver tentativa de múltiplas escritas,
 * evitando simulação transacional enganosa.
 */
export class SupabaseUserAdministrativeProfileTransaction implements IUserAdministrativeProfileTransaction {
  public async runInTransaction<T>(work: (txRepo: IUserAdministrativeProfileRepository) => Promise<T>): Promise<T> {
    const repo = new GuardedRepository(new SupabaseUserAdministrativeProfileRepository());
    const result = await work(repo);
    repo.assertWriteSafety();
    return result;
  }
}

type ReplaceParams = Parameters<IUserAdministrativeProfileRepository["replaceFullContract"]>[0];

class GuardedRepository implements IUserAdministrativeProfileRepository {
  private writes = 0;

  constructor(private readonly inner: IUserAdministrativeProfileRepository) {}

  public async getFullContract(userId: string) {
    return this.inner.getFullContract(userId);
  }

  public async replaceFullContract(params: ReplaceParams) {
    this.writes += 1;
    if (this.writes > 1) {
      throw new Error(
        "UAP_INFRA_TX_UNSUPPORTED: múltiplas escritas no mesmo bloco não são suportadas sem RPC transacional."
      );
    }
    return this.inner.replaceFullContract(params);
  }

  public assertWriteSafety() {
    // Ponto único para futuras extensões (ex.: transação real via RPC autorizada).
  }
}
