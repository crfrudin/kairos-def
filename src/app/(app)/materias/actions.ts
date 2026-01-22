"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";

export async function softDeleteMateriaAction(input: { subjectId: string }) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");

  const { softDeleteSubjectUseCase } = createSubjectsSsrComposition({ userId });

  const res = await softDeleteSubjectUseCase.execute({ userId, subjectId: input.subjectId });

  if (!res.ok) {
    throw new Error(`${res.error.code}: ${res.error.message}`);
  }

  revalidatePath("/materias");
}
