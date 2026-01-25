export type LegalDocType = "TERMS" | "PRIVACY";

export type LegalConsentRecord = {
  docType: LegalDocType;
  docVersion: string;
  acceptedAtIso: string;
};

export interface ILegalConsentRepository {
  hasAccepted(userId: string, docType: LegalDocType, docVersion: string): Promise<boolean>;

  recordAcceptance(input: {
    userId: string;
    docType: LegalDocType;
    docVersion: string;
    acceptedAtIso: string;
    ipHash?: string | null;
    userAgentHash?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void>;
}
