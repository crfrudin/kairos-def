/**
 * Controller hook da UI.
 *
 * BLOCO 6.1:
 * - placeholder
 *
 * BLOCO 6.2:
 * - aqui chamaremos GetProfile/UpdateProfile via Public API da feature profile
 * - lidaremos com loading/error/success, sem "corrigir" estado inválido
 */
export function useProfileEditController() {
  return {
    isLoading: false,
    // data virá do GetProfile
    data: null as unknown,
    // submit chamará UpdateProfile
    submit: async (_input: unknown) => {
      return { ok: false, blockingErrors: ['NOT_IMPLEMENTED'] } as const;
    },
  };
}
