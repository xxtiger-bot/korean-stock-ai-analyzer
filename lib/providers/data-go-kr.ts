import "server-only";

import type { Candle, MarketIndex, MarketSignal, Stock } from "@/lib/types";
import { buildTechnicalSeries } from "@/lib/indicators";

type ProviderMarketOverview = {
  indices: MarketIndex[];
  signals: MarketSignal[];
};

const dataGoKrEndpoints = {
  stockPrice:
    "https://apis.data.go.kr/1160100/service/GetStockSecuritiesInfoService/getStockPriceInfo",
  stockSearch: "",
  marketOverview:
    "https://apis.data.go.kr/1160100/service/GetMarketIndexInfoService/getStockMarketIndex"
} as const;

type DataGoKrStockPriceItem = {
  basDt?: string;
  srtnCd?: string;
  isinCd?: string;
  itmsNm?: string;
  mrktCtg?: string;
  mrktCls?: string;
  clpr?: string;
  vs?: string;
  fltRt?: string;
  mkp?: string;
  hipr?: string;
  lopr?: string;
  trqu?: string;
  trPrc?: string;
  lstgStCnt?: string;
  mrktTotAmt?: string;
};

type DataGoKrMarketIndexItem = {
  basDt?: string;
  idxNm?: string;
  idxCsf?: string;
  clpr?: string;
  vs?: string;
  fltRt?: string;
  mkp?: string;
  hipr?: string;
  lopr?: string;
  trqu?: string;
  trPrc?: string;
  lstgMrktTotAmt?: string;
};

const stockPriceCache = new Map<string, Promise<DataGoKrStockPriceItem[] | null>>();
let marketIndexCache: Promise<DataGoKrMarketIndexItem[] | null> | undefined;
let marketIndexFieldWarningShown = false;
const targetMarketIndexNames = ["코스피", "코스닥", "KRX 300"] as const;

function getApiKey() {
  const apiKey = process.env.DATA_GO_KR_API_KEY;
  return apiKey && apiKey !== "PASTE_YOUR_DATA_GO_KR_KEY_HERE" ? apiKey : undefined;
}

function normalizeCode(code: string) {
  return code.trim().toUpperCase();
}

function encodeServiceKey(apiKey: string) {
  return apiKey.includes("%") ? apiKey : encodeURIComponent(apiKey);
}

function toNumber(value: string | undefined) {
  if (!value) return 0;
  const parsed = Number(value.replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : 0;
}

function toPercent(value: string | undefined) {
  return toNumber(value);
}

function normalizeItems<T>(rawItems: T | T[] | null | undefined): T[] {
  if (!rawItems) return [];
  return Array.isArray(rawItems) ? rawItems : [rawItems];
}

function toMarket(market: string | undefined): Stock["market"] {
  return market?.toUpperCase().includes("KOSDAQ") ? "KOSDAQ" : "KOSPI";
}

function formatBasDt(basDt: string) {
  return `${basDt.slice(0, 4)}-${basDt.slice(4, 6)}-${basDt.slice(6, 8)}`;
}

function hasValue(value: string | undefined) {
  return Boolean(value && value.trim());
}

function isValidPriceItem(item: DataGoKrStockPriceItem) {
  return (
    hasValue(item.basDt) &&
    hasValue(item.srtnCd) &&
    hasValue(item.itmsNm) &&
    hasValue(item.clpr) &&
    hasValue(item.mkp) &&
    hasValue(item.hipr) &&
    hasValue(item.lopr) &&
    hasValue(item.trqu)
  );
}

function normalizeIndexName(value: string | undefined) {
  return value?.replace(/\s+/g, "").toUpperCase() ?? "";
}

function getIndexName(item: DataGoKrMarketIndexItem) {
  return item.idxNm ?? item.idxCsf ?? "";
}

function getTargetIndexCode(item: DataGoKrMarketIndexItem) {
  const compactName = normalizeIndexName(getIndexName(item));

  if (compactName === "KOSPI" || compactName === "코스피") {
    return "KOSPI";
  }

  if (compactName === "KOSDAQ" || compactName === "코스닥") {
    return "KOSDAQ";
  }

  if (compactName === "KRX300") {
    return "KRX300";
  }

  return null;
}

function isValidIndexItem(item: DataGoKrMarketIndexItem) {
  return (
    hasValue(item.basDt) &&
    hasValue(getIndexName(item)) &&
    hasValue(item.clpr) &&
    hasValue(item.vs) &&
    hasValue(item.fltRt)
  );
}

function logUnexpectedMarketIndexFields(items: DataGoKrMarketIndexItem[]) {
  if (marketIndexFieldWarningShown || items.length === 0) return;

  marketIndexFieldWarningShown = true;
  console.warn(
    `[data.go.kr] Market index item fields: ${Object.keys(items[0] ?? {}).join(", ")}`
  );
}

function getIndexDisplay(code: string, rawName: string) {
  if (code === "KOSPI") {
    return {
      name: "Korea Composite Stock Price Index",
      koreanName: rawName || "코스피"
    };
  }

  if (code === "KOSDAQ") {
    return {
      name: "Korea Securities Dealers Automated Quotations",
      koreanName: rawName || "코스닥"
    };
  }

  return {
    name: "KRX 300",
    koreanName: rawName || "KRX 300"
  };
}

function toCandle(item: DataGoKrStockPriceItem): Candle | null {
  if (!isValidPriceItem(item)) return null;

  const open = toNumber(item.mkp);
  const high = toNumber(item.hipr);
  const low = toNumber(item.lopr);
  const close = toNumber(item.clpr);

  if (open <= 0 || high <= 0 || low <= 0 || close <= 0) return null;

  return {
    date: formatBasDt(item.basDt!),
    open,
    high,
    low,
    close,
    volume: toNumber(item.trqu)
  };
}

async function fetchStockPriceSearchRows(keyword: string) {
  const apiKey = getApiKey();
  const normalizedKeyword = keyword.trim();

  if (!apiKey || !normalizedKeyword) {
    return null;
  }

  const params = new URLSearchParams({
    beginBasDt: "20240101",
    endBasDt: "20261231",
    numOfRows: "100",
    pageNo: "1",
    resultType: "json"
  });

  if (/^\d+$/.test(normalizedKeyword)) {
    params.set("likeSrtnCd", normalizedKeyword);
  } else {
    params.set("likeItmsNm", normalizedKeyword);
  }

  const url = `${dataGoKrEndpoints.stockPrice}?serviceKey=${encodeServiceKey(
    apiKey
  )}&${params.toString()}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(url, {
      next: { revalidate: 60 * 30 },
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`data.go.kr HTTP ${response.status}`);
    }

    const payload = await response.json();
    const resultCode = payload?.response?.header?.resultCode;
    if (resultCode && resultCode !== "00") {
      throw new Error(payload?.response?.header?.resultMsg ?? `data.go.kr result ${resultCode}`);
    }

    const items = normalizeItems<DataGoKrStockPriceItem>(payload?.response?.body?.items?.item)
      .filter(isValidPriceItem)
      .sort((left, right) => String(right.basDt ?? "").localeCompare(String(left.basDt ?? "")));

    return items.length > 0 ? items : null;
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeLatestByCode(items: DataGoKrStockPriceItem[]) {
  const latestByCode = new Map<string, DataGoKrStockPriceItem>();

  for (const item of items) {
    const code = normalizeCode(item.srtnCd ?? "");
    const current = latestByCode.get(code);

    if (!current || String(item.basDt ?? "") > String(current.basDt ?? "")) {
      latestByCode.set(code, item);
    }
  }

  return Array.from(latestByCode.values()).sort((left, right) =>
    String(left.srtnCd ?? "").localeCompare(String(right.srtnCd ?? ""))
  );
}

function stockFromLatestItem(item: DataGoKrStockPriceItem, fallbackCode: string): Stock | null {
  if (!isValidPriceItem(item)) return null;

  const price = toNumber(item.clpr);
  if (price <= 0) return null;

  const market = toMarket(item.mrktCtg ?? item.mrktCls);

  return {
    symbol: normalizeCode(item.srtnCd ?? fallbackCode),
    name: item.itmsNm ?? normalizeCode(fallbackCode),
    koreanName: item.itmsNm ?? normalizeCode(fallbackCode),
    market,
    sector: "미분류",
    price,
    change: toNumber(item.vs),
    changeRate: toPercent(item.fltRt),
    volume: toNumber(item.trqu),
    tradeValue: toNumber(item.trPrc),
    marketCap: toNumber(item.mrktTotAmt),
    pe: 0,
    eps: 0,
    tags: ["data.go.kr", market],
    volumeChange: 0,
    rsi: 50,
    macdSignal: "bullish",
    ma5: price,
    ma20: price,
    ma60: price,
    recentChangeRate: 0,
    supportPrice: price,
    resistancePrice: price,
    foreignFlow: 0,
    institutionFlow: 0,
    newsSentiment: "neutral",
    date: formatBasDt(item.basDt!)
  };
}

async function fetchStockPriceRows(code: string) {
  const apiKey = getApiKey();
  const normalizedCode = normalizeCode(code);

  if (!apiKey || !normalizedCode) {
    return null;
  }

  const cacheKey = normalizedCode;
  const cached = stockPriceCache.get(cacheKey);
  if (cached) return cached;

  const request = (async () => {
    const params = new URLSearchParams({
      beginBasDt: "20240101",
      endBasDt: "20261231",
      likeSrtnCd: normalizedCode,
      numOfRows: "30",
      pageNo: "1",
      resultType: "json"
    });
    const url = `${dataGoKrEndpoints.stockPrice}?serviceKey=${encodeServiceKey(
      apiKey
    )}&${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    try {
      const response = await fetch(url, {
        next: { revalidate: 60 * 60 },
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error(`data.go.kr HTTP ${response.status}`);
      }

      const payload = await response.json();
      const resultCode = payload?.response?.header?.resultCode;
      if (resultCode && resultCode !== "00") {
        throw new Error(payload?.response?.header?.resultMsg ?? `data.go.kr result ${resultCode}`);
      }

      const items = normalizeItems<DataGoKrStockPriceItem>(payload?.response?.body?.items?.item)
        .filter((item) => normalizeCode(item.srtnCd ?? "") === normalizedCode)
        .filter(isValidPriceItem)
        .sort((left, right) => String(left.basDt ?? "").localeCompare(String(right.basDt ?? "")));

      return items.length > 0 ? items : null;
    } finally {
      clearTimeout(timeout);
    }
  })();

  request.catch(() => stockPriceCache.delete(cacheKey));
  stockPriceCache.set(cacheKey, request);
  return request;
}

export async function getStockDetailFromDataGoKr(code: string): Promise<Stock | null> {
  const rows = await fetchStockPriceRows(code);
  if (!rows || rows.length === 0) return null;

  const latest = rows[rows.length - 1];
  if (!isValidPriceItem(latest)) return null;

  const candles = rows.map(toCandle).filter((candle): candle is Candle => Boolean(candle));
  if (candles.length === 0) return null;

  const technicalSeries = buildTechnicalSeries(candles);
  const latestTechnical = technicalSeries[technicalSeries.length - 1];
  const recentCandles = candles.slice(-20);
  const recentFive = candles.slice(-5);
  const previousClose = candles[candles.length - 2]?.close ?? latestTechnical?.close ?? 0;
  const price = toNumber(latest.clpr);
  const change = toNumber(latest.vs) || price - previousClose;
  const supportPrice = Math.min(...recentCandles.map((item) => item.low));
  const resistancePrice = Math.max(...recentCandles.map((item) => item.high));
  const firstRecentClose = recentFive[0]?.close ?? price;
  const recentChangeRate = firstRecentClose
    ? ((price - firstRecentClose) / firstRecentClose) * 100
    : 0;
  const previousVolume =
    candles.slice(-21, -1).reduce((sum, item) => sum + item.volume, 0) /
    Math.max(candles.slice(-21, -1).length, 1);
  const volume = toNumber(latest.trqu);
  const volumeChange = previousVolume ? ((volume - previousVolume) / previousVolume) * 100 : 0;
  const macdHistogram = latestTechnical?.macdHistogram ?? 0;

  const market = toMarket(latest.mrktCtg ?? latest.mrktCls);

  return {
    symbol: normalizeCode(latest.srtnCd ?? code),
    name: latest.itmsNm ?? normalizeCode(code),
    koreanName: latest.itmsNm ?? normalizeCode(code),
    market,
    sector: "미분류",
    price,
    change,
    changeRate: toPercent(latest.fltRt) || (previousClose ? (change / previousClose) * 100 : 0),
    volume,
    tradeValue: toNumber(latest.trPrc),
    marketCap: toNumber(latest.mrktTotAmt),
    pe: 0,
    eps: 0,
    tags: ["data.go.kr", market],
    volumeChange,
    rsi: latestTechnical?.rsi ?? 50,
    macdSignal:
      macdHistogram > 0 ? "bullish" : macdHistogram < 0 ? "bearish" : "bullish",
    ma5: latestTechnical?.ma5 ?? price,
    ma20: latestTechnical?.ma20 ?? price,
    ma60: latestTechnical?.ma60 ?? price,
    recentChangeRate,
    supportPrice: Number.isFinite(supportPrice) ? supportPrice : price,
    resistancePrice: Number.isFinite(resistancePrice) ? resistancePrice : price,
    foreignFlow: 0,
    institutionFlow: 0,
    newsSentiment: "neutral",
    date: formatBasDt(latest.basDt!)
  };
}

export async function getStockCandlesFromDataGoKr(code: string): Promise<Candle[] | null> {
  const rows = await fetchStockPriceRows(code);
  if (!rows) return null;

  const candles = rows.map(toCandle).filter((candle): candle is Candle => Boolean(candle));
  return candles.length > 0 ? candles : null;
}

export async function searchStocksFromDataGoKr(keyword: string): Promise<Stock[] | null> {
  const rows = await fetchStockPriceSearchRows(keyword);
  if (!rows) return null;

  const stocks = dedupeLatestByCode(rows)
    .map((item) => stockFromLatestItem(item, keyword))
    .filter((stock): stock is Stock => Boolean(stock));

  return stocks.length > 0 ? stocks : null;
}

async function fetchMarketIndexRows() {
  const apiKey = getApiKey();

  if (!apiKey) {
    return null;
  }

  if (marketIndexCache) return marketIndexCache;

  const request = (async () => {
    const results = await Promise.all(
      targetMarketIndexNames.map(async (indexName) => {
        const params = new URLSearchParams({
          beginBasDt: "20240101",
          endBasDt: "20261231",
          idxNm: indexName,
          numOfRows: "100",
          pageNo: "1",
          resultType: "json"
        });
        const url = `${dataGoKrEndpoints.marketOverview}?serviceKey=${encodeServiceKey(
          apiKey
        )}&${params.toString()}`;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        try {
          const response = await fetch(url, {
            next: { revalidate: 60 * 30 },
            signal: controller.signal
          });

          if (!response.ok) {
            throw new Error(`data.go.kr index HTTP ${response.status}`);
          }

          const payload = await response.json();
          const resultCode = payload?.response?.header?.resultCode;
          if (resultCode && resultCode !== "00") {
            throw new Error(payload?.response?.header?.resultMsg ?? `data.go.kr index result ${resultCode}`);
          }

          const rawItems = normalizeItems<DataGoKrMarketIndexItem>(
            payload?.response?.body?.items?.item
          );
          const items = rawItems
            .filter((item) => normalizeIndexName(getIndexName(item)) === normalizeIndexName(indexName))
            .filter((item) => getTargetIndexCode(item))
            .filter(isValidIndexItem)
            .sort((left, right) => String(left.basDt ?? "").localeCompare(String(right.basDt ?? "")));

          if (rawItems.length > 0 && items.length === 0) {
            logUnexpectedMarketIndexFields(rawItems);
          }

          return items;
        } finally {
          clearTimeout(timeout);
        }
      })
    );
    const items = results.flat();

    return items.length > 0 ? items : null;
  })();

  request.catch(() => {
    marketIndexCache = undefined;
  });
  marketIndexCache = request;
  return request;
}

export async function getMarketOverviewFromDataGoKr(): Promise<ProviderMarketOverview | null> {
  const rows = await fetchMarketIndexRows();
  if (!rows) return null;

  const rowsByCode = new Map<string, DataGoKrMarketIndexItem[]>();

  for (const row of rows) {
    const code = getTargetIndexCode(row);
    if (!code) continue;

    const list = rowsByCode.get(code) ?? [];
    list.push(row);
    rowsByCode.set(code, list);
  }

  const indices: MarketIndex[] = [];
  const signals: MarketSignal[] = [];

  for (const [code, list] of Array.from(rowsByCode.entries())) {
    const sorted = [...list].sort((left, right) =>
      String(left.basDt ?? "").localeCompare(String(right.basDt ?? ""))
    );
    const latest = sorted[sorted.length - 1];
    if (!latest || !isValidIndexItem(latest)) continue;

    const price = toNumber(latest.clpr);
    if (price <= 0) continue;

    const rawName = getIndexName(latest);
    const display = getIndexDisplay(code, rawName);
    const trend = sorted
      .slice(-6)
      .map((item) => toNumber(item.clpr))
      .filter((value) => value > 0);
    const safeTrend = trend.length > 1 ? trend : [price - toNumber(latest.vs), price];
    const change = toNumber(latest.vs);
    const changeRate = toPercent(latest.fltRt);
    const date = formatBasDt(latest.basDt!);

    indices.push({
      code,
      name: display.name,
      koreanName: display.koreanName,
      price,
      change,
      changeRate,
      turnover: toNumber(latest.trPrc),
      trend: safeTrend,
      date
    });

    signals.push({
      code,
      name: display.name,
      koreanName: display.koreanName,
      value: price,
      unit: "pt",
      change,
      changeRate,
      meta: `${date} 기준`,
      trend: safeTrend,
      date
    });
  }

  const indexOrder = ["KOSPI", "KOSDAQ", "KRX300"];
  indices.sort((left, right) => indexOrder.indexOf(left.code) - indexOrder.indexOf(right.code));
  signals.sort((left, right) => indexOrder.indexOf(left.code) - indexOrder.indexOf(right.code));

  return indices.length > 0 || signals.length > 0 ? { indices, signals } : null;
}
