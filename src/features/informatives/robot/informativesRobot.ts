import "server-only";

import type { PoolClient } from "pg";

import { getRobotPgPool } from "@/features/informatives/infra/db/pgRobotPool";
import { PgRobotTransaction } from "@/features/informatives/infra/transactions/PgRobotTransaction";

export type Tribunal = "STF" | "STJ" | "TST" | "TSE";

type TribunalConfig = {
  tribunal: Tribunal;
  urlEnv: string;
};

const TRIBUNALS: TribunalConfig[] = [
  { tribunal: "STF", urlEnv: "INFORMATIVES_STF_URL" },
  { tribunal: "STJ", urlEnv: "INFORMATIVES_STJ_URL" },
  { tribunal: "TST", urlEnv: "INFORMATIVES_TST_URL" },
  { tribunal: "TSE", urlEnv: "INFORMATIVES_TSE_URL" },
];

type FetchOk = { ok: true; httpStatus: number; text: string; finalUrl?: string };
type FetchErr = { ok: false; httpStatus: null; error: string; cause?: string };
type FetchResult = FetchOk | FetchErr;

type ParseResult = {
  latest: number | null;
  evidence: string;
  matchText?: string;
  year?: number; // TSE
};

type StjV2Parse = {
  regular: ParseResult; // Informativo nº XXX
  extraordinary: ParseResult; // Edição Extraordinária nº XX
  dataSourceUrl?: string | null;
  tried?: Array<{ url: string; status: number | null }>;
};

function isoDateSaoPauloDay(d: Date): string {
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return fmt.format(d); // YYYY-MM-DD
}

function safeSlice(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max);
}

/**
 * Engenharia/Sec:
 * - Nunca propagar "any" vindo de erros/IO.
 * - Sanitizar e truncar mensagens antes de persistir/logar (evita vazamento de payloads).
 * - Extrair "cause" apenas quando for realmente um Error conhecido.
 */
type ErrorInfo = { message: string; cause?: string };

function isErrorWithCause(e: unknown): e is Error & { cause?: unknown } {
  return e instanceof Error;
}

function normalizeErrorInfo(e: unknown, maxLen = 600): ErrorInfo {
  if (e instanceof Error) {
    const msg = safeSlice(String(e.message ?? "Error"), maxLen);

    let cause: string | undefined;
    const rawCause: unknown = isErrorWithCause(e) ? e.cause : undefined;

    if (rawCause instanceof Error) {
      cause = safeSlice(String(rawCause.message ?? rawCause.name ?? "Cause"), maxLen);
    } else if (typeof rawCause === "string") {
      cause = safeSlice(rawCause, maxLen);
    } else if (typeof rawCause === "number" || typeof rawCause === "boolean" || typeof rawCause === "bigint") {
      cause = safeSlice(String(rawCause), maxLen);
    } else if (rawCause && typeof rawCause === "object") {
      // Evita vazar objeto inteiro; só um marcador seguro
      cause = "Cause:object";
    }

    return { message: msg, cause };
  }

  return { message: safeSlice(String(e), maxLen) };
}


async function insertRunOrSkip(client: PoolClient, runDay: string) {
  try {
    const r = await client.query(
      `insert into public.informative_robot_runs (run_day, status, details)
       values ($1::date, 'STARTED', $2::jsonb)
       returning id`,
      [runDay, JSON.stringify({ runDay, stage: "STARTED" })]
    );
    return { inserted: true, runId: String(r.rows[0].id) } as const;
  } catch (e: unknown) {
  const info = normalizeErrorInfo(e);
  const msg = info.message;
    if (msg.toLowerCase().includes("informative_robot_runs_unique_day") || msg.toLowerCase().includes("duplicate key")) {
      return { inserted: false, runId: null } as const;
    }
    throw e;
  }
}

async function finalizeRun(
  client: PoolClient,
  runId: string,
  status: "SUCCESS" | "FAILED" | "SKIPPED",
  details: unknown,
  errorMessage?: string
) {
  await client.query(
    `update public.informative_robot_runs
     set finished_at = now(),
         status = $2,
         details = $3::jsonb,
         error_message = $4
     where id = $1`,
[runId, status, safeJsonStringifyDetails(details), errorMessage ?? null]  );
}

async function upsertLatestRegular(client: PoolClient, tribunal: Tribunal, latest: number, source: string, checkedDay: string) {
  await client.query(
    `insert into public.informative_latest_by_tribunal (tribunal, latest_available_number, source, checked_day, checked_at)
     values ($1, $2, $3, $4::date, now())
     on conflict (tribunal) do update set
       latest_available_number = excluded.latest_available_number,
       source = excluded.source,
       checked_day = excluded.checked_day,
       checked_at = excluded.checked_at`,
    [tribunal, latest, source, checkedDay]
  );
}

async function upsertLatestExtraordinaryStj(client: PoolClient, latest: number, source: string, checkedDay: string) {
  await client.query(
    `insert into public.informative_latest_extraordinary_by_tribunal (tribunal, latest_available_number, source, checked_day, checked_at)
     values ('STJ', $1, $2, $3::date, now())
     on conflict (tribunal) do update set
       latest_available_number = excluded.latest_available_number,
       source = excluded.source,
       checked_day = excluded.checked_day,
       checked_at = excluded.checked_at`,
    [latest, source, checkedDay]
  );
}

function withTimeout(ms: number) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  return { signal: ctrl.signal, clear: () => clearTimeout(t) };
}

function browserLikeHeaders(origin: string) {
  return {
    "user-agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
    "cache-control": "no-cache",
    pragma: "no-cache",
    "upgrade-insecure-requests": "1",
    referer: origin,
  } as const;
}

async function fetchHtml(params: { url: string; timeoutMs: number }): Promise<FetchResult> {
  const t = withTimeout(params.timeoutMs);
  try {
    const res = await fetch(params.url, {
      method: "GET",
      cache: "no-store",
      signal: t.signal,
      headers: browserLikeHeaders(new URL(params.url).origin),
      redirect: "follow",
    });

    const text = await res.text();
    return { ok: true, httpStatus: res.status, text, finalUrl: res.url };
  } catch (e: unknown) {
  const info = normalizeErrorInfo(e);
  const name = e instanceof Error ? e.name : "Error";
  return {
    ok: false,
    httpStatus: null,
    error: `FETCH_ERROR: ${name}: ${info.message}`,
    cause: info.cause,
  };
  } finally {
    t.clear();
  }
}

function parseLatestSTF(html: string): ParseResult {
  const re = /última\s+ediç(?:a|ã)o:\s*(\d{1,6})\s*\/\s*\d{4}/i;
  const m = html.match(re);
  if (!m) return { latest: null, evidence: "no-match: STF ultima edicao" };
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return { latest: null, evidence: "invalid-number: STF", matchText: m[0] };
  return { latest: n, evidence: `match=ultima_edicao ${n}`, matchText: m[0] };
}

function parseLatestTST(html: string): ParseResult {
  const re = /informativo\s+tst\s*:\s*n\.?\s*(\d{1,6})/i;
  const m = html.match(re);
  if (!m) return { latest: null, evidence: "no-match: TST informativo n" };
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return { latest: null, evidence: "invalid-number: TST", matchText: m[0] };
  return { latest: n, evidence: `match=informativo_tst_n ${n}`, matchText: m[0] };
}

function parseLatestTSE(html: string): ParseResult {
  const re = /informativo\s+tse\s+n[ºo]\s*(\d{1,6})\s+ano\s+(\d{1,3})/i;
  const m = html.match(re);
  if (!m) return { latest: null, evidence: "no-match: TSE n ano" };

  const n = Number(m[1]);
  const year = Number(m[2]);

  if (!Number.isFinite(n)) return { latest: null, evidence: "invalid-number: TSE", matchText: m[0] };

  const ev = Number.isFinite(year) ? `match=tse_n_ano n=${n} ano=${year}` : `match=tse_n_ano n=${n}`;
  return { latest: n, evidence: ev, matchText: m[0], year: Number.isFinite(year) ? year : undefined };
}

function parseByTribunal(tribunal: Tribunal, html: string): ParseResult {
  if (tribunal === "STF") return parseLatestSTF(html);
  if (tribunal === "TST") return parseLatestTST(html);
  if (tribunal === "TSE") return parseLatestTSE(html);
  return { latest: null, evidence: "no-parser" };
}

/**
 * STJ V2:
 * - O site é (muitas vezes) renderizado via JS. Então:
 *   1) tenta casar números no HTML bruto (incluindo entidades)
 *   2) tenta casar no HTML "limpo/normalizado"
 *   3) se ainda falhar, tenta descobrir endpoints candidatos dentro do HTML e buscar (limitado) para extrair números
 */

function extractCandidateStjDataUrls(pageUrl: string, html: string): string[] {
  const base = new URL(pageUrl);

  const raw: string[] = [];
  const re = /["'`](\/[^"'`]+|https?:\/\/[^"'`]+)["'`]/gi;
  let m: RegExpExecArray | null;

  while ((m = re.exec(html)) !== null) {
    const s = m[1];
    if (!s) continue;

    const low = s.toLowerCase();

    // Heurística: endpoints e assets que costumam carregar dados
    const looksRelevant =
      low.includes("informativo") ||
      low.includes("jurisprudencia") ||
      low.includes("externo") ||
      low.includes("/api") ||
      low.includes("rest") ||
      low.endsWith(".json") ||
      low.includes("siteassets");

    if (!looksRelevant) continue;

    try {
      raw.push(new URL(s, base).toString());
    } catch {
      // ignore
    }
  }

  const uniq = Array.from(new Set(raw));

  const score = (u: string) => {
    const low = u.toLowerCase();
    let s = 0;
    if (low.includes("api")) s += 6;
    if (low.includes("rest")) s += 5;
    if (low.endsWith(".json")) s += 5;
    if (low.includes("informativo")) s += 4;
    if (low.includes("externo")) s += 3;
    if (low.includes("jurisprudencia")) s += 2;
    if (low.includes("siteassets")) s += 1;
    return s;
  };

  return uniq.sort((a, b) => score(b) - score(a));
}

function parseStjNumbersFromAnyText(text: string): { regular: ParseResult; extraordinary: ParseResult } {
  const cleaned = String(text).replace(/\s+/g, " ").trim();

  // Atom feed do STJ costuma conter IDs tipo INFJ0874 e INFJ0029E
  const looksLikeAtom = cleaned.includes("<feed") && cleaned.includes("INFJ");

  if (looksLikeAtom) {
    const idRe = /INFJ(\d{1,6})(E)?/gi;

    let maxRegular: number | null = null;
    let maxExtra: number | null = null;
    let countRegular = 0;
    let countExtra = 0;

    let m: RegExpExecArray | null;
    while ((m = idRe.exec(cleaned)) !== null) {
      const n = Number(m[1]);
      if (!Number.isFinite(n)) continue;

      const isExtra = Boolean(m[2]);
      if (isExtra) {
        countExtra++;
        if (maxExtra === null || n > maxExtra) maxExtra = n;
      } else {
        countRegular++;
        if (maxRegular === null || n > maxRegular) maxRegular = n;
      }
    }

    return {
      regular:
        maxRegular === null
          ? { latest: null, evidence: "no-regular: STJ (atom feed)" }
          : { latest: maxRegular, evidence: `match=stj_regular_atom max=${maxRegular} count=${countRegular}` },
      extraordinary:
        maxExtra === null
          ? { latest: null, evidence: "no-extra: STJ (atom feed)" }
          : { latest: maxExtra, evidence: `match=stj_extra_atom max=${maxExtra} count=${countExtra}` },
    };
  }

  // Fallback (texto comum / HTML): mantém o comportamento anterior
  const decoded = String(text)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/?[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&ordm;/gi, "º")
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hx) => String.fromCharCode(parseInt(hx, 16)))
    .replace(/&[a-zA-Z]+;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const norm = decoded.toLowerCase().normalize("NFD").replace(/\p{Diacritic}+/gu, "");

  const regularRe = /informativo\s+n\.?\s*(?:º|o)?\s*(\d{1,6})/gi;
  const extraRe = /edicao\s+extraordinaria\s+n\.?\s*(?:º|o)?\s*(\d{1,6})/gi;

  const pickMax = (re: RegExp, src: string) => {
    let latest: number | null = null;
    let count = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(src)) !== null) {
      const n = Number(m[1]);
      if (!Number.isFinite(n)) continue;
      count++;
      if (latest === null || n > latest) latest = n;
    }
    return { latest, count };
  };

  const r = pickMax(regularRe, norm);
  const e = pickMax(extraRe, norm);

  return {
    regular:
      r.latest === null
        ? { latest: null, evidence: "no-match: STJ regular (data)" }
        : { latest: r.latest, evidence: `match=stj_regular_data max=${r.latest} matches=${r.count}` },
    extraordinary:
      e.latest === null
        ? { latest: null, evidence: "no-match: STJ extraordinary (data)" }
        : { latest: e.latest, evidence: `match=stj_extra_data max=${e.latest} matches=${e.count}` },
  };
}


async function parseStjV2(params: { stjUrl: string; debug: boolean }): Promise<StjV2Parse> {
  // V2 otimizada: vai direto nas fontes que já funcionaram (2 requests) e só depois tenta o fallback.
  const preferredSources = [
    "https://ww2.stj.jus.br/jurisprudencia/externo/InformativoFeed",
    "https://ww2.stj.jus.br/jurisprudencia/externo/informativo/?aplicacao=informativo.ea",
  ] as const;

  const tried: Array<{ url: string; status: number | null }> = [];

  let bestRegular: ParseResult = { latest: null, evidence: "no-match: STJ regular (data)" };
  let bestExtra: ParseResult = { latest: null, evidence: "no-match: STJ extraordinary (data)" };
  let bestRegularUrl: string | null = null;
  let bestExtraUrl: string | null = null;

  for (const u of preferredSources) {
    const r = await fetchHtml({ url: u, timeoutMs: 15000 });
    tried.push({ url: u, status: r.ok ? r.httpStatus : null });

    if (!r.ok) continue;
    if (r.httpStatus < 200 || r.httpStatus >= 300) continue;

    const parsed = parseStjNumbersFromAnyText(r.text);

    if (parsed.regular.latest !== null) {
      const cur = bestRegular.latest ?? -1;
      if (parsed.regular.latest > cur) {
        bestRegular = parsed.regular;
        bestRegularUrl = u;
      }
    }

    if (parsed.extraordinary.latest !== null) {
      const cur = bestExtra.latest ?? -1;
      if (parsed.extraordinary.latest > cur) {
        bestExtra = parsed.extraordinary;
        bestExtraUrl = u;
      }
    }

    // Se já achou ambos, para cedo (mais rápido)
    if (bestRegular.latest !== null && bestExtra.latest !== null) break;
  }

  const any = bestRegular.latest !== null || bestExtra.latest !== null;

  if (any) {
    return {
      regular: bestRegular.latest !== null ? bestRegular : { latest: null, evidence: "no-match: STJ regular (data)" },
      extraordinary:
        bestExtra.latest !== null ? bestExtra : { latest: null, evidence: "no-match: STJ extraordinary (data)" },
      dataSourceUrl: bestExtraUrl ?? bestRegularUrl ?? preferredSources[0],
      tried: params.debug ? tried : undefined,
    };
  }

  // Fallback (raríssimo): tenta a página original e extração de candidatos, mas com limite menor.
  const htmlRes = await fetchHtml({ url: params.stjUrl, timeoutMs: 15000 });
  if (!htmlRes.ok || htmlRes.httpStatus < 200 || htmlRes.httpStatus >= 300) {
    return {
      regular: { latest: null, evidence: "stj-html-fetch-failed" },
      extraordinary: { latest: null, evidence: "stj-html-fetch-failed" },
      dataSourceUrl: null,
      tried: params.debug ? tried : undefined,
    };
  }

  const pageUrl = htmlRes.finalUrl ?? params.stjUrl;
  const candidates = extractCandidateStjDataUrls(pageUrl, htmlRes.text);

  for (const u of candidates.slice(0, 3)) {
    const r = await fetchHtml({ url: u, timeoutMs: 15000 });
    tried.push({ url: u, status: r.ok ? r.httpStatus : null });

    if (!r.ok) continue;
    if (r.httpStatus < 200 || r.httpStatus >= 300) continue;

    const parsed = parseStjNumbersFromAnyText(r.text);

    if (parsed.regular.latest !== null && (bestRegular.latest === null || parsed.regular.latest > bestRegular.latest)) {
      bestRegular = parsed.regular;
      bestRegularUrl = u;
    }

    if (parsed.extraordinary.latest !== null && (bestExtra.latest === null || parsed.extraordinary.latest > bestExtra.latest)) {
      bestExtra = parsed.extraordinary;
      bestExtraUrl = u;
    }

    if (bestRegular.latest !== null && bestExtra.latest !== null) break;
  }

  const any2 = bestRegular.latest !== null || bestExtra.latest !== null;

  return {
    regular: any2 ? bestRegular : { latest: null, evidence: "no-match: STJ regular (HTML+data)" },
    extraordinary: any2 ? bestExtra : { latest: null, evidence: "no-match: STJ extraordinary (HTML+data)" },
    dataSourceUrl: bestExtraUrl ?? bestRegularUrl ?? null,
    tried: params.debug ? tried : undefined,
  };
}

type RobotDetails = {
  runDay: string;
  debug: boolean;
  persisted: boolean;
  tribunals: Record<string, unknown>;
};

type RobotRunResult =
  | { ok: true; skipped: true; reason: "ALREADY_RAN_TODAY"; runDay: string; persisted: true }
  | { ok: true; skipped: false; runDay: string; details: RobotDetails; persisted: boolean }
  | { ok: false; skipped: false; runDay: string; errorMessage: string; details: RobotDetails; persisted: boolean };

async function runRobotOnce(params: { tribunals?: Tribunal[]; debug?: boolean; persist: boolean }): Promise<RobotRunResult> {
  const selected = params.tribunals?.length
    ? TRIBUNALS.filter((t) => (params.tribunals as Tribunal[]).includes(t.tribunal))
    : TRIBUNALS;

  const now = new Date();
  const runDay = isoDateSaoPauloDay(now);

  const details: RobotDetails = {
  runDay,
  debug: Boolean(params.debug),
  persisted: Boolean(params.persist),
  tribunals: {},
};

  const executeCore = async (clientOrNull: PoolClient | null) => {
    for (const t of selected) {
      const url = process.env[t.urlEnv];
      if (!url) {
        details.tribunals[t.tribunal] = { ok: false, error: `Missing env ${t.urlEnv}` };
        continue;
      }

      // STJ V2: (regular + extraordinário) com fallback para fontes de dados
      if (t.tribunal === "STJ") {
        try {
          const stj = await parseStjV2({ stjUrl: url, debug: Boolean(params.debug) });

          details.tribunals.STJ = {
            ok: stj.regular.latest !== null || stj.extraordinary.latest !== null,
            url,
            httpStatus: 200,
            stjV2: {
              regular: stj.regular,
              extraordinary: stj.extraordinary,
              dataSourceUrl: stj.dataSourceUrl ?? null,
              tried: params.debug ? stj.tried ?? [] : undefined,
            },
          };

          if (params.debug) {
            // ajuda visual: preview curta do HTML só para diagnóstico (sem vazar demais)
            const pageRes = await fetchHtml({ url, timeoutMs: 15000 });
            if (pageRes.ok && pageRes.httpStatus >= 200 && pageRes.httpStatus < 300) {
              details.tribunals.STJ.htmlPreview = safeSlice(pageRes.text, 2000);
            }
          }

          if (params.persist && clientOrNull) {
            // tabela atual recebe REGULAR (não quebra dashboard)
            if (stj.regular.latest !== null) {
              await upsertLatestRegular(clientOrNull, "STJ", stj.regular.latest, url, runDay);
            }
            // tabela nova recebe EXTRAORDINÁRIO
            if (stj.extraordinary.latest !== null) {
              await upsertLatestExtraordinaryStj(clientOrNull, stj.extraordinary.latest, url, runDay);
            }
          }

          continue;
        } catch (e: unknown) {
  const info = normalizeErrorInfo(e);
  details.tribunals.STJ = {
    ok: false,
    url,
    error: "STJ_V2_FAILED",
    cause: info.message,
  };
  continue;
}

      }

      // Demais tribunais: fetch HTML + parse regex
      const fetchRes = await fetchHtml({ url, timeoutMs: 15000 });
      if (!fetchRes.ok) {
        details.tribunals[t.tribunal] = {
          ok: false,
          url,
          error: fetchRes.error,
          cause: fetchRes.cause,
          timeoutMs: 15000,
        };
        continue;
      }

      const httpStatus = fetchRes.httpStatus;
      if (httpStatus < 200 || httpStatus >= 300) {
        details.tribunals[t.tribunal] = { ok: false, url, httpStatus, error: `HTTP_${httpStatus}` };
        continue;
      }

      const html = fetchRes.text;
      const extracted = parseByTribunal(t.tribunal, html);

      if (extracted.latest === null) {
        details.tribunals[t.tribunal] = {
          ok: false,
          url,
          httpStatus,
          extracted: extracted.evidence,
          matchText: extracted.matchText ?? null,
        };
        if (params.debug) details.tribunals[t.tribunal].htmlPreview = safeSlice(html, 2500);
        continue;
      }

      if (params.persist) {
        if (!clientOrNull) throw new Error("Invariant: persist=true requires DB client.");
        await upsertLatestRegular(clientOrNull, t.tribunal, extracted.latest, url, runDay);
      }

      details.tribunals[t.tribunal] = {
        ok: true,
        url,
        httpStatus,
        latest: extracted.latest,
        evidence: extracted.evidence,
        matchText: extracted.matchText ?? null,
        year: extracted.year ?? undefined,
      };

      if (params.debug) details.tribunals[t.tribunal].htmlPreview = safeSlice(html, 2500);
    }
  };

  // DEBUG: roda N vezes e NÃO persiste (nem guarda run_day)
  if (!params.persist) {
    try {
      await executeCore(null);
      return { ok: true, skipped: false, runDay, details, persisted: false };
    } catch (e: unknown) {
  const info = normalizeErrorInfo(e);
  return { ok: false, skipped: false, runDay, errorMessage: info.message, details, persisted: false };
}
  }

  // PROD: DB + guard diário (1x/dia)
  const tx = new PgRobotTransaction(getRobotPgPool());
  return tx.runInTransaction(async (client) => {
    const run = await insertRunOrSkip(client, runDay);

    if (!run.inserted) {
      return { ok: true, skipped: true, reason: "ALREADY_RAN_TODAY", runDay, persisted: true };
    }

    try {
      await executeCore(client);
      await finalizeRun(client, run.runId!, "SUCCESS", details);
      return { ok: true, skipped: false, runDay, details, persisted: true };
    } catch (e: unknown) {
  const info = normalizeErrorInfo(e);
  await finalizeRun(client, run.runId!, "FAILED", details, info.message);
  return { ok: false, skipped: false, runDay, errorMessage: info.message, details, persisted: true };
}
  });
}

export async function runInformativesRobot(params: { tribunals?: Tribunal[]; debug?: boolean }) {
  // Opção 1:
  // - debug: roda N vezes e NÃO persiste (nem guard diário).
  // - normal: persiste e respeita guard 1x/dia.
  const isDebug = Boolean(params.debug);
  return runRobotOnce({ tribunals: params.tribunals, debug: isDebug, persist: !isDebug });
}