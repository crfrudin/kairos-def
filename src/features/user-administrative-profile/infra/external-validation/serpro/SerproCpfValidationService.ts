import "server-only";

import type { ICpfValidationService } from "@/features/user-administrative-profile/application/ports/ICpfValidationService";
import { Result } from "@/features/user-administrative-profile/application/ports/Result";

import { HttpClient } from "../_shared/HttpClient";
import { HttpError } from "../_shared/HttpError";
import { SerproOAuthTokenProvider } from "./SerproOAuthTokenProvider";

type CpfLightItem = {
  CPF?: string;
  SituacaoCadastral?: string; // "0" => Regular
  DescSituacaoCadastral?: string; // "Regular"
};

type CpfLightResponse = CpfLightItem[];

function envRequired(name: string): string {
  const v = String(process.env[name] ?? "").trim();
  if (!v) throw new Error(`ENV_REQUIRED:${name}`);
  return v;
}

function envOptional(name: string): string | null {
  const v = String(process.env[name] ?? "").trim();
  return v ? v : null;
}

/**
 * Implementação concreta — ConectaGov / API CPF Light.
 *
 * Contrato do port:
 * - ok(true) => { valid: true }
 * - ok(false) => code CPF_EXTERNAL_INVALID ou CPF_EXTERNAL_UNAVAILABLE
 *
 * LGPD:
 * - Nunca loga CPF.
 * - Não retorna payload bruto.
 */
export class SerproCpfValidationService implements ICpfValidationService {
  private readonly http = new HttpClient();
  private readonly tokenProvider = new SerproOAuthTokenProvider();

  private getBaseUrl(): string {
    // Swagger define prod/homolog — default em homolog por segurança operacional. :contentReference[oaicite:5]{index=5}
    return (
      envOptional("SERPRO_CPF_LIGHT_BASE_URL") ??
      "https://h-apigateway.conectagov.np.estaleiro.serpro.gov.br/api-cpf-light/v2/consulta/cpf"
    );
  }

  public async validateCpf(cpfDigits: string) {
    try {
      const token = await this.tokenProvider.getBearerToken();

      const xCpfUsuario = envRequired("SERPRO_CPF_LIGHT_X_CPF_USUARIO"); // header obrigatório :contentReference[oaicite:6]{index=6}

      const data = await this.http.postJson<CpfLightResponse>(
        this.getBaseUrl(),
        { listaCpf: [cpfDigits] }, // body conforme swagger :contentReference[oaicite:7]{index=7}
        {
          timeoutMs: 6000,
          retries: 1,
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
            "x-cpf-usuario": xCpfUsuario,
          },
        }
      );

      if (!Array.isArray(data) || data.length < 1) {
        throw HttpError.invalidResponse();
      }

      const item = data[0] ?? {};
      const situacao = String(item.SituacaoCadastral ?? "").trim();
      const desc = String(item.DescSituacaoCadastral ?? "").trim().toLowerCase();

      const isRegular = situacao === "0" || desc === "regular";

      if (isRegular) {
        return Result.ok({ valid: true as const });
      }

      return Result.err(
        "CPF_EXTERNAL_INVALID",
        "CPF inválido na validação externa.",
        {
          provider: "CONCTAGOV_CPF_LIGHT",
          reason: "SITUACAO_NAO_REGULAR",
          situacao: situacao || undefined,
        }
      );
    } catch (e: unknown) {
      const details: Record<string, unknown> = { provider: "CONCTAGOV_CPF_LIGHT" };

      if (e instanceof HttpError) {
        details.http = { code: e.code, status: e.status };
      } else if (e instanceof Error) {
        details.cause = e.message;
      }

      return Result.err(
        "CPF_EXTERNAL_UNAVAILABLE",
        "Serviço externo de validação de CPF indisponível.",
        details
      );
    }
  }
}
