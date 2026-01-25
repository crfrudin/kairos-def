import type { ILegalConsentRepository, LegalDocType } from "../ports/ILegalConsentRepository";

export type RecordLegalConsentResult =
  | { ok: true; recorded: boolean }
  | { ok: false; error: "VALIDATION" | "INFRA"; message: string };

export class RecordLegalConsentUseCase {
  constructor(private readonly repo: ILegalConsentRepository) {}

  public async execute(input: {
    userId: string;
    docType: LegalDocType;
    docVersion: string;
    acceptedAtIso: string;
    ipHash?: string | null;
    userAgentHash?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<RecordLegalConsentResult> {
    if (!input.userId) return { ok: false, error: "VALIDATION", message: "userId obrigatório" };
    if (input.docType !== "TERMS" && input.docType !== "PRIVACY") {
      return { ok: false, error: "VALIDATION", message: "docType inválido" };
    }
    if (!input.docVersion) return { ok: false, error: "VALIDATION", message: "docVersion obrigatório" };
    if (!input.acceptedAtIso) return { ok: false, error: "VALIDATION", message: "acceptedAtIso obrigatório" };

    try {
      const already = await this.repo.hasAccepted(input.userId, input.docType, input.docVersion);
      if (already) return { ok: true, recorded: false };

      await this.repo.recordAcceptance({
        userId: input.userId,
        docType: input.docType,
        docVersion: input.docVersion,
        acceptedAtIso: input.acceptedAtIso,
        ipHash: input.ipHash ?? null,
        userAgentHash: input.userAgentHash ?? null,
        metadata: input.metadata ?? {},
      });

      return { ok: true, recorded: true };
    } catch (e) {
      return { ok: false, error: "INFRA", message: e instanceof Error ? e.message : "INFRA_ERROR" };
    }
  }
}
