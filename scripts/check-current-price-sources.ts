import fs from "node:fs";
import path from "node:path";

import { resolveStockDisplayPrice } from "../lib/market/price-resolver";

const DIAGNOSTIC_STOCKS = [
  { symbol: "005930", stockName: "삼성전자", market: "KOSPI" },
  { symbol: "000660", stockName: "SK하이닉스", market: "KOSPI" },
  { symbol: "035420", stockName: "NAVER", market: "KOSPI" }
] as const;

type LocalKisDiagnostic = {
  quoteStatus: "success" | "skipped" | "no_data" | "error";
  parsedPrice: number | null;
  source: "KIS" | "none";
  updatedAt: string | null;
  errorMessage: string | null;
  tokenErrorMessage: string | null;
};

type LocalExternalDiagnostic = {
  enabled: boolean;
  status: "disabled" | "missing_key" | "success" | "no_data" | "error";
  price: number | null;
  updatedAt: string | null;
  errorMessage: string | null;
};

type LocalRecentCloseDiagnostic = {
  status: "success" | "no_data" | "error";
  recentClose: number | null;
  baseDate: string | null;
  errorMessage: string | null;
};

function loadLocalEnvFile() {
  const envPath = path.join(process.cwd(), ".env.local");
  if (!fs.existsSync(envPath)) return;

  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex <= 0) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

function safeText(value: string | null | undefined) {
  if (typeof value !== "string") return "N/A";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "N/A";
}

function safeNumber(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) ? String(value) : "N/A";
}

function toNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value.replaceAll(",", "").trim());
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toStringValue(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function formatKisAsOf(baseDateRaw: unknown, baseTimeRaw: unknown) {
  const baseDate = toStringValue(baseDateRaw);
  const baseTime = toStringValue(baseTimeRaw);
  if (baseDate && baseTime && /^\d{8}$/.test(baseDate) && /^\d{4,6}$/.test(baseTime)) {
    const paddedTime = baseTime.padStart(6, "0");
    return `${baseDate.slice(0, 4)}-${baseDate.slice(4, 6)}-${baseDate.slice(6, 8)} ${paddedTime.slice(
      0,
      2
    )}:${paddedTime.slice(2, 4)} KST`;
  }

  return null;
}

async function diagnoseKis(symbol: string): Promise<LocalKisDiagnostic> {
  const appKey = process.env.KIS_APP_KEY?.trim();
  const appSecret = process.env.KIS_APP_SECRET?.trim();
  const baseUrl =
    process.env.KIS_BASE_URL?.replace(/\/$/, "") || "https://openapi.koreainvestment.com:9443";

  if (!appKey || !appSecret) {
    return {
      quoteStatus: "skipped",
      parsedPrice: null,
      source: "none",
      updatedAt: null,
      errorMessage: "KIS credentials are not configured.",
      tokenErrorMessage: "KIS credentials are not configured."
    };
  }

  try {
    const tokenResponse = await fetch(`${baseUrl}/oauth2/tokenP`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        grant_type: "client_credentials",
        appkey: appKey,
        appsecret: appSecret
      }),
      cache: "no-store"
    });

    const tokenPayload = (await tokenResponse.json().catch(() => null)) as Record<string, unknown> | null;
    const accessToken = toStringValue(tokenPayload?.access_token);
    if (!tokenResponse.ok || !accessToken) {
      const tokenErrorMessage =
        toStringValue(tokenPayload?.msg1) ??
        toStringValue(tokenPayload?.msg_cd) ??
        `Failed to issue KIS token (${tokenResponse.status}).`;
      return {
        quoteStatus: "skipped",
        parsedPrice: null,
        source: "none",
        updatedAt: null,
        errorMessage: "KIS quote skipped because token issuance failed.",
        tokenErrorMessage
      };
    }

    const quoteResponse = await fetch(`${baseUrl}/uapi/domestic-stock/v1/quotations/inquire-price`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        appkey: appKey,
        appsecret: appSecret,
        tr_id: "FHKST01010100"
      },
      cache: "no-store"
    });

    const quotePayload = (await quoteResponse.json().catch(() => null)) as
      | Record<string, unknown>
      | null;
    const output =
      quotePayload && typeof quotePayload.output === "object" && quotePayload.output
        ? (quotePayload.output as Record<string, unknown>)
        : null;
    const rawPrice = toStringValue(output?.stck_prpr);
    const parsedPrice = toNumber(rawPrice);

    if (!quoteResponse.ok) {
      return {
        quoteStatus: "error",
        parsedPrice: null,
        source: "none",
        updatedAt: null,
        errorMessage:
          toStringValue(quotePayload?.msg1) ??
          toStringValue(quotePayload?.msg_cd) ??
          `KIS quote request failed (${quoteResponse.status}).`,
        tokenErrorMessage: null
      };
    }

    if (!parsedPrice || parsedPrice <= 0) {
      return {
        quoteStatus: "no_data",
        parsedPrice: null,
        source: "none",
        updatedAt: formatKisAsOf(output?.stck_bsop_date, output?.stck_cntg_hour),
        errorMessage: "KIS quote response did not include a valid current price.",
        tokenErrorMessage: null
      };
    }

    return {
      quoteStatus: "success",
      parsedPrice,
      source: "KIS",
      updatedAt: formatKisAsOf(output?.stck_bsop_date, output?.stck_cntg_hour),
      errorMessage: null,
      tokenErrorMessage: null
    };
  } catch (error) {
    return {
      quoteStatus: "error",
      parsedPrice: null,
      source: "none",
      updatedAt: null,
      errorMessage: error instanceof Error ? error.message : "Failed to fetch KIS quote.",
      tokenErrorMessage: null
    };
  }
}

function encodeServiceKey(apiKey: string) {
  return apiKey.includes("%") ? apiKey : encodeURIComponent(apiKey);
}

async function diagnoseRecentClose(symbol: string): Promise<LocalRecentCloseDiagnostic> {
  const apiKey = process.env.DATA_GO_KR_API_KEY?.trim();
  if (!apiKey) {
    return {
      status: "error",
      recentClose: null,
      baseDate: null,
      errorMessage: "DATA_GO_KR_API_KEY is not configured."
    };
  }

  const params = new URLSearchParams({
    beginBasDt: "20240101",
    endBasDt: "20261231",
    likeSrtnCd: symbol,
    numOfRows: "30",
    pageNo: "1",
    resultType: "json"
  });
  const url =
    `https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo` +
    `?serviceKey=${encodeServiceKey(apiKey)}&${params.toString()}`;

  try {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) {
      return {
        status: "error",
        recentClose: null,
        baseDate: null,
        errorMessage: `data.go.kr HTTP ${response.status}`
      };
    }

    const payload = (await response.json().catch(() => null)) as Record<string, unknown> | null;
    const itemsValue = (payload?.response as Record<string, unknown> | undefined)?.body as
      | Record<string, unknown>
      | undefined;
    const rawItems = (itemsValue?.items as Record<string, unknown> | undefined)?.item;
    const normalizedItems = Array.isArray(rawItems) ? rawItems : rawItems ? [rawItems] : [];
    const matchedItems = normalizedItems
      .filter((item) => typeof item === "object" && item !== null)
      .map((item) => item as Record<string, unknown>)
      .filter((item) => toStringValue(item.srtnCd) === symbol)
      .sort((left, right) => String(left.basDt ?? "").localeCompare(String(right.basDt ?? "")));

    const latest = matchedItems[matchedItems.length - 1];
    if (!latest) {
      return {
        status: "no_data",
        recentClose: null,
        baseDate: null,
        errorMessage: null
      };
    }

    const recentClose = toNumber(latest.clpr);
    const baseDateRaw = toStringValue(latest.basDt);
    const baseDate =
      baseDateRaw && /^\d{8}$/.test(baseDateRaw)
        ? `${baseDateRaw.slice(0, 4)}-${baseDateRaw.slice(4, 6)}-${baseDateRaw.slice(6, 8)}`
        : null;

    if (!recentClose || recentClose <= 0) {
      return {
        status: "no_data",
        recentClose: null,
        baseDate,
        errorMessage: "data.go.kr returned no valid recent close."
      };
    }

    return {
      status: "success",
      recentClose,
      baseDate,
      errorMessage: null
    };
  } catch (error) {
    return {
      status: "error",
      recentClose: null,
      baseDate: null,
      errorMessage: error instanceof Error ? error.message : "Failed to fetch recent close."
    };
  }
}

async function diagnoseExternal(symbol: string): Promise<LocalExternalDiagnostic> {
  const enabled = process.env.ENABLE_EXTERNAL_REFERENCE_PRICE === "true";
  if (!enabled) {
    return {
      enabled: false,
      status: "disabled",
      price: null,
      updatedAt: null,
      errorMessage: null
    };
  }

  const apiKey = process.env.FINNHUB_API_KEY?.trim();
  if (!apiKey) {
    return {
      enabled: true,
      status: "missing_key",
      price: null,
      updatedAt: null,
      errorMessage: "FINNHUB_API_KEY is not configured."
    };
  }

  try {
    const quoteResponse = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(`${symbol}.KS`)}&token=${encodeURIComponent(apiKey)}`,
      {
        method: "GET",
        cache: "no-store"
      }
    );
    const payload = (await quoteResponse.json().catch(() => null)) as Record<string, unknown> | null;

    if (!quoteResponse.ok) {
      return {
        enabled: true,
        status: "error",
        price: null,
        updatedAt: null,
        errorMessage:
          toStringValue(payload?.error) ?? `Finnhub quote request failed (${quoteResponse.status}).`
      };
    }

    const price = toNumber(payload?.c);
    if (!price || price <= 0) {
      return {
        enabled: true,
        status: "no_data",
        price: null,
        updatedAt: null,
        errorMessage: null
      };
    }

    const timestamp = toNumber(payload?.t);
    return {
      enabled: true,
      status: "success",
      price,
      updatedAt: timestamp && timestamp > 0 ? new Date(timestamp * 1000).toISOString() : null,
      errorMessage: null
    };
  } catch (error) {
    return {
      enabled: true,
      status: "error",
      price: null,
      updatedAt: null,
      errorMessage: error instanceof Error ? error.message : "External reference request failed."
    };
  }
}

async function run() {
  loadLocalEnvFile();

  for (const { symbol, stockName, market } of DIAGNOSTIC_STOCKS) {
    const [kis, external, recentClose] = await Promise.all([
      diagnoseKis(symbol),
      diagnoseExternal(symbol),
      diagnoseRecentClose(symbol)
    ]);

    const resolvedPrice = resolveStockDisplayPrice({
      symbol,
      market,
      kisQuote:
        kis.quoteStatus === "success" && Number.isFinite(kis.parsedPrice ?? NaN) && (kis.parsedPrice ?? 0) > 0
          ? {
              price: kis.parsedPrice,
              updatedAt: kis.updatedAt,
              asOf: kis.updatedAt
            }
          : null,
      kisQuoteSource: kis.source === "KIS" ? "KIS" : "none",
      dailyClose:
        recentClose.status === "success" &&
        Number.isFinite(recentClose.recentClose ?? NaN) &&
        (recentClose.recentClose ?? 0) > 0
          ? {
              price: recentClose.recentClose,
              baseDate: recentClose.baseDate,
              updatedAt: recentClose.baseDate,
              asOf: recentClose.baseDate
            }
          : null,
      dailyCloseSource: recentClose.status === "success" ? "data.go.kr" : "none",
      cachedPrice: recentClose.status === "success" ? recentClose.recentClose : null,
      cachedPriceSource: recentClose.status === "success" ? "cache" : "none"
    });

    console.log(
      [
        `symbol=${symbol}`,
        `stockName=${stockName}`,
        `kisStatus=${kis.quoteStatus}`,
        `kisPrice=${safeNumber(kis.parsedPrice)}`,
        `kisError=${safeText(kis.errorMessage ?? kis.tokenErrorMessage)}`,
        `externalStatus=${external.status}`,
        `externalPrice=${safeNumber(external.price)}`,
        `externalError=${safeText(external.errorMessage)}`,
        `recentClose=${safeNumber(recentClose.recentClose)}`,
        `recentCloseBaseDate=${safeText(recentClose.baseDate)}`,
        `resolvedPriceKind=${resolvedPrice.priceKind}`,
        `resolvedBasisKo=${resolvedPrice.basisKo}`
      ].join(" | ")
    );
  }
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : "Current price diagnostic failed.");
  process.exit(1);
});
