import "server-only";

import { createSupabaseServerClient } from "@/core/clients/createSupabaseServerClient";
import type { ILegalConsentRepository, LegalDocType } from "../application/ports/ILegalConsentRepository";

export class SupabaseLegalConsentRepository implements ILegalConsentRepository {
  public async hasAccepted(userId: string, docType: LegalDocType, docVersion: string): Promise<boolean> {
    const supabase = await createSupabaseServerClient();

    const { data, error } = await supabase
      .from("legal_consents")
      .select("id")
      .eq("user_id", userId)
      .eq("doc_type", docType)
      .eq("doc_version", docVersion)
      .limit(1);

    if (error) throw new Error(`LEGAL_CONSENT_SELECT_FAILED:${error.message}`);
    return Array.isArray(data) && data.length > 0;
  }

  public async recordAcceptance(input: {
    userId: string;
    docType: LegalDocType;
    docVersion: string;
    acceptedAtIso: string;
    ipHash?: string | null;
    userAgentHash?: string | null;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    const supabase = await createSupabaseServerClient();

    const { error } = await supabase.from("legal_consents").insert({
      user_id: input.userId,
      doc_type: input.docType,
      doc_version: input.docVersion,
      accepted_at: input.acceptedAtIso,
      ip_hash: input.ipHash ?? null,
      user_agent_hash: input.userAgentHash ?? null,
      metadata: input.metadata ?? {},
    });

    if (error) throw new Error(`LEGAL_CONSENT_INSERT_FAILED:${error.message}`);
  }
}
