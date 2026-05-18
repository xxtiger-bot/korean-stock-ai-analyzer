import "server-only";

import type { Candle, MarketIndex, MarketSignal, Stock } from "@/lib/types";

type ProviderMarketOverview = {
  indices: MarketIndex[];
  signals: MarketSignal[];
};

const krxEndpoints = {
  stockDetail: "",
  stockCandles: "",
  stockSearch: "",
  marketOverview: ""
} as const;

function getApiKey() {
  return process.env.KRX_API_KEY;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

export function getStockDetailFromKrx(code: string): Stock | null {
  const apiKey = getApiKey();
  const normalizedCode = normalizeCode(code);

  if (!apiKey || !normalizedCode || !krxEndpoints.stockDetail) {
    return null;
  }

  // TODO: Request krxEndpoints.stockDetail with apiKey and normalizedCode,
  // then map the response into the Stock type used by the app.
  return null;
}

export function getStockCandlesFromKrx(code: string): Candle[] | null {
  const apiKey = getApiKey();
  const normalizedCode = normalizeCode(code);

  if (!apiKey || !normalizedCode || !krxEndpoints.stockCandles) {
    return null;
  }

  // TODO: Request krxEndpoints.stockCandles with apiKey and normalizedCode,
  // then map the response into daily OHLCV Candle[].
  return null;
}

export function searchStocksFromKrx(keyword: string): Stock[] | null {
  const apiKey = getApiKey();
  const normalizedKeyword = keyword.trim();

  if (!apiKey || !krxEndpoints.stockSearch) {
    return null;
  }

  // TODO: Request krxEndpoints.stockSearch with apiKey and normalizedKeyword,
  // then map the response into Stock[].
  void normalizedKeyword;
  return null;
}

export function getMarketOverviewFromKrx(): ProviderMarketOverview | null {
  const apiKey = getApiKey();

  if (!apiKey || !krxEndpoints.marketOverview) {
    return null;
  }

  // TODO: Request krxEndpoints.marketOverview with apiKey,
  // then map the response into MarketIndex[] and MarketSignal[].
  return null;
}
