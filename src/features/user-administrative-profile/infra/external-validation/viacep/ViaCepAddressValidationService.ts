import "server-only";

import type { IAddressValidationService } from "@/features/user-administrative-profile/application/ports/IAddressValidationService";
import { Result } from "@/features/user-administrative-profile/application/ports/Result";
import type { ValidatedAddressInput } from "@/features/user-administrative-profile/domain/value-objects/ValidatedAddress";

import { HttpClient } from "../_shared/HttpClient";
import { HttpError } from "../_shared/HttpError";

type ViaCepResponse = {
  cep?: string;
  uf?: string;
  localidade?: string;
  erro?: boolean;
};

function normalizeCepDigits(v: unknown): string {
  return String(v ?? "").replace(/\D/g, "");
}

function normalizeUpper(v: unknown): string {
  return String(v ?? "").trim().toUpperCase();
}

function normalizeCity(v: unknown): string {
  return String(v ?? "").trim().toLowerCase();
}

/**
 * ViaCEP — validação externa de endereço (CEP).
 *
 * Regras:
 * - chama ViaCEP por CEP digits-only
 * - se "erro" ou campos essenciais ausentes => INVALID
 * - se input fornecer UF/cidade => compara com ViaCEP (sem inferência)
 * - nunca retorna payload bruto
 */
export class ViaCepAddressValidationService implements IAddressValidationService {
  private readonly http = new HttpClient();

  public async validateAddress(address: ValidatedAddressInput) {
    try {
      const cepDigits = normalizeCepDigits((address as any).cep);

      if (cepDigits.length !== 8) {
        return Result.err(
          "ADDRESS_EXTERNAL_INVALID",
          "Endereço inválido na validação externa.",
          { provider: "VIACEP", reason: "CEP_LENGTH_INVALID" }
        );
      }

      const data = await this.http.getJson<ViaCepResponse>(
        `https://viacep.com.br/ws/${cepDigits}/json/`,
        { timeoutMs: 3000, retries: 1, headers: { Accept: "application/json" } }
      );

      if (!data || data.erro || !data.cep || !data.uf || !data.localidade) {
        return Result.err(
          "ADDRESS_EXTERNAL_INVALID",
          "Endereço inválido na validação externa.",
          { provider: "VIACEP", reason: "CEP_NOT_FOUND_OR_INVALID" }
        );
      }

      const inputUf = normalizeUpper((address as any).uf);
      const inputCity = normalizeCity((address as any).city);

      const extUf = normalizeUpper(data.uf);
      const extCity = normalizeCity(data.localidade);

      if (inputUf && inputUf !== extUf) {
        return Result.err(
          "ADDRESS_EXTERNAL_INVALID",
          "Endereço inválido na validação externa.",
          { provider: "VIACEP", reason: "UF_MISMATCH" }
        );
      }

      if (inputCity && inputCity !== extCity) {
        return Result.err(
          "ADDRESS_EXTERNAL_INVALID",
          "Endereço inválido na validação externa.",
          { provider: "VIACEP", reason: "CITY_MISMATCH" }
        );
      }

      return Result.ok({ valid: true as const });
    } catch (e: unknown) {
      const details: Record<string, unknown> = { provider: "VIACEP" };

      if (e instanceof HttpError) {
        details.http = { code: e.code, status: e.status };
      } else if (e instanceof Error) {
        details.cause = e.message;
      }

      return Result.err(
        "ADDRESS_EXTERNAL_UNAVAILABLE",
        "Serviço externo de validação de endereço indisponível.",
        details
      );
    }
  }
}
