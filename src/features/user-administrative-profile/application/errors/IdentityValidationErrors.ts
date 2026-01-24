export type IdentityValidationErrorCode =
  | "CPF_EXTERNAL_INVALID"
  | "CPF_EXTERNAL_UNAVAILABLE"
  | "ADDRESS_EXTERNAL_INVALID"
  | "ADDRESS_EXTERNAL_UNAVAILABLE";

export const IdentityValidationErrors = {
  cpfInvalid(details?: Record<string, unknown>): {
    code: "CPF_EXTERNAL_INVALID";
    message: string;
    details?: Record<string, unknown>;
  } {
    return {
      code: "CPF_EXTERNAL_INVALID",
      message: "CPF inválido na validação externa.",
      details,
    };
  },

  cpfUnavailable(details?: Record<string, unknown>): {
    code: "CPF_EXTERNAL_UNAVAILABLE";
    message: string;
    details?: Record<string, unknown>;
  } {
    return {
      code: "CPF_EXTERNAL_UNAVAILABLE",
      message: "Serviço externo de validação de CPF indisponível.",
      details,
    };
  },

  addressInvalid(details?: Record<string, unknown>): {
    code: "ADDRESS_EXTERNAL_INVALID";
    message: string;
    details?: Record<string, unknown>;
  } {
    return {
      code: "ADDRESS_EXTERNAL_INVALID",
      message: "Endereço inválido na validação externa.",
      details,
    };
  },

  addressUnavailable(details?: Record<string, unknown>): {
    code: "ADDRESS_EXTERNAL_UNAVAILABLE";
    message: string;
    details?: Record<string, unknown>;
  } {
    return {
      code: "ADDRESS_EXTERNAL_UNAVAILABLE",
      message: "Serviço externo de validação de endereço indisponível.",
      details,
    };
  },
} as const;
