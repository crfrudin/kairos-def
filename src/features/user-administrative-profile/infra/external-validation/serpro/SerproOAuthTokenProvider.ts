import "server-only";

import { HttpClient } from "../_shared/HttpClient";
import { HttpError } from "../_shared/HttpError";

type TokenResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
};

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
 * Token provider (server-only).
 * - ConectaGov OAuth2 (jwt-token) — client_credentials + Basic.
 * - Cache in-memory por processo.
 * - Nunca loga segredo.
 */
export class SerproOAuthTokenProvider {
  private readonly http = new HttpClient();
  private cachedToken: { token: string; expiresAtEpochMs: number } | null = null;

  private getTokenUrl(): string {
    // Swagger: /oauth2/jwt-token (prod e homolog) :contentReference[oaicite:2]{index=2}
    return (
      envOptional("SERPRO_CPF_LIGHT_TOKEN_URL") ??
      "https://h-apigateway.conectagov.np.estaleiro.serpro.gov.br/oauth2/jwt-token"
    );
  }

  public async getBearerToken(): Promise<string> {
    const now = Date.now();
    if (this.cachedToken && now < this.cachedToken.expiresAtEpochMs) {
      return this.cachedToken.token;
    }

    const consumerKey = envRequired("SERPRO_CONSUMER_KEY");
    const consumerSecret = envRequired("SERPRO_CONSUMER_SECRET");

    const basic = Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64");

    const data = await this.http.postFormUrlEncoded<TokenResponse>(
      this.getTokenUrl(),
      { grant_type: "client_credentials" },
      {
        timeoutMs: 5000,
        retries: 1,
        headers: {
          Authorization: `Basic ${basic}`,
          Accept: "application/json",
        },
      }
    );

    const token = String(data.access_token ?? "").trim();
    const expiresIn = Number(data.expires_in ?? 0);

    if (!token || !Number.isFinite(expiresIn) || expiresIn <= 0) {
      throw HttpError.invalidResponse();
    }

    // margem: renova 60s antes de expirar
    const safetyMs = 60_000;
    const expiresAt = Date.now() + Math.max(0, expiresIn * 1000 - safetyMs);

    this.cachedToken = { token, expiresAtEpochMs: expiresAt };
    return token;
  }
}
