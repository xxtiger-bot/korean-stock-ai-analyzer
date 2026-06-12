import type { ForeignOwnershipData, RealtimeQuote } from "@/lib/types";

type KisAccessTokenResponse = {
  access_token?: string;
  token_type?: string;
  access_token_token_expired?: string;
  expires_in?: number | string;
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
};

type KisAccessTokenCacheState = {
  token: string | null;
  expiresAtMs: number;
  lastIssuedAtMs: number;
  lastRequestedAtMs: number;
  lastRequestAtIso: string | null;
  lastErrorAtIso: string | null;
  lastErrorMessage: string | null;
  refreshing: Promise<string> | null;
};

type KisQuotePayload = {
  price: number;
  changePercent: number | null;
  open: number | null;
  high: number | null;
  low: number | null;
  volume: number | null;
  turnover: number | null;
  marketCap: number | null;
  peRatio: number | null;
  pbRatio: number | null;
  eps: number | null;
  bps: number | null;
  asOf: string;
  basis: "kis";
  source: "kis";
  isDelayed: false;
};

type KisQuoteCacheState = {
  payload: KisQuotePayload | null;
  fetchedAtMs: number;
  lastRequestedAtMs: number;
  lastRequestAtIso: string | null;
  lastErrorAtIso: string | null;
  lastErrorMessage: string | null;
  pending: Promise<unknown> | null;
};

type KisQuoteRuntimeState = {
  lastIssuedAtMs: number | null;
  lastIssuedAtIso: string | null;
  lastErrorAtIso: string | null;
  lastErrorMessage: string | null;
};

type KisTokenSource = "fresh" | "cache";

type KisQuoteDebugValue = string | null;

type KisQuoteRequestResult = {
  output: Record<string, unknown>;
  requestSymbol: string;
  trId: string;
  rawResponseKeys: string[];
  rawPriceCandidateFields: Record<string, KisQuoteDebugValue>;
};

export type KisTokenCacheSnapshot = {
  hasToken: boolean;
  expiresAtIso: string | null;
  lastIssuedAtIso: string | null;
  lastRequestAtIso: string | null;
  lastErrorAtIso: string | null;
  lastErrorMessage: string | null;
};

export type KisQuoteCacheSnapshot = {
  hasPayload: boolean;
  fetchedAtIso: string | null;
  lastRequestAtIso: string | null;
  lastErrorAtIso: string | null;
  lastErrorMessage: string | null;
  lastIssuedAtIso: string | null;
};

export type KisCurrentQuoteDiagnostic = {
  appKeyConfigured: boolean;
  appSecretConfigured: boolean;
  baseUrl: string;
  tokenStatus: "success" | "missing_credentials" | "error";
  tokenErrorCode: string | null;
  tokenErrorMessage: string | null;
  tokenLikelyCooldownIssue: boolean;
  tokenLikelyPermissionIssue: boolean;
  tokenLikelyEndpointIssue: boolean;
  tokenLikelyMockAccountIssue: boolean;
  tokenSource: KisTokenSource | "none";
  tokenExpiresAt: string | null;
  quoteStatus: "success" | "skipped" | "no_data" | "error";
  requestSymbol: string;
  trId: string;
  rawResponseKeys: string[];
  rawPriceCandidateFields: Record<string, KisQuoteDebugValue>;
  rawPrice: string | null;
  parsedPrice: number | null;
  source: "KIS" | "none";
  updatedAt: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  noDataReason: string | null;
  quoteLikelyCooldownIssue: boolean;
  quoteLikelyPermissionIssue: boolean;
  quoteLikelyEndpointIssue: boolean;
  quoteLikelyMockAccountIssue: boolean;
  tokenCache: KisTokenCacheSnapshot;
  quoteCache: KisQuoteCacheSnapshot;
};

const TOKEN_REQUEST_COOLDOWN_MS = 5_000;
const TOKEN_REUSE_BUFFER_MS = 5 * 60_000;
const TOKEN_DEFAULT_TTL_MS = 6 * 60 * 60_000;
const QUOTE_CACHE_TTL_MS = 15_000;
const QUOTE_MIN_INTERVAL_MS = 1_500;
const QUOTE_RETRY_DELAY_MS = 500;
const MARKET_CAP_SCALE = 100_000_000;
const TURNOVER_SCALE = 1_000_000;
const FOREIGN_OWNERSHIP_NOT_AVAILABLE_MESSAGE = "외국인 보유 정보는 현재 KIS 응답에서 제공되지 않습니다.";
const KOREA_TIME_ZONE = "Asia/Seoul";
const KIS_QUOTE_TR_ID = "FHKST01010100";
const QUOTE_PRICE_CANDIDATE_KEYS = [
  "stck_prpr",
  "stck_sdpr",
  "stck_oprc",
  "stck_hgpr",
  "stck_lwpr",
  "prdy_vrss",
  "prdy_ctrt"
] as const;

class KisQuoteRequestError extends Error {
  requestTime: Date;
  details: {
    requestSymbol: string;
    trId: string;
    rawResponseKeys: string[];
    rawPriceCandidateFields: Record<string, KisQuoteDebugValue>;
    errorCode: string | null;
    noDataReason: string | null;
    statusCode: number | null;
  };
  retryable: boolean;
  constructor(
    message: string,
    requestTime: Date,
    details: KisQuoteRequestError["details"],
    retryable: boolean
  ) {
    super(message);
    this.name = "KisQuoteRequestError";
    this.requestTime = requestTime;
    this.details = details;
    this.retryable = retryable;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asString(value: unknown): string | null {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  return null;
}

function toNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string") {
    const normalized = value.replace(/,/g, "").trim();
    if (normalized.length === 0) {
      return null;
    }
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toNullableNumber(value: number | null, scale = 1): number | null {
  if (!Number.isFinite(value ?? NaN)) {
    return null;
  }
  return scale === 1 ? (value as number) : (value as number) * scale;
}

function sleep(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function toIso(timestampMs: number | null): string | null {
  if (timestampMs === null || !Number.isFinite(timestampMs) || timestampMs <= 0) {
    return null;
  }
  return new Date(timestampMs).toISOString();
}

function getKisConfig() {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  const baseUrl =
    process.env.KIS_BASE_URL?.replace(/\/$/, "") || "https://openapi.koreainvestment.com:9443";

  if (!appKey || !appSecret) {
    throw new Error("KIS credentials are not configured.");
  }

  return { appKey, appSecret, baseUrl };
}

function getKisConfigSnapshot() {
  const appKey = process.env.KIS_APP_KEY;
  const appSecret = process.env.KIS_APP_SECRET;
  const baseUrl =
    process.env.KIS_BASE_URL?.replace(/\/$/, "") || "https://openapi.koreainvestment.com:9443";

  return {
    appKeyConfigured: Boolean(appKey),
    appSecretConfigured: Boolean(appSecret),
    baseUrl
  };
}

function toDebugValue(value: unknown): KisQuoteDebugValue {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return null;
}

function getRawResponseKeys(payload: Record<string, unknown> | null) {
  return payload ? Object.keys(payload) : [];
}

function getRawPriceCandidateFields(output: Record<string, unknown> | null) {
  return Object.fromEntries(
    QUOTE_PRICE_CANDIDATE_KEYS.map((key) => [key, toDebugValue(output?.[key])])
  ) as Record<string, KisQuoteDebugValue>;
}

function parseTokenExpiryMs(payload: KisAccessTokenResponse) {
  const now = Date.now();
  const explicitExpiry = asString(payload.access_token_token_expired);
  const explicitExpiryMs = explicitExpiry ? Date.parse(explicitExpiry) : NaN;
  if (Number.isFinite(explicitExpiryMs) && explicitExpiryMs > now) {
    return explicitExpiryMs;
  }

  const expiresInSeconds = toNumber(payload.expires_in);
  if (expiresInSeconds && expiresInSeconds > 0) {
    return now + expiresInSeconds * 1000;
  }

  return now + TOKEN_DEFAULT_TTL_MS;
}

function shouldRetryQuoteRequest(error: unknown) {
  if (error instanceof KisQuoteRequestError) {
    return error.retryable;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  const normalized = error.message.toLowerCase();
  if (
    normalized.includes("permission") ||
    normalized.includes("forbidden") ||
    normalized.includes("unauthorized") ||
    normalized.includes("authorization") ||
    normalized.includes("접근")
  ) {
    return false;
  }

  return (
    normalized.includes("fetch failed") ||
    normalized.includes("network") ||
    normalized.includes("timeout") ||
    normalized.includes("temporary")
  );
}

const tokenState = globalThis as typeof globalThis & {
  __krxKisTokenCache?: KisAccessTokenCacheState;
};

if (!tokenState.__krxKisTokenCache) {
  tokenState.__krxKisTokenCache = {
    token: null,
    expiresAtMs: 0,
    lastIssuedAtMs: 0,
    lastRequestedAtMs: 0,
    lastRequestAtIso: null,
    lastErrorAtIso: null,
    lastErrorMessage: null,
    refreshing: null,
  };
}

const kisTokenCache = tokenState.__krxKisTokenCache;

const quoteState = globalThis as typeof globalThis & {
  __krxKisQuoteCache?: Map<string, KisQuoteCacheState>;
  __krxKisQuoteRuntime?: KisQuoteRuntimeState;
};

if (!quoteState.__krxKisQuoteCache) {
  quoteState.__krxKisQuoteCache = new Map();
}

if (!quoteState.__krxKisQuoteRuntime) {
  quoteState.__krxKisQuoteRuntime = {
    lastIssuedAtMs: null,
    lastIssuedAtIso: null,
    lastErrorAtIso: null,
    lastErrorMessage: null,
  };
}

const kisQuoteCache = quoteState.__krxKisQuoteCache;
const kisQuoteRuntime = quoteState.__krxKisQuoteRuntime;

function getQuoteState(code: string): KisQuoteCacheState {
  const normalizedCode = code.trim();
  const existing = kisQuoteCache.get(normalizedCode);
  if (existing) {
    return existing;
  }

  const created: KisQuoteCacheState = {
    payload: null,
    fetchedAtMs: 0,
    lastRequestedAtMs: 0,
    lastRequestAtIso: null,
    lastErrorAtIso: null,
    lastErrorMessage: null,
    pending: null,
  };
  kisQuoteCache.set(normalizedCode, created);
  return created;
}

function parseTokenResponse(payload: unknown): KisAccessTokenResponse {
  if (!isRecord(payload)) {
    throw new Error("Unexpected KIS token response format.");
  }
  return payload as KisAccessTokenResponse;
}

function normalizeKisTokenMessage(payload: KisAccessTokenResponse): string {
  const pieces = [payload.msg_cd, payload.msg1].filter((piece): piece is string => Boolean(piece && piece.trim()));
  if (pieces.length > 0) {
    return pieces.join(" - ");
  }
  return "Failed to issue KIS access token.";
}

function parseKisRealtimeMeta(payload: unknown): { rtCd: string | null; message: string | null } {
  if (!isRecord(payload)) {
    return { rtCd: null, message: null };
  }
  const rtCd = asString(payload.rt_cd);
  const msg = asString(payload.msg1) ?? asString(payload.msg_cd);
  return { rtCd, message: msg };
}

function extractKisErrorCode(message: string | null): string | null {
  if (!message) return null;
  const match = message.match(/\b[A-Z]{2,}[0-9]{2,}\b/);
  return match ? match[0] : null;
}

function getFailureFlags(message: string | null, baseUrl: string) {
  const normalized = (message ?? "").toLowerCase();
  const isMockBaseUrl = baseUrl.toLowerCase().includes("openapivts");

  return {
    likelyCooldownIssue:
      normalized.includes("cooldown") ||
      normalized.includes("too many") ||
      normalized.includes("rate limit") ||
      normalized.includes("too many requests"),
    likelyPermissionIssue:
      normalized.includes("permission") ||
      normalized.includes("forbidden") ||
      normalized.includes("unauthorized") ||
      normalized.includes("접근"),
    likelyEndpointIssue:
      normalized.includes("endpoint") ||
      normalized.includes("404") ||
      normalized.includes("not found") ||
      normalized.includes("fetch failed") ||
      normalized.includes("network"),
    likelyMockAccountIssue:
      isMockBaseUrl &&
      (normalized.includes("permission") ||
        normalized.includes("authorization") ||
        normalized.includes("tr_id") ||
        normalized.includes("모의"))
  };
}

async function ensureTokenRequestCooldown(requestTime: Date) {
  const elapsed = requestTime.getTime() - kisTokenCache.lastRequestedAtMs;
  if (kisTokenCache.lastRequestedAtMs > 0 && elapsed < TOKEN_REQUEST_COOLDOWN_MS) {
    await sleep(TOKEN_REQUEST_COOLDOWN_MS - elapsed);
  }
}

function formatRequestTime(date: Date): { timeLabel: string; isoLabel: string } {
  const timeLabel = new Intl.DateTimeFormat("ko-KR", {
    timeZone: KOREA_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  const isoLabel = new Intl.DateTimeFormat("sv-SE", {
    timeZone: KOREA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);

  return { timeLabel, isoLabel: `${isoLabel} KST` };
}

function formatAsOf(baseDateRaw: unknown, baseTimeRaw: unknown, requestTime: Date): string {
  const baseDate = asString(baseDateRaw);
  const baseTime = asString(baseTimeRaw);
  const { timeLabel, isoLabel } = formatRequestTime(requestTime);

  if (baseDate && baseTime && /^\d{8}$/.test(baseDate) && /^\d{4,6}$/.test(baseTime)) {
    const paddedTime = baseTime.padStart(6, "0");
    const year = baseDate.slice(0, 4);
    const month = baseDate.slice(4, 6);
    const day = baseDate.slice(6, 8);
    const hour = paddedTime.slice(0, 2);
    const minute = paddedTime.slice(2, 4);
    return `${year}-${month}-${day} ${hour}:${minute} KST`;
  }

  return isoLabel || `${timeLabel} KST`;
}

function findOutputValue(record: Record<string, unknown>, keys: readonly string[]) {
  for (const key of keys) {
    const direct = record[key];
    const asStringValue = asString(direct);
    if (asStringValue) {
      return asStringValue;
    }
    if (typeof direct === "number" && Number.isFinite(direct)) {
      return String(direct);
    }
  }
  return null;
}

function getCachedQuotePayload(code: string): KisQuotePayload | null {
  const state = getQuoteState(code);
  if (!state.payload) {
    return null;
  }
  if (Date.now() - state.fetchedAtMs > QUOTE_CACHE_TTL_MS) {
    return null;
  }
  return state.payload;
}

async function runQuoteRequestSerial<T>(code: string, task: () => Promise<T>) {
  const state = getQuoteState(code);
  while (state.pending) {
    await state.pending.catch(() => undefined);
    if (!state.pending) {
      break;
    }
  }

  const execution = task().finally(() => {
    if (state.pending === executionPromise) {
      state.pending = null;
    }
  });
  const executionPromise = execution;
  state.pending = executionPromise;
  return executionPromise;
}

async function requestDomesticQuoteOutputOnce(
  code: string,
  requestTime: Date
): Promise<KisQuoteRequestResult> {
  const token = await getKisAccessToken();
  const { appKey, appSecret, baseUrl } = getKisConfig();

  const response = await fetch(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: KIS_QUOTE_TR_ID,
    },
    cache: "no-store",
    next: { revalidate: 0 },
  });

  const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
  const meta = parseKisRealtimeMeta(payload);
  const output = isRecord(payload?.output) ? (payload.output as Record<string, unknown>) : null;
  const errorCode = asString(payload?.msg_cd) ?? null;
  const rawResponseKeys = getRawResponseKeys(payload);
  const rawPriceCandidateFields = getRawPriceCandidateFields(output);

  if (!response.ok) {
    throw new KisQuoteRequestError(
      meta.message ?? `KIS quote request failed (${response.status}).`,
      requestTime,
      {
        requestSymbol: code.trim(),
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        errorCode,
        noDataReason: null,
        statusCode: response.status
      },
      response.status >= 500
    );
  }

  if (meta.rtCd && meta.rtCd !== "0") {
    throw new KisQuoteRequestError(
      meta.message ?? `KIS quote request returned rt_cd=${meta.rtCd}.`,
      requestTime,
      {
        requestSymbol: code.trim(),
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        errorCode,
        noDataReason: null,
        statusCode: response.status
      },
      false
    );
  }

  if (!output) {
    throw new KisQuoteRequestError(
      "Unexpected KIS quote response format.",
      requestTime,
      {
        requestSymbol: code.trim(),
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        errorCode,
        noDataReason: "empty_response",
        statusCode: response.status
      },
      true
    );
  }

  const parsedPrice = toNumber(findOutputValue(output, ["stck_prpr"]));
  if (!parsedPrice || parsedPrice <= 0) {
    throw new KisQuoteRequestError(
      "KIS quote response did not include a valid current price.",
      requestTime,
      {
        requestSymbol: code.trim(),
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        errorCode,
        noDataReason: "invalid_current_price",
        statusCode: response.status
      },
      true
    );
  }

  return {
    output,
    requestSymbol: code.trim(),
    trId: KIS_QUOTE_TR_ID,
    rawResponseKeys,
    rawPriceCandidateFields
  };
}

async function requestDomesticQuoteOutput(
  code: string,
  requestTime: Date
): Promise<KisQuoteRequestResult> {
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await requestDomesticQuoteOutputOnce(code, requestTime);
    } catch (error) {
      lastError = error;
      if (attempt === 0 && shouldRetryQuoteRequest(error)) {
        await sleep(QUOTE_RETRY_DELAY_MS);
        continue;
      }
      throw error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Failed to request KIS quote.");
}

async function fetchDomesticQuoteOutput(code: string, requestTime: Date): Promise<KisQuoteRequestResult> {
  const state = getQuoteState(code);
  const elapsed = requestTime.getTime() - state.lastRequestedAtMs;
  if (state.lastRequestedAtMs > 0 && elapsed < QUOTE_MIN_INTERVAL_MS) {
    await sleep(QUOTE_MIN_INTERVAL_MS - elapsed);
  }

  state.lastRequestedAtMs = Date.now();
  state.lastRequestAtIso = new Date(state.lastRequestedAtMs).toISOString();

  return runQuoteRequestSerial(code, async () => {
    return requestDomesticQuoteOutput(code, requestTime);
  });
}

export function getKisTokenCacheSnapshot(): KisTokenCacheSnapshot {
  return {
    hasToken: Boolean(kisTokenCache.token),
    expiresAtIso: toIso(kisTokenCache.expiresAtMs),
    lastIssuedAtIso: toIso(kisTokenCache.lastIssuedAtMs),
    lastRequestAtIso: kisTokenCache.lastRequestAtIso,
    lastErrorAtIso: kisTokenCache.lastErrorAtIso,
    lastErrorMessage: kisTokenCache.lastErrorMessage,
  };
}

export function getKisQuoteCacheSnapshot(code: string): KisQuoteCacheSnapshot {
  const state = getQuoteState(code);
  return {
    hasPayload: Boolean(state.payload),
    fetchedAtIso: toIso(state.fetchedAtMs),
    lastRequestAtIso: state.lastRequestAtIso,
    lastErrorAtIso: state.lastErrorAtIso,
    lastErrorMessage: state.lastErrorMessage,
    lastIssuedAtIso: kisQuoteRuntime.lastIssuedAtIso,
  };
}

export async function diagnoseKisCurrentQuote(code: string): Promise<KisCurrentQuoteDiagnostic> {
  const normalizedCode = code.trim();
  const config = getKisConfigSnapshot();
  const tokenCache = getKisTokenCacheSnapshot();
  const initialQuoteCache = getKisQuoteCacheSnapshot(normalizedCode);

  if (!config.appKeyConfigured || !config.appSecretConfigured) {
    return {
      ...config,
      tokenStatus: "missing_credentials",
      tokenErrorCode: null,
      tokenErrorMessage: "KIS credentials are not configured.",
      tokenLikelyCooldownIssue: false,
      tokenLikelyPermissionIssue: false,
      tokenLikelyEndpointIssue: false,
      tokenLikelyMockAccountIssue: false,
      tokenSource: "none",
      tokenExpiresAt: null,
      quoteStatus: "skipped",
      requestSymbol: normalizedCode,
      trId: KIS_QUOTE_TR_ID,
      rawResponseKeys: [],
      rawPriceCandidateFields: getRawPriceCandidateFields(null),
      rawPrice: null,
      parsedPrice: null,
      source: "none",
      updatedAt: null,
      errorCode: null,
      errorMessage: "KIS quote skipped because credentials are missing.",
      noDataReason: null,
      quoteLikelyCooldownIssue: false,
      quoteLikelyPermissionIssue: false,
      quoteLikelyEndpointIssue: false,
      quoteLikelyMockAccountIssue: false,
      tokenCache,
      quoteCache: initialQuoteCache
    };
  }

  let tokenStatus: KisCurrentQuoteDiagnostic["tokenStatus"] = "success";
  let tokenErrorMessage: string | null = null;
  let tokenErrorCode: string | null = null;
  let tokenSource: KisCurrentQuoteDiagnostic["tokenSource"] = "none";
  let tokenExpiresAt: string | null = tokenCache.expiresAtIso;

  try {
    const tokenMeta = await getKisAccessTokenWithMeta();
    tokenSource = tokenMeta.source;
    tokenExpiresAt = tokenMeta.expiresAtIso;
  } catch (error) {
    tokenStatus = "error";
    tokenErrorMessage =
      error instanceof Error ? error.message : "Failed to issue KIS access token.";
    tokenErrorCode = extractKisErrorCode(tokenErrorMessage);
  }

  const tokenFlags = getFailureFlags(tokenErrorMessage, config.baseUrl);

  if (tokenStatus !== "success") {
    return {
      ...config,
      tokenStatus,
      tokenErrorCode,
      tokenErrorMessage,
      tokenLikelyCooldownIssue: tokenFlags.likelyCooldownIssue,
      tokenLikelyPermissionIssue: tokenFlags.likelyPermissionIssue,
      tokenLikelyEndpointIssue: tokenFlags.likelyEndpointIssue,
      tokenLikelyMockAccountIssue: tokenFlags.likelyMockAccountIssue,
      tokenSource,
      tokenExpiresAt,
      quoteStatus: "skipped",
      requestSymbol: normalizedCode,
      trId: KIS_QUOTE_TR_ID,
      rawResponseKeys: [],
      rawPriceCandidateFields: getRawPriceCandidateFields(null),
      rawPrice: null,
      parsedPrice: null,
      source: "none",
      updatedAt: null,
      errorCode: null,
      errorMessage: "KIS quote skipped because token issuance failed.",
      noDataReason: null,
      quoteLikelyCooldownIssue: false,
      quoteLikelyPermissionIssue: false,
      quoteLikelyEndpointIssue: false,
      quoteLikelyMockAccountIssue: false,
      tokenCache: getKisTokenCacheSnapshot(),
      quoteCache: getKisQuoteCacheSnapshot(normalizedCode)
    };
  }

  let quoteStatus: KisCurrentQuoteDiagnostic["quoteStatus"] = "success";
  let rawPrice: string | null = null;
  let parsedPrice: number | null = null;
  let updatedAt: string | null = null;
  let errorMessage: string | null = null;
  let errorCode: string | null = null;
  let requestSymbol = normalizedCode;
  let trId = KIS_QUOTE_TR_ID;
  let rawResponseKeys: string[] = [];
  let rawPriceCandidateFields = getRawPriceCandidateFields(null);
  let noDataReason: string | null = null;

  try {
    const result = await fetchDomesticQuoteOutput(normalizedCode, new Date());
    const { output } = result;
    requestSymbol = result.requestSymbol;
    trId = result.trId;
    rawResponseKeys = result.rawResponseKeys;
    rawPriceCandidateFields = result.rawPriceCandidateFields;
    rawPrice = findOutputValue(output, ["stck_prpr"]);
    parsedPrice = toNumber(rawPrice);
    updatedAt = formatAsOf(output.stck_bsop_date, output.stck_cntg_hour, new Date());

    if (!parsedPrice || parsedPrice <= 0) {
      quoteStatus = "no_data";
      errorMessage = "KIS quote response did not include a valid current price.";
      errorCode = extractKisErrorCode(errorMessage);
      noDataReason = "invalid_current_price";
    }
  } catch (error) {
    quoteStatus =
      error instanceof KisQuoteRequestError && error.details.noDataReason ? "no_data" : "error";
    errorMessage = error instanceof Error ? error.message : "Failed to fetch KIS quote.";
    errorCode =
      error instanceof KisQuoteRequestError
        ? error.details.errorCode ?? extractKisErrorCode(errorMessage)
        : extractKisErrorCode(errorMessage);
    if (error instanceof KisQuoteRequestError) {
      requestSymbol = error.details.requestSymbol;
      trId = error.details.trId;
      rawResponseKeys = error.details.rawResponseKeys;
      rawPriceCandidateFields = error.details.rawPriceCandidateFields;
      noDataReason = error.details.noDataReason;
    }
  }

  const quoteFlags = getFailureFlags(errorMessage, config.baseUrl);

  return {
    ...config,
    tokenStatus,
    tokenErrorCode,
    tokenErrorMessage,
    tokenLikelyCooldownIssue: tokenFlags.likelyCooldownIssue,
    tokenLikelyPermissionIssue: tokenFlags.likelyPermissionIssue,
    tokenLikelyEndpointIssue: tokenFlags.likelyEndpointIssue,
    tokenLikelyMockAccountIssue: tokenFlags.likelyMockAccountIssue,
    tokenSource,
    tokenExpiresAt,
    quoteStatus,
    requestSymbol,
    trId,
    rawResponseKeys,
    rawPriceCandidateFields,
    rawPrice,
    parsedPrice,
    source: quoteStatus === "success" && parsedPrice ? "KIS" : "none",
    updatedAt,
    errorCode,
    errorMessage,
    noDataReason,
    quoteLikelyCooldownIssue: quoteFlags.likelyCooldownIssue,
    quoteLikelyPermissionIssue: quoteFlags.likelyPermissionIssue,
    quoteLikelyEndpointIssue: quoteFlags.likelyEndpointIssue,
    quoteLikelyMockAccountIssue: quoteFlags.likelyMockAccountIssue,
    tokenCache: getKisTokenCacheSnapshot(),
    quoteCache: getKisQuoteCacheSnapshot(normalizedCode)
  };
}

async function getKisAccessTokenWithMeta(): Promise<{
  token: string;
  source: KisTokenSource;
  expiresAtMs: number;
  expiresAtIso: string | null;
  issuedAtIso: string | null;
}> {
  if (kisTokenCache.token && Date.now() < kisTokenCache.expiresAtMs - TOKEN_REUSE_BUFFER_MS) {
    return {
      token: kisTokenCache.token,
      source: "cache",
      expiresAtMs: kisTokenCache.expiresAtMs,
      expiresAtIso: toIso(kisTokenCache.expiresAtMs),
      issuedAtIso: toIso(kisTokenCache.lastIssuedAtMs)
    };
  }

  if (!kisTokenCache.refreshing) {
    kisTokenCache.refreshing = (async () => {
      const requestTime = new Date();
      try {
        await ensureTokenRequestCooldown(requestTime);

        const { appKey, appSecret, baseUrl } = getKisConfig();
        kisTokenCache.lastRequestedAtMs = Date.now();
        kisTokenCache.lastRequestAtIso = new Date(kisTokenCache.lastRequestedAtMs).toISOString();

        const response = await fetch(`${baseUrl}/oauth2/tokenP`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            grant_type: "client_credentials",
            appkey: appKey,
            appsecret: appSecret,
          }),
          cache: "no-store",
        });

        const payload = parseTokenResponse(await response.json().catch(() => null));
        const accessToken = asString(payload.access_token);
        const expiresAtMs = parseTokenExpiryMs(payload);

        if (!response.ok || !accessToken) {
          throw new Error(normalizeKisTokenMessage(payload));
        }

        kisTokenCache.token = accessToken;
        kisTokenCache.expiresAtMs = expiresAtMs;
        kisTokenCache.lastIssuedAtMs = Date.now();
        kisTokenCache.lastErrorAtIso = null;
        kisTokenCache.lastErrorMessage = null;
        return accessToken;
      } catch (error) {
        kisTokenCache.lastErrorAtIso = new Date().toISOString();
        kisTokenCache.lastErrorMessage =
          error instanceof Error ? error.message : "Failed to issue KIS access token.";
        throw error;
      } finally {
        kisTokenCache.refreshing = null;
      }
    })();
  }

  const token = await kisTokenCache.refreshing;
  return {
    token,
    source: "fresh",
    expiresAtMs: kisTokenCache.expiresAtMs,
    expiresAtIso: toIso(kisTokenCache.expiresAtMs),
    issuedAtIso: toIso(kisTokenCache.lastIssuedAtMs)
  };
}

export async function getKisAccessToken(): Promise<string> {
  const tokenMeta = await getKisAccessTokenWithMeta();
  return tokenMeta.token;
}

export async function getRealtimeQuote(code: string): Promise<RealtimeQuote> {
  const normalizedCode = code.trim();
  const cached = getCachedQuotePayload(normalizedCode);
  if (cached) {
    return {
      symbol: normalizedCode,
      price: cached.price,
      change: 0,
      changeRate: 0,
      volume: cached.volume ?? 0,
      source: "kis",
      asOf: cached.asOf,
    };
  }

  const requestTime = new Date();
  const state = getQuoteState(normalizedCode);

  try {
    const result = await fetchDomesticQuoteOutput(normalizedCode, requestTime);
    const { output } = result;

    const price = toNumber(findOutputValue(output, ["stck_prpr"]));
    if (!price || price <= 0) {
      throw new KisQuoteRequestError(
        "KIS quote response did not include a valid current price.",
        requestTime,
        {
          requestSymbol: result.requestSymbol,
          trId: result.trId,
          rawResponseKeys: result.rawResponseKeys,
          rawPriceCandidateFields: result.rawPriceCandidateFields,
          errorCode: null,
          noDataReason: "invalid_current_price",
          statusCode: null
        },
        true
      );
    }

    const changePercent = toNullableNumber(toNumber(findOutputValue(output, ["prdy_ctrt"])));
    const open = toNullableNumber(toNumber(findOutputValue(output, ["stck_oprc"])));
    const high = toNullableNumber(toNumber(findOutputValue(output, ["stck_hgpr"])));
    const low = toNullableNumber(toNumber(findOutputValue(output, ["stck_lwpr"])));
    const volume = toNullableNumber(toNumber(findOutputValue(output, ["acml_vol"])));
    const turnover = toNullableNumber(
      toNumber(findOutputValue(output, ["acml_tr_pbmn", "acml_tr_pbmn1"])),
      TURNOVER_SCALE,
    );
    const marketCap = toNullableNumber(toNumber(findOutputValue(output, ["hts_avls"])), MARKET_CAP_SCALE);
    const peRatio = toNullableNumber(toNumber(findOutputValue(output, ["per"])));
    const pbRatio = toNullableNumber(toNumber(findOutputValue(output, ["pbr"])));
    const eps = toNullableNumber(toNumber(findOutputValue(output, ["eps"])));
    const bps = toNullableNumber(toNumber(findOutputValue(output, ["bps"])));
    const asOf = formatAsOf(output.stck_bsop_date, output.stck_cntg_hour, requestTime);

    const payload: KisQuotePayload = {
      price,
      changePercent,
      open,
      high,
      low,
      volume,
      turnover,
      marketCap,
      peRatio,
      pbRatio,
      eps,
      bps,
      asOf,
      basis: "kis",
      source: "kis",
      isDelayed: false,
    };

    state.payload = payload;
    state.fetchedAtMs = Date.now();
    state.lastErrorAtIso = null;
    state.lastErrorMessage = null;
    kisQuoteRuntime.lastIssuedAtMs = state.fetchedAtMs;
    kisQuoteRuntime.lastIssuedAtIso = new Date(state.fetchedAtMs).toISOString();
    kisQuoteRuntime.lastErrorAtIso = null;
    kisQuoteRuntime.lastErrorMessage = null;

    return {
      symbol: normalizedCode,
      price: payload.price,
      change: 0,
      changeRate: 0,
      volume: payload.volume ?? 0,
      source: "kis",
      asOf: payload.asOf,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch KIS quote.";
    state.lastErrorAtIso = new Date().toISOString();
    state.lastErrorMessage = message;
    kisQuoteRuntime.lastErrorAtIso = state.lastErrorAtIso;
    kisQuoteRuntime.lastErrorMessage = message;
    throw error;
  }
}

export async function getForeignOwnership(code: string): Promise<ForeignOwnershipData> {
  const quote = await getRealtimeQuote(code);

  return {
    code: code.trim(),
    foreignOwnershipRatio: null,
    foreignHoldingQty: null,
    foreignLimitQty: null,
    foreignExhaustionRate: null,
    source: "KIS",
    updatedAt: quote.asOf || FOREIGN_OWNERSHIP_NOT_AVAILABLE_MESSAGE,
  };
}
