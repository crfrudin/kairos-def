import "server-only";

import { headers } from "next/headers";

import { AppHeader } from "./AppHeader";

type HeaderViewModel = {
  userLabel: string;
  emailLabel: string;
};

function buildHeaderViewModelFromHeaders(h: Headers): HeaderViewModel {
  const isAuthenticated = (h.get("x-kairos-is-authenticated") ?? "") === "true";
  const emailConfirmed = (h.get("x-kairos-email-confirmed") ?? "") === "true";

  // OBS: o middleware pode deixar user-id vazio quando não autenticado.
  // Por norma: exibição apenas informativa, sem inferência e sem IO.
  const userLabel = isAuthenticated ? "Usuário autenticado" : "Não autenticado";

  const emailLabel = isAuthenticated
    ? emailConfirmed
      ? "Email confirmado"
      : "Email não confirmado"
    : "—";

  return { userLabel, emailLabel };
}

export async function AppHeaderServer() {
  const h = await headers();
  const vm = buildHeaderViewModelFromHeaders(h);

  return <AppHeader userLabel={vm.userLabel} emailLabel={vm.emailLabel} />;
}
