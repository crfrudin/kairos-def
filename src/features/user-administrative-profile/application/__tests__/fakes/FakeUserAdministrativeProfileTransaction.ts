import type { IUserAdministrativeProfileTransaction } from "../../ports/IUserAdministrativeProfileTransaction";
import type { IUserAdministrativeProfileRepository } from "../../ports/IUserAdministrativeProfileRepository";

export class FakeUserAdministrativeProfileTransaction implements IUserAdministrativeProfileTransaction {
  constructor(private readonly repo: IUserAdministrativeProfileRepository) {}

  async runInTransaction<T>(work: (txRepo: IUserAdministrativeProfileRepository) => Promise<T>): Promise<T> {
    return work(this.repo);
  }
}
