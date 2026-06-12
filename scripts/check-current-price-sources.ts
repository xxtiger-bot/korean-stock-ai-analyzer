import fs from "node:fs";
import path from "node:path";

import { resolveStockDisplayPrice } from "../lib/market/price-resolver";
import { diagnoseKisCurrentQuote } from "../lib/providers/kis";

const DIAGNOSTIC_STOCKS = [
  { symbol: "005930", stockName: "삼성전자", market: "KOSPI" },
  { symbol: "000660", stockName: "SK하이닉스", market: "KOSPI" },
  { symbol: "035420", stockName: "NAVER", market: "KOSPI" }
] as const;

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

  const results = [];

  for (const { symbol, stockName, market } of DIAGNOSTIC_STOCKS) {
    const [kis, external, recentClose] = await Promise.all([
      diagnoseKisCurrentQuote(symbol),
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

    results.push({ symbol, stockName, kis, external, recentClose, resolvedPrice });
  }

  const issuedAtValues = results
    .map((result) => result.kis.tokenCache.lastIssuedAtIso)
    .filter((value): value is string => typeof value === "string" && value.length > 0);
  const sharedTokenReused =
    issuedAtValues.length === DIAGNOSTIC_STOCKS.length &&
    new Set(issuedAtValues).size === 1 &&
    results.slice(1).every((result) => result.kis.tokenSource === "cache");

  for (const { symbol, stockName, kis, external, recentClose, resolvedPrice } of results) {
    console.log(
      [
        `symbol=${symbol}`,
        `stockName=${stockName}`,
        `tokenStatus=${kis.tokenStatus}`,
        `tokenSource=${kis.tokenSource}`,
        `tokenExpiresAt=${safeText(kis.tokenExpiresAt)}`,
        `sharedTokenReused=${sharedTokenReused ? "yes" : "no"}`,
        `kisStatus=${kis.quoteStatus}`,
        `requestUrlPath=${safeText(kis.requestUrlPath)}`,
        `hasMarketDivCodeParam=${kis.hasMarketDivCodeParam ? "yes" : "no"}`,
        `hasInputIscdParam=${kis.hasInputIscdParam ? "yes" : "no"}`,
        `trId=${safeText(kis.trId)}`,
        `kisPrice=${safeNumber(kis.parsedPrice)}`,
        `kisRtCd=${safeText(kis.rawRtCd)}`,
        `kisMsgCd=${safeText(kis.rawMsgCd)}`,
        `kisMsg1=${safeText(kis.rawMsg1)}`,
        `kisRawResponseKeys=${kis.rawResponseKeys.join(",") || "N/A"}`,
        `kisRawPriceFields=${JSON.stringify(kis.rawPriceCandidateFields)}`,
        `kisError=${safeText(kis.tokenErrorMessage ?? kis.errorMessage)}`,
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
