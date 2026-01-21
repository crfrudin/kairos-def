"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { createSubjectsSsrComposition } from "@/core/composition/subjects.ssr.composition";

export async function replaceOrderAction(fd: FormData) {
  const h = await headers();
  const userId = h.get("x-kairos-user-id") ?? "";
  if (!userId) throw new Error("Missing authenticated user claim (x-kairos-user-id).");

  const raw = fd.getAll("subject_id").map(String).filter(Boolean);

  // Ordem explícita: o formulário envia a lista já ordenada.
  const { replaceSubjectOrderUseCase } = createSubjectsSsrComposition({ userId });
  const res = await replaceSubjectOrderUseCase.execute({ userId, orderedSubjectIds: raw });

  if (!res.ok) throw new Error(`${res.error.code}: ${res.error.message}`);

  revalidatePath("/materias/ordem");
  revalidatePath("/materias");
}
