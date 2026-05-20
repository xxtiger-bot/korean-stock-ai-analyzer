import "server-only";

import type { RealtimeQuote } from "@/lib/types";

type KisTokenResponse = {
  access_token?: string;
  expires_in?: number | string;
};

type KisRealtimeOutput = {
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
  msg1?: string;
  output?: KisRealtimeOutput;
  output1?: KisRealtimeOutput;
};

const globalForKis = globalThis as typeof globalThis & {
  __kisRealtimeWarnings?: Set<string>;
  __kisAccessTokenCache?: {
    token: string;
    expiresAt: number;
  };
};

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

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function toNumber(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replaceAll(",", "").trim());
  return Number.isFinite(parsed) ? parsed : 0;
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

  // KIS에서 체결 시간 필드를 주지 않으면 서버 요청 시각으로 대체
  return formatRequestTime(requestTime);
}

export async function getKisAccessToken(): Promise<string | null> {
  const config = getKisConfig();
  if (!config) {
    warnOnce(
      "kis-config-missing",
      "[kis] Missing KIS_APP_KEY/KIS_APP_SECRET/KIS_BASE_URL. Realtime quote is disabled."
    );
    return null;
  }

  const cached = globalForKis.__kisAccessTokenCache;
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  const timeout = withTimeout(8_000);

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

    if (!response.ok) {
      throw new Error(`KIS token HTTP ${response.status}`);
    }

    const payload = (await response.json()) as KisTokenResponse;
    const token = payload.access_token?.trim();
    if (!token) {
      throw new Error("KIS token is empty");
    }

    const expiresIn = Number(payload.expires_in);
    const ttlMs =
      Number.isFinite(expiresIn) && expiresIn > 0
        ? expiresIn * 1000
        : 23 * 60 * 60 * 1000;

    globalForKis.__kisAccessTokenCache = {
      token,
      expiresAt: Date.now() + ttlMs
    };

    return token;
  } catch (error) {
    warnOnce(
      "kis-token-failed",
      `[kis] Failed to issue access token. ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return null;
  } finally {
    timeout.done();
  }
}

export async function getRealtimeQuote(code: string): Promise<RealtimeQuote | null> {
  const config = getKisConfig();
  if (!config) return null;

  const token = await getKisAccessToken();
  if (!token) return null;

  const normalizedCode = normalizeCode(code);
  if (!normalizedCode) return null;

  const params = new URLSearchParams({
    fid_cond_mrkt_div_code: "J",
    fid_input_iscd: normalizedCode
  });
  const timeout = withTimeout(8_000);
  const requestTime = new Date();
  const trId = process.env.KIS_QUOTE_TR_ID?.trim() || "FHKST01010100";

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

    if (!response.ok) {
      throw new Error(`KIS quote HTTP ${response.status}`);
    }

    const payload = (await response.json()) as KisRealtimeResponse;
    if (payload.rt_cd !== "0") {
      throw new Error(payload.msg1 || "KIS quote rt_cd is not 0");
    }

    const output = payload.output ?? payload.output1;
    if (!output) {
      throw new Error("KIS quote output is empty");
    }

    const price = toNumber(output.stck_prpr);
    if (price <= 0) {
      throw new Error("KIS quote price is invalid");
    }

    const rawChange = toNumber(output.prdy_vrss);
    const change = toSignedChange(rawChange, output.prdy_vrss_sign);
    const changeRate = toNumber(output.prdy_ctrt);

    return {
      symbol: normalizeCode(output.stck_shrn_iscd ?? normalizedCode),
      price,
      change,
      changeRate,
      volume: toNumber(output.acml_vol),
      source: "kis",
      asOf: formatAsOf(output.stck_bsop_date, output.stck_cntg_hour, requestTime)
    };
  } catch (error) {
    warnOnce(
      `kis-quote-failed:${normalizedCode}`,
      `[kis] Realtime quote unavailable for ${normalizedCode}. ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
    return null;
  } finally {
    timeout.done();
  }
}
