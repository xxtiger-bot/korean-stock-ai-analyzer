import { constants as cryptoConstants } from "node:crypto";
import https from "node:https";
import type { TLSSocket } from "node:tls";

import type { ForeignOwnershipData, RealtimeQuote } from "@/lib/types";

type KisAccessTokenResponse = {
  access_token?: string;
  token_type?: string;
  access_token_token_expired?: string;
  expires_in?: number | string;
  rt_cd?: string;
  msg_cd?: string;
  msg1?: string;
  error_code?: string;
  error_description?: string;
};

type KisAccessTokenCacheState = {
  token: string | null;
  expiresAtMs: number;
  lastIssuedAtMs: number;
  lastRequestedAtMs: number;
  lastRequestAtIso: string | null;
  lastErrorAtIso: string | null;
  lastErrorMessage: string | null;
  lastErrorCode: string | null;
  lastStatus: KisTokenEndpointStatus | null;
  lastHttpStatus: number | null;
  lastElapsedMs: number | null;
  lastResponseKeys: string[];
  lastTokenEndpoint: string | null;
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
type KisTokenRequestMethod = "fetch" | "normal_https_request" | "legacy_tls_https_request";

type KisQuoteDebugValue = string | null;

type KisQuoteRequestResult = {
  output: Record<string, unknown>;
  requestSymbol: string;
  requestUrlPath: string;
  hasMarketDivCodeParam: boolean;
  hasInputIscdParam: boolean;
  trId: string;
  rawResponseKeys: string[];
  rawPriceCandidateFields: Record<string, KisQuoteDebugValue>;
  rawRtCd: string | null;
  rawMsgCd: string | null;
  rawMsg1: string | null;
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
  tokenStatus: KisTokenEndpointStatus;
  tokenRequestMethod: KisTokenRequestMethod;
  tokenEndpoint: string;
  tokenHttpStatus: number | null;
  tokenElapsedMs: number | null;
  tokenResponseKeys: string[];
  tokenHasAccessToken: boolean;
  tokenTlsSocketProtocol: string | null;
  tokenErrorCode: string | null;
  tokenErrorName: string | null;
  tokenErrorMessage: string | null;
  tokenErrorCause: string | null;
  tokenLikelyCooldownIssue: boolean;
  tokenLikelyPermissionIssue: boolean;
  tokenLikelyEndpointIssue: boolean;
  tokenLikelyMockAccountIssue: boolean;
  tokenSource: KisTokenSource | "none";
  tokenExpiresAt: string | null;
  quoteStatus: "success" | "skipped" | "no_data" | "error";
  requestSymbol: string;
  requestUrlPath: string;
  hasMarketDivCodeParam: boolean;
  hasInputIscdParam: boolean;
  trId: string;
  rawResponseKeys: string[];
  rawPriceCandidateFields: Record<string, KisQuoteDebugValue>;
  rawRtCd: string | null;
  rawMsgCd: string | null;
  rawMsg1: string | null;
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

export type KisEnvironmentDiagnostic = {
  baseUrlConfigured: boolean;
  baseUrl: string;
  appKeyConfigured: boolean;
  appKeyMasked: string | null;
  appSecretConfigured: boolean;
  appSecretMasked: string | null;
  nodeEnv: string;
  vercel: boolean;
  vercelEnv: string | null;
};

export type KisTokenEndpointStatus =
  | "success"
  | "missing_env"
  | "network_fetch_failed"
  | "timeout"
  | "http_error"
  | "kis_error_response"
  | "invalid_token_response";

export type KisTokenEndpointDiagnostic = {
  requestMethod: KisTokenRequestMethod;
  baseUrl: string;
  tokenEndpoint: string;
  status: KisTokenEndpointStatus;
  httpStatus: number | null;
  elapsedMs: number | null;
  responseKeys: string[];
  hasAccessToken: boolean;
  tlsSocketProtocol: string | null;
  errorCode: string | null;
  errorName: string | null;
  errorMessage: string | null;
  errorCause: string | null;
  environment: KisEnvironmentDiagnostic;
};

const TOKEN_REQUEST_COOLDOWN_MS = 5_000;
const TOKEN_REUSE_BUFFER_MS = 5 * 60_000;
const TOKEN_DEFAULT_TTL_MS = 6 * 60 * 60_000;
const QUOTE_CACHE_TTL_MS = 15_000;
const QUOTE_MIN_INTERVAL_MS = 1_500;
const QUOTE_RETRY_DELAY_MS = 500;
const TOKEN_FETCH_TIMEOUT_MS = 8_000;
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
    requestUrlPath: string;
    hasMarketDivCodeParam: boolean;
    hasInputIscdParam: boolean;
    trId: string;
    rawResponseKeys: string[];
    rawPriceCandidateFields: Record<string, KisQuoteDebugValue>;
    rawRtCd: string | null;
    rawMsgCd: string | null;
    rawMsg1: string | null;
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

class KisTokenRequestError extends Error {
  diagnostic: KisTokenEndpointDiagnostic;
  constructor(message: string, diagnostic: KisTokenEndpointDiagnostic) {
    super(message);
    this.name = "KisTokenRequestError";
    this.diagnostic = diagnostic;
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

function maskSecret(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 6) {
    return `${trimmed.slice(0, 2)}***`;
  }
  return `${trimmed.slice(0, 4)}***${trimmed.slice(-2)}`;
}

function extractErrorCause(error: unknown) {
  if (!(error instanceof Error)) return null;
  const cause = (error as Error & { cause?: unknown }).cause;
  if (cause instanceof Error) {
    return cause.message;
  }
  if (typeof cause === "string") {
    return cause;
  }
  if (cause && typeof cause === "object") {
    try {
      return JSON.stringify(cause);
    } catch {
      return String(cause);
    }
  }
  return null;
}

function getTokenErrorParts(payload: KisAccessTokenResponse) {
  const errorCode = asString(payload.error_code) ?? asString(payload.msg_cd) ?? null;
  const errorMessage =
    asString(payload.error_description) ?? asString(payload.msg1) ?? asString(payload.msg_cd) ?? null;

  return { errorCode, errorMessage };
}

export function getKisEnvironmentDiagnostic(): KisEnvironmentDiagnostic {
  const appKey = process.env.KIS_APP_KEY?.trim();
  const appSecret = process.env.KIS_APP_SECRET?.trim();
  const baseUrlRaw = process.env.KIS_BASE_URL?.trim();
  const baseUrl = baseUrlRaw?.replace(/\/$/, "") || "https://openapi.koreainvestment.com:9443";

  return {
    baseUrlConfigured: Boolean(baseUrlRaw),
    baseUrl,
    appKeyConfigured: Boolean(appKey),
    appKeyMasked: maskSecret(appKey),
    appSecretConfigured: Boolean(appSecret),
    appSecretMasked: maskSecret(appSecret),
    nodeEnv: process.env.NODE_ENV?.trim() || "development",
    vercel: Boolean(process.env.VERCEL),
    vercelEnv: process.env.VERCEL_ENV?.trim() || null
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

function buildTokenDiagnostic(params: {
  requestMethod: KisTokenRequestMethod;
  baseUrl: string;
  tokenEndpoint: string;
  status: KisTokenEndpointStatus;
  httpStatus: number | null;
  elapsedMs: number | null;
  responseKeys?: string[];
  hasAccessToken?: boolean;
  tlsSocketProtocol?: string | null;
  errorCode?: string | null;
  errorName?: string | null;
  errorMessage?: string | null;
  errorCause?: string | null;
}): KisTokenEndpointDiagnostic {
  return {
    requestMethod: params.requestMethod,
    baseUrl: params.baseUrl,
    tokenEndpoint: params.tokenEndpoint,
    status: params.status,
    httpStatus: params.httpStatus,
    elapsedMs: params.elapsedMs,
    responseKeys: params.responseKeys ?? [],
    hasAccessToken: params.hasAccessToken ?? false,
    tlsSocketProtocol: params.tlsSocketProtocol ?? null,
    errorCode: params.errorCode ?? null,
    errorName: params.errorName ?? null,
    errorMessage: params.errorMessage ?? null,
    errorCause: params.errorCause ?? null,
    environment: getKisEnvironmentDiagnostic()
  };
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
    normalized.includes("timed out") ||
    normalized.includes("abort") ||
    normalized.includes("timeout") ||
    normalized.includes("temporary")
  );
}

function getTokenEndpoint(baseUrl: string) {
  return `${baseUrl}/oauth2/tokenP`;
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
    lastErrorCode: null,
    lastStatus: null,
    lastHttpStatus: null,
    lastElapsedMs: null,
    lastResponseKeys: [],
    lastTokenEndpoint: null,
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

async function requestKisTokenEndpoint(
  baseUrl: string,
  appKey: string,
  appSecret: string
): Promise<{
  diagnostic: KisTokenEndpointDiagnostic;
  accessToken: string | null;
  expiresAtMs: number | null;
}> {
  const tokenEndpoint = getTokenEndpoint(baseUrl);
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), TOKEN_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(tokenEndpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: appKey,
        appsecret: appSecret
      }),
      cache: "no-store",
      signal: controller.signal
    });

    const rawPayload = await response.json().catch(() => null);
    if (!isRecord(rawPayload)) {
      return {
        diagnostic: buildTokenDiagnostic({
          requestMethod: "fetch",
          baseUrl,
          tokenEndpoint,
          status: "invalid_token_response",
          httpStatus: response.status,
          elapsedMs: Date.now() - startedAt,
          responseKeys: [],
          hasAccessToken: false,
          errorMessage: "Unexpected KIS token response format."
        }),
        accessToken: null,
        expiresAtMs: null
      };
    }

    const payload = parseTokenResponse(rawPayload);
    const responseKeys = getRawResponseKeys(rawPayload);
    const accessToken = asString(payload.access_token);
    const { errorCode, errorMessage } = getTokenErrorParts(payload);
    const elapsedMs = Date.now() - startedAt;

    if (!response.ok) {
      return {
        diagnostic: buildTokenDiagnostic({
          requestMethod: "fetch",
          baseUrl,
          tokenEndpoint,
          status: "http_error",
          httpStatus: response.status,
          elapsedMs,
          responseKeys,
          hasAccessToken: Boolean(accessToken),
          errorCode,
          errorMessage: errorMessage ?? `KIS token request failed (${response.status}).`
        }),
        accessToken: null,
        expiresAtMs: null
      };
    }

    if (!accessToken) {
      return {
        diagnostic: buildTokenDiagnostic({
          requestMethod: "fetch",
          baseUrl,
          tokenEndpoint,
          status: errorMessage ? "kis_error_response" : "invalid_token_response",
          httpStatus: response.status,
          elapsedMs,
          responseKeys,
          hasAccessToken: false,
          errorCode,
          errorMessage: errorMessage ?? "KIS token response did not include an access token."
        }),
        accessToken: null,
        expiresAtMs: null
      };
    }

    return {
      diagnostic: buildTokenDiagnostic({
        requestMethod: "fetch",
        baseUrl,
        tokenEndpoint,
        status: "success",
        httpStatus: response.status,
        elapsedMs,
        responseKeys,
        hasAccessToken: true,
        errorCode,
        errorMessage: null
      }),
      accessToken,
      expiresAtMs: parseTokenExpiryMs(payload)
    };
  } catch (error) {
    const isTimeout =
      (error instanceof DOMException && error.name === "AbortError") ||
      (error instanceof Error && error.name === "AbortError");

    return {
      diagnostic: buildTokenDiagnostic({
        requestMethod: "fetch",
        baseUrl,
        tokenEndpoint,
        status: isTimeout ? "timeout" : "network_fetch_failed",
        httpStatus: null,
        elapsedMs: Date.now() - startedAt,
        responseKeys: [],
        hasAccessToken: false,
        errorName: error instanceof Error ? error.name : null,
        errorMessage:
          error instanceof Error
            ? error.message
            : isTimeout
              ? `KIS token request timed out after ${TOKEN_FETCH_TIMEOUT_MS}ms.`
              : "KIS token request failed.",
        errorCause: extractErrorCause(error)
      }),
      accessToken: null,
      expiresAtMs: null
    };
  } finally {
    clearTimeout(timeoutHandle);
  }
}

export async function diagnoseKisTokenEndpointViaHttps(
  baseUrlOverride?: string,
  mode: Extract<KisTokenRequestMethod, "normal_https_request" | "legacy_tls_https_request"> = "normal_https_request"
): Promise<KisTokenEndpointDiagnostic> {
  const environment = getKisEnvironmentDiagnostic();
  const baseUrl = baseUrlOverride?.replace(/\/$/, "") || environment.baseUrl;
  const tokenEndpoint = getTokenEndpoint(baseUrl);
  const appKey = process.env.KIS_APP_KEY?.trim();
  const appSecret = process.env.KIS_APP_SECRET?.trim();

  if (!appKey || !appSecret) {
    return buildTokenDiagnostic({
      requestMethod: mode,
      baseUrl,
      tokenEndpoint,
      status: "missing_env",
      httpStatus: null,
      elapsedMs: null,
      hasAccessToken: false,
      errorMessage: "KIS credentials are not configured."
    });
  }

  const requestBody = JSON.stringify({
    grant_type: "client_credentials",
    appkey: appKey,
    appsecret: appSecret
  });

  return new Promise((resolve) => {
    const startedAt = Date.now();
    const url = new URL(tokenEndpoint);
    let settled = false;
    let timedOut = false;
    const legacyOption =
      mode === "legacy_tls_https_request" && typeof cryptoConstants.SSL_OP_LEGACY_SERVER_CONNECT === "number"
        ? cryptoConstants.SSL_OP_LEGACY_SERVER_CONNECT
        : undefined;
    const agent =
      mode === "legacy_tls_https_request"
        ? new https.Agent(legacyOption ? { secureOptions: legacyOption } : {})
        : undefined;

    const finish = (diagnostic: KisTokenEndpointDiagnostic) => {
      if (!settled) {
        settled = true;
        resolve(diagnostic);
      }
    };

    const request = https.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : undefined,
        path: `${url.pathname}${url.search}`,
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Length": Buffer.byteLength(requestBody)
        },
        agent
      },
      (response) => {
        const chunks: string[] = [];
        const tlsSocket = response.socket as TLSSocket | undefined;
        const tlsSocketProtocol =
          typeof tlsSocket?.getProtocol === "function" ? tlsSocket.getProtocol() : null;

        response.setEncoding("utf8");
        response.on("data", (chunk) => {
          chunks.push(chunk);
        });
        response.on("end", () => {
          const rawText = chunks.join("");
          let rawPayload: unknown = null;
          try {
            rawPayload = rawText.length > 0 ? JSON.parse(rawText) : null;
          } catch {
            rawPayload = null;
          }

          const payload = isRecord(rawPayload) ? parseTokenResponse(rawPayload) : null;
          const responseKeys = isRecord(rawPayload) ? getRawResponseKeys(rawPayload) : [];
          const accessToken = payload ? asString(payload.access_token) : null;
          const { errorCode, errorMessage } = payload
            ? getTokenErrorParts(payload)
            : { errorCode: null, errorMessage: "Unexpected KIS token response format." };
          const elapsedMs = Date.now() - startedAt;

          if (!payload) {
            finish(
              buildTokenDiagnostic({
                requestMethod: mode,
                baseUrl,
                tokenEndpoint,
                status: "invalid_token_response",
                httpStatus: response.statusCode ?? null,
                elapsedMs,
                responseKeys,
                hasAccessToken: false,
                tlsSocketProtocol,
                errorMessage
              })
            );
            return;
          }

          if ((response.statusCode ?? 0) < 200 || (response.statusCode ?? 0) >= 300) {
            finish(
              buildTokenDiagnostic({
                requestMethod: mode,
                baseUrl,
                tokenEndpoint,
                status: "http_error",
                httpStatus: response.statusCode ?? null,
                elapsedMs,
                responseKeys,
                hasAccessToken: Boolean(accessToken),
                tlsSocketProtocol,
                errorCode,
                errorMessage: errorMessage ?? `KIS token request failed (${response.statusCode}).`
              })
            );
            return;
          }

          if (!accessToken) {
            finish(
              buildTokenDiagnostic({
                requestMethod: mode,
                baseUrl,
                tokenEndpoint,
                status: errorMessage ? "kis_error_response" : "invalid_token_response",
                httpStatus: response.statusCode ?? null,
                elapsedMs,
                responseKeys,
                hasAccessToken: false,
                tlsSocketProtocol,
                errorCode,
                errorMessage: errorMessage ?? "KIS token response did not include an access token."
              })
            );
            return;
          }

          finish(
            buildTokenDiagnostic({
              requestMethod: mode,
              baseUrl,
              tokenEndpoint,
              status: "success",
              httpStatus: response.statusCode ?? null,
              elapsedMs,
              responseKeys,
              hasAccessToken: true,
              tlsSocketProtocol,
              errorCode,
              errorMessage: null
            })
          );
        });
      }
    );

    request.setTimeout(TOKEN_FETCH_TIMEOUT_MS, () => {
      timedOut = true;
      request.destroy(new Error(`KIS token request timed out after ${TOKEN_FETCH_TIMEOUT_MS}ms.`));
    });

    request.on("error", (error) => {
      finish(
        buildTokenDiagnostic({
          requestMethod: mode,
          baseUrl,
          tokenEndpoint,
          status: timedOut ? "timeout" : "network_fetch_failed",
          httpStatus: null,
          elapsedMs: Date.now() - startedAt,
          responseKeys: [],
          hasAccessToken: false,
          errorName: error.name,
          errorCode: null,
          errorMessage: error.message,
          errorCause: extractErrorCause(error)
        })
      );
    });

    request.write(requestBody);
    request.end();
  });
}

export async function diagnoseKisTokenEndpoint(
  baseUrlOverride?: string
): Promise<KisTokenEndpointDiagnostic> {
  const environment = getKisEnvironmentDiagnostic();
  const baseUrl = baseUrlOverride?.replace(/\/$/, "") || environment.baseUrl;
  const tokenEndpoint = getTokenEndpoint(baseUrl);
  const appKey = process.env.KIS_APP_KEY?.trim();
  const appSecret = process.env.KIS_APP_SECRET?.trim();

  if (!appKey || !appSecret) {
    return buildTokenDiagnostic({
      requestMethod: "fetch",
      baseUrl,
      tokenEndpoint,
      status: "missing_env",
      httpStatus: null,
      elapsedMs: null,
      responseKeys: [],
      hasAccessToken: false,
      errorMessage: "KIS credentials are not configured."
    });
  }

  const result = await requestKisTokenEndpoint(baseUrl, appKey, appSecret);
  return result.diagnostic;
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

function buildKisQuoteRequest(code: string, baseUrl: string) {
  const url = new URL("/uapi/domestic-stock/v1/quotations/inquire-price", baseUrl);
  url.searchParams.set("FID_COND_MRKT_DIV_CODE", "J");
  url.searchParams.set("FID_INPUT_ISCD", code.trim());

  return {
    url,
    requestUrlPath: `${url.pathname}${url.search}`,
    hasMarketDivCodeParam: url.searchParams.has("FID_COND_MRKT_DIV_CODE"),
    hasInputIscdParam: url.searchParams.has("FID_INPUT_ISCD")
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
  const quoteRequest = buildKisQuoteRequest(code, baseUrl);

  const response = await fetch(quoteRequest.url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      appkey: appKey,
      appsecret: appSecret,
      tr_id: KIS_QUOTE_TR_ID,
      custtype: "P"
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
  const rawRtCd = asString(payload?.rt_cd);
  const rawMsgCd = asString(payload?.msg_cd);
  const rawMsg1 = asString(payload?.msg1);

  if (!response.ok) {
    throw new KisQuoteRequestError(
      meta.message ?? `KIS quote request failed (${response.status}).`,
      requestTime,
      {
        requestSymbol: code.trim(),
        requestUrlPath: quoteRequest.requestUrlPath,
        hasMarketDivCodeParam: quoteRequest.hasMarketDivCodeParam,
        hasInputIscdParam: quoteRequest.hasInputIscdParam,
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        rawRtCd,
        rawMsgCd,
        rawMsg1,
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
        requestUrlPath: quoteRequest.requestUrlPath,
        hasMarketDivCodeParam: quoteRequest.hasMarketDivCodeParam,
        hasInputIscdParam: quoteRequest.hasInputIscdParam,
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        rawRtCd,
        rawMsgCd,
        rawMsg1,
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
        requestUrlPath: quoteRequest.requestUrlPath,
        hasMarketDivCodeParam: quoteRequest.hasMarketDivCodeParam,
        hasInputIscdParam: quoteRequest.hasInputIscdParam,
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        rawRtCd,
        rawMsgCd,
        rawMsg1,
        errorCode,
        noDataReason: "empty_response",
        statusCode: response.status
      },
      true
    );
  }

  const parsedPrice = toNumber(findOutputValue(output, ["stck_prpr"]));
  if (!parsedPrice || parsedPrice <= 0) {
    const noDataReason = rawPriceCandidateFields.stck_prpr ? "invalid_current_price" : "missing_stck_prpr";
    throw new KisQuoteRequestError(
      "KIS quote response did not include a valid current price.",
      requestTime,
      {
        requestSymbol: code.trim(),
        requestUrlPath: quoteRequest.requestUrlPath,
        hasMarketDivCodeParam: quoteRequest.hasMarketDivCodeParam,
        hasInputIscdParam: quoteRequest.hasInputIscdParam,
        trId: KIS_QUOTE_TR_ID,
        rawResponseKeys,
        rawPriceCandidateFields,
        rawRtCd,
        rawMsgCd,
        rawMsg1,
        errorCode,
        noDataReason,
        statusCode: response.status
      },
      true
    );
  }

  return {
    output,
    requestSymbol: code.trim(),
    requestUrlPath: quoteRequest.requestUrlPath,
    hasMarketDivCodeParam: quoteRequest.hasMarketDivCodeParam,
    hasInputIscdParam: quoteRequest.hasInputIscdParam,
    trId: KIS_QUOTE_TR_ID,
    rawResponseKeys,
    rawPriceCandidateFields,
    rawRtCd,
    rawMsgCd,
    rawMsg1
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
      tokenStatus: "missing_env",
      tokenRequestMethod: "fetch",
      tokenEndpoint: getTokenEndpoint(config.baseUrl),
      tokenHttpStatus: null,
      tokenElapsedMs: null,
      tokenResponseKeys: [],
      tokenHasAccessToken: false,
      tokenTlsSocketProtocol: null,
      tokenErrorCode: null,
      tokenErrorName: null,
      tokenErrorMessage: "KIS credentials are not configured.",
      tokenErrorCause: null,
      tokenLikelyCooldownIssue: false,
      tokenLikelyPermissionIssue: false,
      tokenLikelyEndpointIssue: false,
      tokenLikelyMockAccountIssue: false,
      tokenSource: "none",
      tokenExpiresAt: null,
      quoteStatus: "skipped",
      requestSymbol: normalizedCode,
      requestUrlPath: buildKisQuoteRequest(normalizedCode, config.baseUrl).requestUrlPath,
      hasMarketDivCodeParam: true,
      hasInputIscdParam: true,
      trId: KIS_QUOTE_TR_ID,
      rawResponseKeys: [],
      rawPriceCandidateFields: getRawPriceCandidateFields(null),
      rawRtCd: null,
      rawMsgCd: null,
      rawMsg1: null,
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
  let tokenRequestMethod: KisCurrentQuoteDiagnostic["tokenRequestMethod"] = "fetch";
  let tokenErrorMessage: string | null = null;
  let tokenErrorCode: string | null = null;
  let tokenErrorName: string | null = null;
  let tokenErrorCause: string | null = null;
  let tokenSource: KisCurrentQuoteDiagnostic["tokenSource"] = "none";
  let tokenExpiresAt: string | null = tokenCache.expiresAtIso;
  let tokenEndpoint = getTokenEndpoint(config.baseUrl);
  let tokenHttpStatus: number | null = kisTokenCache.lastHttpStatus;
  let tokenElapsedMs: number | null = kisTokenCache.lastElapsedMs;
  let tokenResponseKeys: string[] = kisTokenCache.lastResponseKeys;
  let tokenHasAccessToken = false;
  let tokenTlsSocketProtocol: string | null = null;

  try {
    const tokenMeta = await getKisAccessTokenWithMeta();
    tokenSource = tokenMeta.source;
    tokenExpiresAt = tokenMeta.expiresAtIso;
    tokenStatus = tokenMeta.diagnostic.status;
    tokenRequestMethod = tokenMeta.diagnostic.requestMethod;
    tokenEndpoint = tokenMeta.diagnostic.tokenEndpoint;
    tokenHttpStatus = tokenMeta.diagnostic.httpStatus;
    tokenElapsedMs = tokenMeta.diagnostic.elapsedMs;
    tokenResponseKeys = tokenMeta.diagnostic.responseKeys;
    tokenHasAccessToken = tokenMeta.diagnostic.hasAccessToken;
    tokenTlsSocketProtocol = tokenMeta.diagnostic.tlsSocketProtocol;
    tokenErrorName = tokenMeta.diagnostic.errorName;
    tokenErrorCause = tokenMeta.diagnostic.errorCause;
  } catch (error) {
    if (error instanceof KisTokenRequestError) {
      tokenStatus = error.diagnostic.status;
      tokenRequestMethod = error.diagnostic.requestMethod;
      tokenErrorMessage = error.diagnostic.errorMessage;
      tokenErrorCode = error.diagnostic.errorCode;
      tokenErrorName = error.diagnostic.errorName;
      tokenErrorCause = error.diagnostic.errorCause;
      tokenEndpoint = error.diagnostic.tokenEndpoint;
      tokenHttpStatus = error.diagnostic.httpStatus;
      tokenElapsedMs = error.diagnostic.elapsedMs;
      tokenResponseKeys = error.diagnostic.responseKeys;
      tokenHasAccessToken = error.diagnostic.hasAccessToken;
      tokenTlsSocketProtocol = error.diagnostic.tlsSocketProtocol;
    } else {
      tokenStatus = "network_fetch_failed";
      tokenErrorMessage =
        error instanceof Error ? error.message : "Failed to issue KIS access token.";
      tokenErrorCode = extractKisErrorCode(tokenErrorMessage);
      tokenErrorName = error instanceof Error ? error.name : null;
      tokenErrorCause = extractErrorCause(error);
    }
  }

  const tokenFlags = getFailureFlags(tokenErrorMessage, config.baseUrl);

  if (tokenStatus !== "success") {
    return {
      ...config,
      tokenStatus,
      tokenRequestMethod,
      tokenEndpoint,
      tokenHttpStatus,
      tokenElapsedMs,
      tokenResponseKeys,
      tokenHasAccessToken,
      tokenTlsSocketProtocol,
      tokenErrorCode,
      tokenErrorName,
      tokenErrorMessage,
      tokenErrorCause,
      tokenLikelyCooldownIssue: tokenFlags.likelyCooldownIssue,
      tokenLikelyPermissionIssue: tokenFlags.likelyPermissionIssue,
      tokenLikelyEndpointIssue: tokenFlags.likelyEndpointIssue,
      tokenLikelyMockAccountIssue: tokenFlags.likelyMockAccountIssue,
      tokenSource,
      tokenExpiresAt,
      quoteStatus: "skipped",
      requestSymbol: normalizedCode,
      requestUrlPath: buildKisQuoteRequest(normalizedCode, config.baseUrl).requestUrlPath,
      hasMarketDivCodeParam: true,
      hasInputIscdParam: true,
      trId: KIS_QUOTE_TR_ID,
      rawResponseKeys: [],
      rawPriceCandidateFields: getRawPriceCandidateFields(null),
      rawRtCd: null,
      rawMsgCd: null,
      rawMsg1: null,
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
  let requestUrlPath = buildKisQuoteRequest(normalizedCode, config.baseUrl).requestUrlPath;
  let hasMarketDivCodeParam = true;
  let hasInputIscdParam = true;
  let trId = KIS_QUOTE_TR_ID;
  let rawResponseKeys: string[] = [];
  let rawPriceCandidateFields = getRawPriceCandidateFields(null);
  let rawRtCd: string | null = null;
  let rawMsgCd: string | null = null;
  let rawMsg1: string | null = null;
  let noDataReason: string | null = null;

  try {
    const result = await fetchDomesticQuoteOutput(normalizedCode, new Date());
    const { output } = result;
    requestSymbol = result.requestSymbol;
    requestUrlPath = result.requestUrlPath;
    hasMarketDivCodeParam = result.hasMarketDivCodeParam;
    hasInputIscdParam = result.hasInputIscdParam;
    trId = result.trId;
    rawResponseKeys = result.rawResponseKeys;
    rawPriceCandidateFields = result.rawPriceCandidateFields;
    rawRtCd = result.rawRtCd;
    rawMsgCd = result.rawMsgCd;
    rawMsg1 = result.rawMsg1;
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
      requestUrlPath = error.details.requestUrlPath;
      hasMarketDivCodeParam = error.details.hasMarketDivCodeParam;
      hasInputIscdParam = error.details.hasInputIscdParam;
      trId = error.details.trId;
      rawResponseKeys = error.details.rawResponseKeys;
      rawPriceCandidateFields = error.details.rawPriceCandidateFields;
      rawRtCd = error.details.rawRtCd;
      rawMsgCd = error.details.rawMsgCd;
      rawMsg1 = error.details.rawMsg1;
      noDataReason = error.details.noDataReason;
    }
  }

  const quoteFlags = getFailureFlags(errorMessage, config.baseUrl);

  return {
    ...config,
    tokenStatus,
    tokenRequestMethod,
    tokenEndpoint,
    tokenHttpStatus,
    tokenElapsedMs,
    tokenResponseKeys,
    tokenHasAccessToken,
    tokenTlsSocketProtocol,
    tokenErrorCode,
    tokenErrorName,
    tokenErrorMessage,
    tokenErrorCause,
    tokenLikelyCooldownIssue: tokenFlags.likelyCooldownIssue,
    tokenLikelyPermissionIssue: tokenFlags.likelyPermissionIssue,
    tokenLikelyEndpointIssue: tokenFlags.likelyEndpointIssue,
    tokenLikelyMockAccountIssue: tokenFlags.likelyMockAccountIssue,
    tokenSource,
    tokenExpiresAt,
    quoteStatus,
    requestSymbol,
    requestUrlPath,
    hasMarketDivCodeParam,
    hasInputIscdParam,
    trId,
    rawResponseKeys,
    rawPriceCandidateFields,
    rawRtCd,
    rawMsgCd,
    rawMsg1,
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
  diagnostic: KisTokenEndpointDiagnostic;
}> {
  const config = getKisConfigSnapshot();
  const cachedDiagnostic: KisTokenEndpointDiagnostic = {
    requestMethod: "fetch",
    baseUrl: config.baseUrl,
    tokenEndpoint: kisTokenCache.lastTokenEndpoint ?? getTokenEndpoint(config.baseUrl),
    status: kisTokenCache.lastStatus ?? "success",
    httpStatus: kisTokenCache.lastHttpStatus,
    elapsedMs: kisTokenCache.lastElapsedMs,
    responseKeys: kisTokenCache.lastResponseKeys,
    hasAccessToken: Boolean(kisTokenCache.token),
    tlsSocketProtocol: null,
    errorCode: kisTokenCache.lastErrorCode,
    errorName: null,
    errorMessage: kisTokenCache.lastErrorMessage,
    errorCause: null,
    environment: getKisEnvironmentDiagnostic()
  };

  if (kisTokenCache.token && Date.now() < kisTokenCache.expiresAtMs - TOKEN_REUSE_BUFFER_MS) {
    return {
      token: kisTokenCache.token,
      source: "cache",
      expiresAtMs: kisTokenCache.expiresAtMs,
      expiresAtIso: toIso(kisTokenCache.expiresAtMs),
      issuedAtIso: toIso(kisTokenCache.lastIssuedAtMs),
      diagnostic: cachedDiagnostic
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
        const tokenResult = await requestKisTokenEndpoint(baseUrl, appKey, appSecret);
        const diagnostic = tokenResult.diagnostic;
        kisTokenCache.lastStatus = diagnostic.status;
        kisTokenCache.lastHttpStatus = diagnostic.httpStatus;
        kisTokenCache.lastElapsedMs = diagnostic.elapsedMs;
        kisTokenCache.lastResponseKeys = diagnostic.responseKeys;
        kisTokenCache.lastTokenEndpoint = diagnostic.tokenEndpoint;
        kisTokenCache.lastErrorCode = diagnostic.errorCode;
        kisTokenCache.lastErrorMessage = diagnostic.errorMessage;

        if (diagnostic.status !== "success") {
          throw new KisTokenRequestError(
            diagnostic.errorMessage ?? "Failed to issue KIS access token.",
            diagnostic
          );
        }

        const accessToken = tokenResult.accessToken;
        const expiresAtMs = tokenResult.expiresAtMs;

        if (!accessToken || !expiresAtMs) {
          throw new KisTokenRequestError("KIS token response did not include an access token.", {
            ...diagnostic,
            status: "invalid_token_response",
            errorMessage: "KIS token response did not include an access token."
          });
        }

        kisTokenCache.token = accessToken;
        kisTokenCache.expiresAtMs = expiresAtMs;
        kisTokenCache.lastIssuedAtMs = Date.now();
        kisTokenCache.lastErrorAtIso = null;
        kisTokenCache.lastErrorMessage = null;
        kisTokenCache.lastErrorCode = null;
        return accessToken;
      } catch (error) {
        kisTokenCache.lastErrorAtIso = new Date().toISOString();
        kisTokenCache.lastErrorMessage =
          error instanceof Error ? error.message : "Failed to issue KIS access token.";
        if (error instanceof KisTokenRequestError) {
          kisTokenCache.lastStatus = error.diagnostic.status;
          kisTokenCache.lastHttpStatus = error.diagnostic.httpStatus;
          kisTokenCache.lastElapsedMs = error.diagnostic.elapsedMs;
          kisTokenCache.lastResponseKeys = error.diagnostic.responseKeys;
          kisTokenCache.lastTokenEndpoint = error.diagnostic.tokenEndpoint;
          kisTokenCache.lastErrorCode = error.diagnostic.errorCode;
        }
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
    issuedAtIso: toIso(kisTokenCache.lastIssuedAtMs),
    diagnostic: {
      requestMethod: "fetch",
      baseUrl: config.baseUrl,
      tokenEndpoint: kisTokenCache.lastTokenEndpoint ?? getTokenEndpoint(config.baseUrl),
      status: kisTokenCache.lastStatus ?? "success",
      httpStatus: kisTokenCache.lastHttpStatus,
      elapsedMs: kisTokenCache.lastElapsedMs,
      responseKeys: kisTokenCache.lastResponseKeys,
      hasAccessToken: Boolean(kisTokenCache.token),
      tlsSocketProtocol: null,
      errorCode: kisTokenCache.lastErrorCode,
      errorName: null,
      errorMessage: kisTokenCache.lastErrorMessage,
      errorCause: null,
      environment: getKisEnvironmentDiagnostic()
    }
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
      const noDataReason = result.rawPriceCandidateFields.stck_prpr ? "invalid_current_price" : "missing_stck_prpr";
      throw new KisQuoteRequestError(
        "KIS quote response did not include a valid current price.",
        requestTime,
        {
          requestSymbol: result.requestSymbol,
          requestUrlPath: result.requestUrlPath,
          hasMarketDivCodeParam: result.hasMarketDivCodeParam,
          hasInputIscdParam: result.hasInputIscdParam,
          trId: result.trId,
          rawResponseKeys: result.rawResponseKeys,
          rawPriceCandidateFields: result.rawPriceCandidateFields,
          rawRtCd: result.rawRtCd,
          rawMsgCd: result.rawMsgCd,
          rawMsg1: result.rawMsg1,
          errorCode: null,
          noDataReason,
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
