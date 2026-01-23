import "server-only";

import { createUserAdministrativeProfileSsrComposition } from "@/core/composition/user-administrative-profile.ssr.composition";

export type AdministrativeProfileFlags = {
  administrativeProfileExists: boolean;
  isAdministrativeProfileComplete: boolean;
};

export async function getAdministrativeProfileFlags(userId: string): Promise<AdministrativeProfileFlags> {
  if (!userId || typeof userId !== "string") {
    return { administrativeProfileExists: false, isAdministrativeProfileComplete: false };
  }

  const { ucCheckCompleteness } = createUserAdministrativeProfileSsrComposition();
  const checked = await ucCheckCompleteness.execute({ userId });

  if (!checked.ok) {
    // best-effort consultivo: falha não bloqueia nem altera comportamento
    return { administrativeProfileExists: false, isAdministrativeProfileComplete: false };
  }

  return {
    administrativeProfileExists: checked.data.exists,
    isAdministrativeProfileComplete: checked.data.isComplete,
  };
}
