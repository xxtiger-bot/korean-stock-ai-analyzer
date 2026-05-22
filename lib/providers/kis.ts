import "server-only";

import type { ForeignOwnershipData, RealtimeQuote } from "@/lib/types";

type KisTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
};

type KisRealtimeOutput = {
  [key: string]: unknown;
  stck_shrn_iscd?: string;
  stck_prpr?: string;
  prdy_vrss?: string;
  prdy_vrss_sign?: string;
  prdy_ctrt?: string;
  acml_vol?: string;
  stck_bsop_date?: string;
  stck_cntg_hour?: string;
};

type KisRealtimeResponse = {
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
  output?: KisRealtimeOutput;
  output1?: KisRealtimeOutput;
};

type KisAccessTokenCacheState = {
  token: string | null;
  issuedAt: number | null;
  expiresAt: number | null;
  lastTokenRequestAt: number | null;
  lastTokenError: string | null;
  lastTokenHttpStatus: number | null;
  lastTokenRtCd: string | null;
  lastTokenMsgCd: string | null;
  lastTokenMsg1: string | null;
  lastTokenReused: boolean;
};

type KisQuotePayload = {
  normalizedCode: string;
  requestTime: Date;
  output: KisRealtimeOutput;
};

type KisQuoteCacheState = {
  symbol: string;
  quote: RealtimeQuote | null;
  output: KisRealtimeOutput | null;
  updatedAt: number | null;
  expiresAt: number | null;
  lastQuoteRequestAt: number | null;
  lastQuoteError: string | null;
  lastQuoteHttpStatus: number | null;
  lastQuoteRtCd: string | null;
  lastQuoteMsgCd: string | null;
  lastQuoteMsg1: string | null;
  quoteReused: boolean;
  quoteRateLimited: boolean;
};

type KisQuoteRuntimeState = {
  cacheBySymbol: Map<string, KisQuoteCacheState>;
  inFlightBySymbol: Map<string, Promise<KisQuotePayload | null>>;
  queue: Promise<void>;
  lastGlobalQuoteRequestAt: number | null;
  quoteRateLimitedUntil: number | null;
};

export type KisTokenCacheSnapshot = {
  tokenCache: "있음" | "없음";
  issuedAt: string | null;
  expiresAt: string | null;
  lastTokenRequestAt: string | null;
  lastTokenError: string | null;
  lastTokenHttpStatus: number | null;
  lastTokenRtCd: string | null;
  lastTokenMsgCd: string | null;
  lastTokenMsg1: string | null;
  tokenReused: boolean;
};

export type KisQuoteCacheSnapshot = {
  symbol: string;
  quoteCache: "있음" | "없음";
  updatedAt: string | null;
  expiresAt: string | null;
  lastQuoteRequestAt: string | null;
  lastQuoteError: string | null;
  lastQuoteHttpStatus: number | null;
  lastQuoteRtCd: string | null;
  lastQuoteMsgCd: string | null;
  lastQuoteMsg1: string | null;
  quoteReused: boolean;
  quoteRateLimited: boolean;
  secondsUntilNextQuoteRequest: number;
};

const TOKEN_REQUEST_COOLDOWN_MS = 60_000;
const TOKEN_REUSE_BUFFER_MS = 60_000;
const TOKEN_RATE_LIMIT_CODE = "EGW00133";
const TOKEN_LIMIT_MESSAGE = "KIS token 발급 제한 중입니다. 1분 후 다시 시도해주세요.";

const QUOTE_CACHE_TTL_MS = 20_000;
const QUOTE_MIN_INTERVAL_MS = 1_200;
const QUOTE_RATE_LIMIT_CODE = "EGW00201";
const QUOTE_RATE_LIMIT_COOLDOWN_MS = 20_000;
const QUOTE_RATE_LIMIT_MESSAGE = "KIS 초당 요청 제한을 초과했습니다. 잠시 후 다시 시도해주세요.";

const globalForKis = globalThis as typeof globalThis & {
  __kisRealtimeWarnings?: Set<string>;
  __kisAccessTokenCache?: KisAccessTokenCacheState;
  __kisQuoteRuntime?: KisQuoteRuntimeState;
};

class KisQuoteRequestError extends Error {
  status: number | null;
  rtCd: string | null;
  msgCd: string | null;
  msg1: string | null;
  detail: string | null;
  isRateLimited: boolean;

  constructor(
    message: string,
    options: {
      status?: number | null;
      rtCd?: string | null;
      msgCd?: string | null;
      msg1?: string | null;
      detail?: string | null;
      isRateLimited?: boolean;
    } = {}
  ) {
    super(message);
    this.name = "KisQuoteRequestError";
    this.status = options.status ?? null;
    this.rtCd = options.rtCd ?? null;
    this.msgCd = options.msgCd ?? null;
    this.msg1 = options.msg1 ?? null;
    this.detail = options.detail ?? null;
    this.isRateLimited = options.isRateLimited ?? false;
  }
}

const kisWarnings =
  globalForKis.__kisRealtimeWarnings ?? (globalForKis.__kisRealtimeWarnings = new Set());

function warnOnce(key: string, message: string) {
  if (kisWarnings.has(key)) return;
  kisWarnings.add(key);
  console.warn(message);
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, "");
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string" || !value.trim()) return 0;
  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
}

function toNullableNumber(value: unknown) {
  const parsed = toNumber(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toSignedChange(change: number, signCode: string | undefined) {
  if (!Number.isFinite(change) || change === 0) return 0;
  if (signCode === "5") return -Math.abs(change);
  if (signCode === "2") return Math.abs(change);
  return change;
}

function withTimeout(ms: number) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), ms);

  return {
    signal: controller.signal,
    done() {
      clearTimeout(timeout);
    }
  };
}

function sleep(ms: number) {
  if (ms <= 0) return Promise.resolve();
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function toIso(value: number | null) {
  if (!Number.isFinite(value ?? NaN) || value === null) return null;
  return new Date(value).toISOString();
}

function getKisConfig() {
  const appKey = process.env.KIS_APP_KEY?.trim();
  const appSecret = process.env.KIS_APP_SECRET?.trim();
  const rawBaseUrl = process.env.KIS_BASE_URL?.trim();

  if (!appKey || !appSecret || !rawBaseUrl) {
    return null;
  }

  return {
    appKey,
    appSecret,
    baseUrl: normalizeBaseUrl(rawBaseUrl)
  };
}

function createEmptyTokenCacheState(): KisAccessTokenCacheState {
  return {
    token: null,
    issuedAt: null,
    expiresAt: null,
    lastTokenRequestAt: null,
    lastTokenError: null,
    lastTokenHttpStatus: null,
    lastTokenRtCd: null,
    lastTokenMsgCd: null,
    lastTokenMsg1: null,
    lastTokenReused: false
  };
}

function getTokenCacheState() {
  if (!globalForKis.__kisAccessTokenCache) {
    globalForKis.__kisAccessTokenCache = createEmptyTokenCacheState();
  }
  return globalForKis.__kisAccessTokenCache;
}

function createQuoteRuntimeState(): KisQuoteRuntimeState {
  return {
    cacheBySymbol: new Map<string, KisQuoteCacheState>(),
    inFlightBySymbol: new Map<string, Promise<KisQuotePayload | null>>(),
    queue: Promise.resolve(),
    lastGlobalQuoteRequestAt: null,
    quoteRateLimitedUntil: null
  };
}

function getQuoteRuntimeState() {
  if (!globalForKis.__kisQuoteRuntime) {
    globalForKis.__kisQuoteRuntime = createQuoteRuntimeState();
  }
  return globalForKis.__kisQuoteRuntime;
}

function createQuoteCacheState(symbol: string): KisQuoteCacheState {
  return {
    symbol,
    quote: null,
    output: null,
    updatedAt: null,
    expiresAt: null,
    lastQuoteRequestAt: null,
    lastQuoteError: null,
    lastQuoteHttpStatus: null,
    lastQuoteRtCd: null,
    lastQuoteMsgCd: null,
    lastQuoteMsg1: null,
    quoteReused: false,
    quoteRateLimited: false
  };
}

function getQuoteCacheState(symbol: string) {
  const runtime = getQuoteRuntimeState();
  const normalized = normalizeCode(symbol);
  const existing = runtime.cacheBySymbol.get(normalized);
  if (existing) {
    return existing;
  }
  const next = createQuoteCacheState(normalized);
  runtime.cacheBySymbol.set(normalized, next);
  return next;
}

function getQuoteRetrySeconds(runtime: KisQuoteRuntimeState, now = Date.now()) {
  const until = runtime.quoteRateLimitedUntil;
  if (!Number.isFinite(until ?? NaN) || until === null || until <= now) return 0;
  return Math.max(0, Math.ceil((until - now) / 1000));
}

function hasFreshOutput(entry: KisQuoteCacheState, now = Date.now()) {
  return (
    isRecord(entry.output) &&
    Number.isFinite(entry.expiresAt ?? NaN) &&
    typeof entry.expiresAt === "number" &&
    entry.expiresAt > now
  );
}

function parseTokenResponse(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      token: null,
      expiresIn: null,
      rtCd: null,
      msgCd: null,
      msg1: null
    };
  }

  const token =
    typeof payload.access_token === "string" ? payload.access_token.trim() : null;
  const expiresIn =
    typeof payload.expires_in === "string" || typeof payload.expires_in === "number"
      ? Number(payload.expires_in)
      : null;
  const rtCd = typeof payload.rt_cd === "string" ? payload.rt_cd : null;
  const msgCd = typeof payload.msg_cd === "string" ? payload.msg_cd : null;
  const msg1 = typeof payload.msg1 === "string" ? payload.msg1 : null;

  return {
    token: token && token.length > 0 ? token : null,
    expiresIn: Number.isFinite(expiresIn ?? NaN) ? (expiresIn as number) : null,
    rtCd,
    msgCd,
    msg1
  };
}

function normalizeKisTokenMessage(
  status: number | null,
  msg1: string | null,
  error: string | null
) {
  if (typeof status === "number" && status >= 400 && msg1) {
    return `HTTP ${status} · ${msg1}`;
  }
  if (msg1) return msg1;
  if (typeof status === "number" && status >= 400) {
    return `KIS token HTTP ${status}`;
  }
  return error;
}

function parseKisRealtimeMeta(payload: unknown) {
  if (!isRecord(payload)) {
    return {
      rtCd: null,
      msgCd: null,
      msg1: null
    };
  }

  return {
    rtCd: asString(payload.rt_cd),
    msgCd: asString(payload.msg_cd),
    msg1: asString(payload.msg1)
  };
}

function isQuoteRateLimitError(msgCd: string | null, msg1: string | null) {
  if (msgCd === QUOTE_RATE_LIMIT_CODE) return true;
  if (!msg1) return false;
  return msg1.includes("초당 거래건수");
}

function isTokenRateLimitError(msgCd: string | null, msg1: string | null) {
  if (msgCd === TOKEN_RATE_LIMIT_CODE) return true;
  if (!msg1) return false;
  return msg1.includes("1분당 1회") || msg1.includes("잠시 후 다시 시도");
}

function formatRequestTime(date: Date) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function formatAsOf(dateRaw: string | undefined, timeRaw: string | undefined, requestTime: Date) {
  const hasDate = Boolean(dateRaw && /^\d{8}$/.test(dateRaw));
  const hasTime = Boolean(timeRaw && /^\d{6}$/.test(timeRaw));

  if (hasDate && hasTime) {
    return `${dateRaw!.slice(0, 4)}-${dateRaw!.slice(4, 6)}-${dateRaw!.slice(6, 8)} ${timeRaw!.slice(0, 2)}:${timeRaw!.slice(2, 4)}`;
  }

  return formatRequestTime(requestTime);
}

function findOutputValue(output: KisRealtimeOutput, keys: string[]) {
  const entries = Object.entries(output);

  for (const key of keys) {
    if (key in output) {
      return output[key];
    }

    const found = entries.find(([entryKey]) => entryKey.toLowerCase() === key.toLowerCase());
    if (found) {
      return found[1];
    }
  }

  return undefined;
}

function getCachedQuotePayload(entry: KisQuoteCacheState): KisQuotePayload | null {
  if (!isRecord(entry.output) || !Number.isFinite(entry.updatedAt ?? NaN) || entry.updatedAt === null) {
    return null;
  }

  return {
    normalizedCode: entry.symbol,
    requestTime: new Date(entry.updatedAt),
    output: entry.output
  };
}

async function runQuoteRequestSerial<T>(task: () => Promise<T>) {
  const runtime = getQuoteRuntimeState();
  const previous = runtime.queue;
  let release: () => void = () => {};
  runtime.queue = new Promise<void>((resolve) => {
    release = () => resolve();
  });

  await previous.catch(() => undefined);

  const now = Date.now();
  if (typeof runtime.lastGlobalQuoteRequestAt === "number") {
    const waitMs = QUOTE_MIN_INTERVAL_MS - (now - runtime.lastGlobalQuoteRequestAt);
    if (waitMs > 0) {
      await sleep(waitMs);
    }
  }

  try {
    return await task();
  } finally {
    runtime.lastGlobalQuoteRequestAt = Date.now();
    release();
  }
}

async function requestDomesticQuoteOutput(
  config: NonNullable<ReturnType<typeof getKisConfig>>,
  token: string,
  normalizedCode: string
) {
  const entry = getQuoteCacheState(normalizedCode);
  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: "J",
    fid_input_iscd: normalizedCode
  });

  const timeout = withTimeout(8_000);
  const requestTime = new Date();
  const trId = process.env.KIS_QUOTE_TR_ID?.trim() || "FHKST01010100";
  entry.lastQuoteRequestAt = requestTime.getTime();
  entry.quoteReused = false;

  try {
    const response = await fetch(
      `${config.baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price?${params.toString()}`,
      {
        method: "GET",
        headers: {
          "content-type": "application/json; charset=utf-8",
          authorization: `Bearer ${token}`,
          appkey: config.appKey,
          appsecret: config.appSecret,
          tr_id: trId
        },
        cache: "no-store",
        signal: timeout.signal
      }
    );

    const responseText = await response.text();
    let payload: unknown = null;
    try {
      payload = JSON.parse(responseText);
    } catch {
      payload = null;
    }

    const meta = parseKisRealtimeMeta(payload);
    const detail = responseText.slice(0, 300);

    if (!response.ok) {
      throw new KisQuoteRequestError(meta.msg1 ?? `KIS quote HTTP ${response.status}`, {
        status: response.status,
        rtCd: meta.rtCd,
        msgCd: meta.msgCd,
        msg1: meta.msg1,
        detail,
        isRateLimited: isQuoteRateLimitError(meta.msgCd, meta.msg1)
      });
    }

    const responsePayload = payload as KisRealtimeResponse | null;
    if (!responsePayload || responsePayload.rt_cd !== "0") {
      const failMessage =
        asString(responsePayload?.msg1) ?? "KIS quote rt_cd is not 0";
      throw new KisQuoteRequestError(failMessage, {
        status: response.status,
        rtCd: asString(responsePayload?.rt_cd),
        msgCd: asString(responsePayload?.msg_cd),
        msg1: asString(responsePayload?.msg1),
        detail,
        isRateLimited: isQuoteRateLimitError(
          asString(responsePayload?.msg_cd),
          asString(responsePayload?.msg1)
        )
      });
    }

    const outputCandidate = responsePayload.output ?? responsePayload.output1;
    if (!isRecord(outputCandidate)) {
      throw new KisQuoteRequestError("KIS quote output is empty", {
        status: response.status,
        rtCd: asString(responsePayload.rt_cd),
        msgCd: asString(responsePayload.msg_cd),
        msg1: asString(responsePayload.msg1),
        detail
      });
    }

    entry.output = outputCandidate as KisRealtimeOutput;
    entry.updatedAt = requestTime.getTime();
    entry.expiresAt = Date.now() + QUOTE_CACHE_TTL_MS;
    entry.lastQuoteError = null;
    entry.lastQuoteHttpStatus = response.status;
    entry.lastQuoteRtCd = asString(responsePayload.rt_cd);
    entry.lastQuoteMsgCd = asString(responsePayload.msg_cd);
    entry.lastQuoteMsg1 = asString(responsePayload.msg1);
    entry.quoteRateLimited = false;

    return {
      normalizedCode,
      requestTime,
      output: outputCandidate as KisRealtimeOutput
    } satisfies KisQuotePayload;
  } catch (error) {
    const runtime = getQuoteRuntimeState();
    const now = Date.now();
    if (error instanceof KisQuoteRequestError) {
      entry.lastQuoteHttpStatus = error.status;
      entry.lastQuoteRtCd = error.rtCd;
      entry.lastQuoteMsgCd = error.msgCd;
      entry.lastQuoteMsg1 = error.msg1;
      entry.lastQuoteError = error.message;

      if (error.isRateLimited) {
        runtime.quoteRateLimitedUntil = now + QUOTE_RATE_LIMIT_COOLDOWN_MS;
        entry.quoteRateLimited = true;
        entry.lastQuoteError = QUOTE_RATE_LIMIT_MESSAGE;
        warnOnce(
          "kis-quote-rate-limit",
          "[kis] KIS 요청 빈도가 높아 초당 거래건수 제한(EGW00201)에 걸렸습니다."
        );
      }
    } else {
      entry.lastQuoteError = error instanceof Error ? error.message : "KIS quote unknown error";
      entry.lastQuoteHttpStatus = null;
      entry.lastQuoteRtCd = null;
      entry.lastQuoteMsgCd = null;
      entry.lastQuoteMsg1 = null;
    }

    const cachedPayload = getCachedQuotePayload(entry);
    if (cachedPayload && hasFreshOutput(entry)) {
      entry.quoteReused = true;
      return cachedPayload;
    }

    const normalized = normalizeCode(normalizedCode);
    warnOnce(
      `kis-quote-failed:${normalized}`,
      `[kis] Realtime quote unavailable. code=${normalized}, reason=${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return null;
  } finally {
    timeout.done();
  }
}

async function fetchDomesticQuoteOutput(code: string): Promise<KisQuotePayload | null> {
  const config = getKisConfig();
  if (!config) {
    warnOnce(
      "kis-config-missing",
      "[kis] Missing KIS_APP_KEY/KIS_APP_SECRET/KIS_BASE_URL. Realtime quote is disabled."
    );
    return null;
  }

  const token = await getKisAccessToken();
  if (!token) return null;

  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const runtime = getQuoteRuntimeState();
  const entry = getQuoteCacheState(normalizedCode);
  const now = Date.now();

  if (hasFreshOutput(entry, now)) {
    const cached = getCachedQuotePayload(entry);
    if (cached) {
      entry.quoteReused = true;
      entry.quoteRateLimited = false;
      return cached;
    }
  }

  const retrySeconds = getQuoteRetrySeconds(runtime, now);
  if (retrySeconds > 0) {
    entry.quoteRateLimited = true;
    entry.lastQuoteError = QUOTE_RATE_LIMIT_MESSAGE;
    const cached = getCachedQuotePayload(entry);
    if (cached && hasFreshOutput(entry, now)) {
      entry.quoteReused = true;
      return cached;
    }
    return null;
  }

  const inFlight = runtime.inFlightBySymbol.get(normalizedCode);
  if (inFlight) {
    const reused = await inFlight;
    if (reused) {
      entry.quoteReused = true;
    }
    return reused;
  }

  const task = runQuoteRequestSerial(() =>
    requestDomesticQuoteOutput(config, token, normalizedCode)
  );
  runtime.inFlightBySymbol.set(normalizedCode, task);

  try {
    return await task;
  } finally {
    runtime.inFlightBySymbol.delete(normalizedCode);
  }
}

export function getKisTokenCacheSnapshot(): KisTokenCacheSnapshot {
  const state = getTokenCacheState();
  const hasToken =
    typeof state.token === "string" &&
    state.token.length > 0 &&
    typeof state.expiresAt === "number" &&
    state.expiresAt > Date.now();

  return {
    tokenCache: hasToken ? "있음" : "없음",
    issuedAt: toIso(state.issuedAt),
    expiresAt: toIso(state.expiresAt),
    lastTokenRequestAt: toIso(state.lastTokenRequestAt),
    lastTokenError: state.lastTokenError,
    lastTokenHttpStatus: state.lastTokenHttpStatus,
    lastTokenRtCd: state.lastTokenRtCd,
    lastTokenMsgCd: state.lastTokenMsgCd,
    lastTokenMsg1: state.lastTokenMsg1,
    tokenReused: state.lastTokenReused
  };
}

export function getKisQuoteCacheSnapshot(code: string): KisQuoteCacheSnapshot {
  const normalizedCode = normalizeCode(code);
  const entry = getQuoteCacheState(normalizedCode);
  const runtime = getQuoteRuntimeState();
  const now = Date.now();

  const hasCache = hasFreshOutput(entry, now);
  const secondsUntilNextQuoteRequest = getQuoteRetrySeconds(runtime, now);
  const quoteRateLimited = secondsUntilNextQuoteRequest > 0 || entry.quoteRateLimited;

  return {
    symbol: normalizedCode,
    quoteCache: hasCache ? "있음" : "없음",
    updatedAt: toIso(entry.updatedAt),
    expiresAt: toIso(entry.expiresAt),
    lastQuoteRequestAt: toIso(entry.lastQuoteRequestAt),
    lastQuoteError: entry.lastQuoteError,
    lastQuoteHttpStatus: entry.lastQuoteHttpStatus,
    lastQuoteRtCd: entry.lastQuoteRtCd,
    lastQuoteMsgCd: entry.lastQuoteMsgCd,
    lastQuoteMsg1: entry.lastQuoteMsg1,
    quoteReused: entry.quoteReused,
    quoteRateLimited,
    secondsUntilNextQuoteRequest
  };
}

export async function getKisAccessToken(): Promise<string | null> {
  const config = getKisConfig();
  const state = getTokenCacheState();
  const now = Date.now();

  if (!config) {
    state.lastTokenError = "[kis] Missing KIS_APP_KEY/KIS_APP_SECRET/KIS_BASE_URL.";
    state.lastTokenReused = false;
    warnOnce(
      "kis-config-missing",
      "[kis] Missing KIS_APP_KEY/KIS_APP_SECRET/KIS_BASE_URL. Realtime quote is disabled."
    );
    return null;
  }

  const hasReusableToken =
    typeof state.token === "string" &&
    state.token.length > 0 &&
    typeof state.expiresAt === "number" &&
    state.expiresAt > now + TOKEN_REUSE_BUFFER_MS;
  if (hasReusableToken) {
    state.lastTokenReused = true;
    state.lastTokenError = null;
    return state.token;
  }

  const withinCooldown =
    typeof state.lastTokenRequestAt === "number" &&
    now - state.lastTokenRequestAt < TOKEN_REQUEST_COOLDOWN_MS;
  if (withinCooldown) {
    const hasFallbackToken =
      typeof state.token === "string" &&
      state.token.length > 0 &&
      typeof state.expiresAt === "number" &&
      state.expiresAt > now;
    state.lastTokenError = TOKEN_LIMIT_MESSAGE;
    state.lastTokenReused = hasFallbackToken;
    if (hasFallbackToken) {
      return state.token;
    }
    return null;
  }

  const timeout = withTimeout(8_000);
  state.lastTokenRequestAt = now;
  state.lastTokenReused = false;

  try {
    const response = await fetch(`${config.baseUrl}/oauth2/tokenP`, {
      method: "POST",
      headers: {
        "content-type": "application/json; charset=utf-8"
      },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: config.appKey,
        appsecret: config.appSecret
      }),
      cache: "no-store",
      signal: timeout.signal
    });

    const rawPayload = (await response.json().catch(() => ({}))) as KisTokenResponse;
    const parsed = parseTokenResponse(rawPayload);
    const token = parsed.token;
    const msgCd = parsed.msgCd;
    const msg1 = parsed.msg1;

    state.lastTokenHttpStatus = response.status;
    state.lastTokenRtCd = parsed.rtCd;
    state.lastTokenMsgCd = msgCd;
    state.lastTokenMsg1 = msg1;

    if (!response.ok || !token) {
      const normalizedMessage = normalizeKisTokenMessage(
        response.status,
        msg1,
        !token ? "KIS token is empty" : `KIS token HTTP ${response.status}`
      );

      if (isTokenRateLimitError(msgCd, msg1)) {
        state.lastTokenError = TOKEN_LIMIT_MESSAGE;
        const hasFallbackToken =
          typeof state.token === "string" &&
          state.token.length > 0 &&
          typeof state.expiresAt === "number" &&
          state.expiresAt > Date.now();
        state.lastTokenReused = hasFallbackToken;
        if (hasFallbackToken) {
          return state.token;
        }
        return null;
      }

      state.lastTokenError = normalizedMessage ?? "KIS token 발급 실패";
      const hasFallbackToken =
        typeof state.token === "string" &&
        state.token.length > 0 &&
        typeof state.expiresAt === "number" &&
        state.expiresAt > Date.now();
      state.lastTokenReused = hasFallbackToken;
      if (hasFallbackToken) {
        return state.token;
      }
      throw new Error(state.lastTokenError);
    }

    const expiresIn = parsed.expiresIn;
    const validExpiresIn =
      typeof expiresIn === "number" && Number.isFinite(expiresIn) ? expiresIn : null;
    const ttlMs =
      typeof validExpiresIn === "number" && validExpiresIn > 0
        ? validExpiresIn * 1000
        : 23 * 60 * 60 * 1000;

    state.token = token;
    state.issuedAt = now;
    state.expiresAt = now + ttlMs;
    state.lastTokenError = null;
    state.lastTokenReused = false;

    return token;
  } catch (error) {
    state.lastTokenError = error instanceof Error ? error.message : "KIS token unknown error";
    warnOnce(
      "kis-token-failed",
      `[kis] Failed to issue access token. ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );

    const hasFallbackToken =
      typeof state.token === "string" &&
      state.token.length > 0 &&
      typeof state.expiresAt === "number" &&
      state.expiresAt > Date.now();
    state.lastTokenReused = hasFallbackToken;
    if (hasFallbackToken) {
      return state.token;
    }

    return null;
  } finally {
    timeout.done();
  }
}

export async function getRealtimeQuote(code: string): Promise<RealtimeQuote | null> {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const quotePayload = await fetchDomesticQuoteOutput(normalizedCode);
  if (!quotePayload) return null;

  const { output, requestTime } = quotePayload;
  const entry = getQuoteCacheState(normalizedCode);

  const price = toNumber(output.stck_prpr);
  if (!(Number.isFinite(price) && price > 0)) {
    entry.lastQuoteError = "KIS quote price is invalid";
    return null;
  }

  const rawChange = toNumber(output.prdy_vrss);
  const change = toSignedChange(
    rawChange,
    typeof output.prdy_vrss_sign === "string" ? output.prdy_vrss_sign : undefined
  );
  const changeRate = toNumber(output.prdy_ctrt);

  const quote: RealtimeQuote = {
    symbol: normalizeCode(
      typeof output.stck_shrn_iscd === "string" && output.stck_shrn_iscd.trim()
        ? output.stck_shrn_iscd
        : normalizedCode
    ),
    price,
    change,
    changeRate,
    volume: toNumber(output.acml_vol),
    source: "kis",
    asOf: formatAsOf(
      typeof output.stck_bsop_date === "string" ? output.stck_bsop_date : undefined,
      typeof output.stck_cntg_hour === "string" ? output.stck_cntg_hour : undefined,
      requestTime
    )
  };

  entry.quote = quote;
  return quote;
}

export async function getForeignOwnership(
  code: string
): Promise<ForeignOwnershipData | null> {
  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const quotePayload = await fetchDomesticQuoteOutput(normalizedCode);
  if (!quotePayload) return null;

  const { output, requestTime } = quotePayload;
  const foreignExhaustionRate = toNullableNumber(
    findOutputValue(output, ["hts_frgn_ehrt", "frgn_ehrt", "frgn_exh_rt"])
  );
  const foreignHoldingQty = toNullableNumber(
    findOutputValue(output, ["frgn_hldn_qty", "frgn_hldn_qnty"])
  );
  const foreignLimitQty = toNullableNumber(
    findOutputValue(output, ["frgn_lmtl_qty", "frgn_lmtt_qty", "frgn_lmt_qty"])
  );
  const directRatio = toNullableNumber(
    findOutputValue(output, ["frgn_hldn_rt", "frgn_hldn_rate"])
  );
  const hasHoldingQty =
    typeof foreignHoldingQty === "number" && Number.isFinite(foreignHoldingQty);
  const hasLimitQty =
    typeof foreignLimitQty === "number" && Number.isFinite(foreignLimitQty);
  const hasDirectRatio = typeof directRatio === "number" && Number.isFinite(directRatio);
  const hasExhaustionRate =
    typeof foreignExhaustionRate === "number" && Number.isFinite(foreignExhaustionRate);
  const inferredRatio =
    hasHoldingQty && hasLimitQty && foreignLimitQty > 0
      ? (foreignHoldingQty / foreignLimitQty) * 100
      : null;
  const hasInferredRatio =
    typeof inferredRatio === "number" && Number.isFinite(inferredRatio);
  const foreignOwnershipRatio = hasDirectRatio
    ? directRatio
    : hasInferredRatio
      ? inferredRatio
      : null;

  if (
    !(typeof foreignOwnershipRatio === "number" && Number.isFinite(foreignOwnershipRatio)) &&
    !hasHoldingQty &&
    !hasLimitQty &&
    !hasExhaustionRate
  ) {
    return null;
  }

  return {
    code: normalizedCode,
    foreignOwnershipRatio,
    foreignHoldingQty,
    foreignLimitQty,
    foreignExhaustionRate,
    source: "KIS",
    updatedAt: formatAsOf(
      typeof output.stck_bsop_date === "string" ? output.stck_bsop_date : undefined,
      typeof output.stck_cntg_hour === "string" ? output.stck_cntg_hour : undefined,
      requestTime
    )
  };
}
