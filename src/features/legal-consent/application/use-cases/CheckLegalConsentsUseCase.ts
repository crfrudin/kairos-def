import type { ILegalConsentRepository, LegalDocType } from "../ports/ILegalConsentRepository";

export type CheckLegalConsentsResult =
  | { ok: true; missing: LegalDocType[] }
  | { ok: false; error: "VALIDATION" | "INFRA"; message: string };

export class CheckLegalConsentsUseCase {
  constructor(private readonly repo: ILegalConsentRepository) {}

  public async execute(input: {
    userId: string;
    required: { docType: LegalDocType; docVersion: string }[];
  }): Promise<CheckLegalConsentsResult> {
    if (!input.userId) return { ok: false, error: "VALIDATION", message: "userId obrigatório" };
    if (!Array.isArray(input.required) || input.required.length === 0) {
      return { ok: false, error: "VALIDATION", message: "required obrigatório" };
    }

    try {
      const missing: LegalDocType[] = [];
      for (const r of input.required) {
        const has = await this.repo.hasAccepted(input.userId, r.docType, r.docVersion);
        if (!has) missing.push(r.docType);
      }
      return { ok: true, missing };
    } catch (e) {
      return { ok: false, error: "INFRA", message: e instanceof Error ? e.message : "INFRA_ERROR" };
    }
  }
}
