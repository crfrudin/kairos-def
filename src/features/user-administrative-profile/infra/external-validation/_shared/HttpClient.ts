import { HttpError } from "./HttpError";

export interface HttpRequestOptions {
  timeoutMs: number;
  retries: number; // número de retries após a primeira tentativa
  headers?: Record<string, string>;
}

async function safeJson(res: Response): Promise<unknown> {
  try {
    return await res.json();
  } catch {
    throw HttpError.invalidResponse();
  }
}

export class HttpClient {
  public async getJson<T>(url: string, options: HttpRequestOptions): Promise<T> {
    return this.requestJson<T>("GET", url, undefined, options);
  }

  public async postFormUrlEncoded<T>(
    url: string,
    body: Record<string, string>,
    options: HttpRequestOptions
  ): Promise<T> {
    const form = new URLSearchParams();
    for (const [k, v] of Object.entries(body)) form.set(k, v);

    const headers = {
      "Content-Type": "application/x-www-form-urlencoded",
      ...(options.headers ?? {}),
    };

    return this.requestJson<T>("POST", url, form.toString(), {
      ...options,
      headers,
    });
  }

  public async postJson<T>(url: string, body: unknown, options: HttpRequestOptions): Promise<T> {
    const headers = {
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    };

    return this.requestJson<T>("POST", url, JSON.stringify(body), {
      ...options,
      headers,
    });
  }

  private async requestJson<T>(
    method: "GET" | "POST",
    url: string,
    body: string | undefined,
    options: HttpRequestOptions
  ): Promise<T> {
    const attempts = 1 + Math.max(0, options.retries);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), options.timeoutMs);

      try {
        const res = await fetch(url, {
          method,
          headers: options.headers,
          body,
          signal: controller.signal,
        });

        if (!res.ok) {
          throw HttpError.unavailable(res.status);
        }

        const json = await safeJson(res);
        return json as T;
      } catch (err: any) {
        if (err?.name === "AbortError") {
          if (attempt === attempts) throw HttpError.timeout();
        } else if (err instanceof HttpError) {
          if (attempt === attempts) throw err;
        } else {
          if (attempt === attempts) throw HttpError.unavailable();
        }
      } finally {
        clearTimeout(timer);
      }
    }

    throw HttpError.unavailable();
  }
}
