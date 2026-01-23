import type { IUserAdministrativeProfileRepository } from "../../ports/IUserAdministrativeProfileRepository";
import type { UserAdministrativeProfileContract } from "../../ports/UserAdministrativeProfileContract";

type Handler<T> = (args: unknown) => Promise<T>;

export class FakeUserAdministrativeProfileRepository implements IUserAdministrativeProfileRepository {
  private handlers: {
    getFullContract: Handler<UserAdministrativeProfileContract | null>;
    replaceFullContract: Handler<void>;
  };

  constructor() {
    this.handlers = {
      getFullContract: async () => null,
      replaceFullContract: async () => undefined,
    };
  }

  public onGetFullContract(handler: (userId: string) => Promise<UserAdministrativeProfileContract | null>): void {
    this.handlers.getFullContract = async (args: unknown) => handler(args as string);
  }

  public onReplaceFullContract(handler: (args: unknown) => Promise<void> | void): void {
    this.handlers.replaceFullContract = async (args: unknown) => {
      await handler(args);
    };
  }

  async getFullContract(userId: string): Promise<UserAdministrativeProfileContract | null> {
    return this.handlers.getFullContract(userId);
  }

  // Assinatura compatível com a interface; parâmetros não são necessários nesta fake.
  async replaceFullContract(_params?: unknown): Promise<void> {
    return this.handlers.replaceFullContract(_params);
  }
}
