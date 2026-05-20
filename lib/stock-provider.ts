import {
  getCandlesBySymbol,
  getStockBySymbol,
  marketIndices,
  marketSignals,
  popularStocks,
  searchStocks as searchMockStocks,
  stocks
} from "@/lib/mock-data";
import {
  getMarketOverviewFromDataGoKr,
  getStockCandlesFromDataGoKr,
  getStockDetailFromDataGoKr,
  searchStocksFromDataGoKr
} from "@/lib/providers/data-go-kr";
import {
  getMarketOverviewFromKrx,
  getStockCandlesFromKrx,
  getStockDetailFromKrx,
  searchStocksFromKrx
} from "@/lib/providers/krx";
import {
  getForeignOwnership as getForeignOwnershipFromKis,
  getRealtimeQuote as getRealtimeQuoteFromKis
} from "@/lib/providers/kis";
import { buildTechnicalSeries } from "@/lib/indicators";
import {
  DATA_UPDATED_AT,
  getDangerWarnings as buildDangerWarnings,
  getOpportunityRadar as buildOpportunityRadar,
  getPotentialRadar as buildPotentialRadar,
  getWatchlistPriority as buildWatchlistPriority
} from "@/lib/insights";
import type { DangerWarningItem, OpportunityRadarItem, PotentialRadarItem, RiskLevel } from "@/lib/insights";
import type {
  Candle,
  ForeignOwnershipData,
  MarketIndex,
  MarketSignal,
  RealtimeQuote,
  Stock,
  TechnicalPoint
} from "@/lib/types";

export type StockDataProviderMode = "mock" | "real";
export type KoreaStockApiSource = "data_go_kr" | "krx";

export type MarketOverview = {
  indices: MarketIndex[];
  signals: MarketSignal[];
};

export type InvestorFlow = {
  foreignFlow: number;
  institutionFlow: number;
  netFlow: number;
};

type OpportunityRadarItems = ReturnType<typeof buildOpportunityRadar>;
type PotentialRadarItems = ReturnType<typeof buildPotentialRadar>;
type DangerWarningItems = ReturnType<typeof buildDangerWarnings>;
type WatchlistPriorityItems = ReturnType<typeof buildWatchlistPriority>;
type MaybePromise<T> = T | Promise<T>;
type RepresentativeStockResult = {
  stock: Stock;
  candles: Candle[];
  isReal: boolean;
};

const representativeStockCodes = [
  "005930",
  "000660",
  "035420",
  "005380",
  "051910",
  "006400",
  "068270",
  "207940",
  "373220",
  "105560"
] as const;

type RealStockAdapter = {
  source: KoreaStockApiSource;
  label: string;
  apiKeyEnvName: "DATA_GO_KR_API_KEY" | "KRX_API_KEY";
  getMarketOverview: () => MaybePromise<MarketOverview | null>;
  searchStocks: (keyword: string) => MaybePromise<Stock[] | null>;
  getStockDetail: (code: string) => MaybePromise<Stock | null>;
  getStockCandles: (code: string) => MaybePromise<Candle[] | null>;
  getTechnicalIndicators: (code: string) => MaybePromise<TechnicalPoint[] | null>;
  getOpportunityRadar: () => MaybePromise<OpportunityRadarItems | null>;
  getPotentialRadar: () => MaybePromise<PotentialRadarItems | null>;
  getDangerWarnings: () => MaybePromise<DangerWarningItems | null>;
  getWatchlistPriority: (watchlistCodes: string[]) => MaybePromise<WatchlistPriorityItems | null>;
  getPopularStocks: () => MaybePromise<Stock[] | null>;
  getNewsSentiment: (code: string) => MaybePromise<Stock["newsSentiment"] | null>;
  getInvestorFlow: (code: string) => MaybePromise<InvestorFlow | null>;
};

const globalForStockProvider = globalThis as typeof globalThis & {
  __stockProviderWarnings?: Set<string>;
};
const providerWarnings =
  globalForStockProvider.__stockProviderWarnings ??
  (globalForStockProvider.__stockProviderWarnings = new Set<string>());

function getProviderMode(): StockDataProviderMode {
  return process.env.STOCK_DATA_PROVIDER === "real" ? "real" : "mock";
}

function getApiSource(): KoreaStockApiSource {
  const source = process.env.KOREA_STOCK_API_SOURCE;

  if (source === "krx" || source === "data_go_kr") {
    return source;
  }

  if (source) {
    warnOnce(
      `invalid-source:${source}`,
      `[stock-provider] Unknown KOREA_STOCK_API_SOURCE="${source}". Falling back to data_go_kr adapter, then mock data.`
    );
  }

  return "data_go_kr";
}

function warnOnce(key: string, message: string) {
  if (providerWarnings.has(key)) return;
  providerWarnings.add(key);
  console.warn(message);
}

function warnRealFallback(adapter: RealStockAdapter, operation: string, reason: string) {
  warnOnce(
    `real-fallback:${adapter.source}:${operation}:${reason}`,
    `[stock-provider] Real API unavailable, fallback to mock data. source=${adapter.source}, operation=${operation}, reason=${reason}`
  );
}

async function resolveRealData<T>(
  operation: string,
  readReal: (adapter: RealStockAdapter) => MaybePromise<T | null | undefined>,
  readMock: () => T,
  isEmpty: (value: T) => boolean = (value) => Array.isArray(value) && value.length === 0
): Promise<T> {
  const adapter = getRealAdapter();
  const apiKey = process.env[adapter.apiKeyEnvName];

  if (!apiKey) {
    warnRealFallback(adapter, operation, `missing ${adapter.apiKeyEnvName}`);
    return readMock();
  }

  try {
    const realData = await readReal(adapter);

    if (realData === null || realData === undefined || isEmpty(realData)) {
      warnRealFallback(adapter, operation, "empty real API response");
      return readMock();
    }

    return realData;
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    warnRealFallback(adapter, operation, message);
    return readMock();
  }
}

function isEmptyMarketOverview(overview: MarketOverview) {
  return overview.indices.length === 0 && overview.signals.length === 0;
}

function mergeMarketOverviewWithMock(overview: MarketOverview): MarketOverview {
  const realIndexCodes = new Set(overview.indices.map((index) => index.code));
  const realSignalCodes = new Set(overview.signals.map((signal) => signal.code));

  return {
    indices: [
      ...overview.indices,
      ...marketIndices.filter(
        (index) =>
          !realIndexCodes.has(index.code) &&
          (index.code === "KOSPI" || index.code === "KOSDAQ")
      )
    ],
    signals: [
      ...overview.signals,
      ...marketSignals.filter((signal) => !realSignalCodes.has(signal.code))
    ]
  };
}

function average(values: number[]) {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function percentChange(current: number, previous: number) {
  if (!previous) return 0;
  return ((current - previous) / previous) * 100;
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function formatSignedPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function getSimpleStockRiskLevel(stock: Stock): RiskLevel {
  const ma20Gap = percentChange(stock.price, stock.ma20);
  let score = 0;

  if (stock.rsi >= 78) score += 30;
  else if (stock.rsi >= 70) score += 22;
  else if (stock.rsi <= 28) score += 16;
  else if (stock.rsi <= 35) score += 10;

  if (ma20Gap >= 8) score += 25;
  else if (ma20Gap >= 5) score += 18;
  else if (ma20Gap <= -6) score += 12;

  if (stock.recentChangeRate >= 8) score += 25;
  else if (stock.recentChangeRate >= 5) score += 16;
  else if (stock.recentChangeRate <= -8) score += 12;

  if (stock.volumeChange >= 80) score += 16;
  else if (stock.volumeChange >= 40) score += 10;

  if (stock.macdSignal === "dead_cross") score += 14;
  else if (stock.macdSignal === "bearish") score += 8;

  if (stock.price >= stock.resistancePrice * 0.97) score += 10;
  if (stock.price <= stock.supportPrice * 1.03) score += 6;

  if (score >= 75) return "매우 높음";
  if (score >= 55) return "높음";
  if (score >= 32) return "보통";
  return "낮음";
}

function getRiskPriorityWeight(level: RiskLevel) {
  if (level === "매우 높음" || level === "위험 높음") return 34;
  if (level === "높음" || level === "신중 관찰") return 26;
  if (level === "보통" || level === "중성 대기") return 16;
  return 8;
}

function getSimpleRadarRiskLevel(item: OpportunityRadarItem): RiskLevel {
  const { stock } = item;
  const signals = Array.isArray(item.signals) ? item.signals : [];
  const ma20Gap = percentChange(stock.price, stock.ma20);
  let score = 0;

  if (stock.rsi >= 78) score += 30;
  else if (stock.rsi >= 70) score += 22;
  else if (stock.rsi <= 28) score += 16;
  else if (stock.rsi <= 35) score += 10;

  if (ma20Gap >= 8) score += 25;
  else if (ma20Gap >= 5) score += 18;
  else if (ma20Gap <= -6) score += 12;

  if (stock.recentChangeRate >= 8) score += 25;
  else if (stock.recentChangeRate >= 5) score += 16;
  else if (stock.recentChangeRate <= -8) score += 12;

  if (stock.volumeChange >= 80) score += 16;
  else if (stock.volumeChange >= 40) score += 10;

  if (stock.macdSignal === "dead_cross") score += 14;
  else if (stock.macdSignal === "bearish") score += 8;

  if (stock.price >= stock.resistancePrice * 0.97) score += 10;
  if (stock.price <= stock.supportPrice * 1.03) score += 6;

  if (signals.some((signal) => signal.severity === "extreme")) {
    score = Math.max(score, 75);
  } else if (signals.some((signal) => signal.severity === "high")) {
    score = Math.max(score, 55);
  } else if (signals.some((signal) => signal.severity === "medium")) {
    score = Math.max(score, 32);
  }

  if (score >= 75) return "매우 높음";
  if (score >= 55) return "높음";
  if (score >= 32) return "보통";
  return "낮음";
}

function getMacdState(series: TechnicalPoint[]): Stock["macdSignal"] {
  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  const latestHistogram = latest?.macdHistogram ?? 0;
  const previousHistogram = previous?.macdHistogram ?? 0;

  if (previousHistogram <= 0 && latestHistogram > 0) return "golden_cross";
  if (previousHistogram >= 0 && latestHistogram < 0) return "dead_cross";
  return latestHistogram >= 0 ? "bullish" : "bearish";
}

function enrichStockWithRealOpportunityMetrics(stock: Stock, candles: Candle[]): Stock | null {
  if (candles.length < 5) return null;

  const series = buildTechnicalSeries(candles);
  const latest = series[series.length - 1];
  const previous = series[series.length - 2];
  if (!latest) return null;

  const recentFiveStart = series[Math.max(0, series.length - 6)];
  const recentTwenty = series.slice(-20);
  const previousVolumes = series.slice(-21, -1).map((item) => item.volume);
  const averageVolume = average(previousVolumes);
  const supportPrice = Math.min(...recentTwenty.map((item) => item.low));
  const resistancePrice = Math.max(...recentTwenty.map((item) => item.high));
  const price = latest.close;
  const change = stock.change || (previous ? price - previous.close : 0);

  return {
    ...stock,
    price,
    change,
    changeRate: stock.changeRate || (previous ? percentChange(price, previous.close) : 0),
    volume: latest.volume,
    tradeValue: stock.tradeValue ?? price * latest.volume,
    tags: Array.from(new Set(["data.go.kr", stock.market])),
    volumeChange: averageVolume ? percentChange(latest.volume, averageVolume) : 0,
    rsi: latest.rsi ?? stock.rsi ?? 50,
    macdSignal: getMacdState(series),
    ma5: latest.ma5 ?? price,
    ma20: latest.ma20 ?? price,
    ma60: latest.ma60 ?? price,
    recentChangeRate: recentFiveStart ? percentChange(price, recentFiveStart.close) : 0,
    supportPrice: Number.isFinite(supportPrice) ? supportPrice : price,
    resistancePrice: Number.isFinite(resistancePrice) ? resistancePrice : price,
    foreignFlow: 0,
    institutionFlow: 0,
    newsSentiment: "neutral",
    date: latest.date
  };
}

function getRealRadarObservationFocus(stock: Stock, fallback: string) {
  if (stock.price <= stock.supportPrice * 1.03) {
    return `20일 저점 ${stock.supportPrice.toLocaleString("ko-KR")}원 부근 지지 여부를 참고 관찰`;
  }

  if (stock.price >= stock.resistancePrice * 0.97) {
    return `20일 고점 ${stock.resistancePrice.toLocaleString("ko-KR")}원 부근 저항 반응을 참고 관찰`;
  }

  if (stock.price > stock.ma20) {
    return "MA20 위에서 종가와 거래량이 유지되는지 참고 관찰";
  }

  return fallback;
}

async function getRepresentativeStockWithFallback(code: string): Promise<RepresentativeStockResult | null> {
  try {
    const [detail, candles] = await Promise.all([
      getStockDetailFromDataGoKr(code),
      getStockCandlesFromDataGoKr(code)
    ]);

    if (!detail || !candles || candles.length === 0) {
      throw new Error("empty real stock response");
    }

    const stock = enrichStockWithRealOpportunityMetrics(detail, candles);
    return stock ? { stock, candles, isReal: true } : null;
  } catch (error) {
    warnOnce(
      `representative-stock-fallback:${code}`,
      `[stock-provider] Real representative stock unavailable, fallback this stock to mock. code=${code}, reason=${
        error instanceof Error ? error.message : "request failed"
      }`
    );

    const mockStock = mockProvider.getStockDetail(code);
    const mockCandles = mockProvider.getStockCandles(code);
    return mockStock ? { stock: mockStock, candles: mockCandles, isReal: false } : null;
  }
}

async function getDataGoKrOpportunityRadar() {
  const results = await Promise.all(
    representativeStockCodes.map((code) => getRepresentativeStockWithFallback(code))
  );
  const available = results.filter(
    (result): result is RepresentativeStockResult => Boolean(result)
  );
  const realCount = available.filter((result) => result.isReal).length;

  if (realCount === 0) return null;

  const items = buildOpportunityRadar(available.map((result) => result.stock));

  return items.map((item): OpportunityRadarItem => {
    const stockTags = Array.isArray(item.stock.tags) ? item.stock.tags : [];
    const isReal = stockTags.some((tag) => tag.toLowerCase() === "data.go.kr");
    const observationFocus = getRealRadarObservationFocus(item.stock, item.observationFocus);
    const dataSource = isReal ? "data.go.kr" : "mock";

    return {
      ...item,
      riskLevel: getSimpleRadarRiskLevel(item),
      observationFocus,
      aiSummary: `${item.aiSummary} 데이터 출처는 ${dataSource}입니다.`,
      updatedAt: item.stock.date ? `${item.stock.date} · ${dataSource}` : DATA_UPDATED_AT
    };
  });
}

async function getDataGoKrPotentialRadar() {
  const results = await Promise.all(
    representativeStockCodes.map((code) => getRepresentativeStockWithFallback(code))
  );
  const available = results.filter(
    (result): result is RepresentativeStockResult => Boolean(result)
  );
  const realCount = available.filter((result) => result.isReal).length;

  if (realCount === 0) return null;

  return buildPotentialRadar(available.map((result) => result.stock)).map(
    (item): PotentialRadarItem => ({
      ...item,
      dataSource: (Array.isArray(item.stock.tags) ? item.stock.tags : []).some(
        (tag) => tag.toLowerCase() === "data.go.kr"
      )
        ? "data.go.kr 일별 종가"
        : "일별 종가 데이터",
      updatedAt: item.stock.date ? `${item.stock.date} 기준` : DATA_UPDATED_AT
    })
  );
}

async function getDataGoKrDangerWarnings() {
  const results = await Promise.all(
    representativeStockCodes.map((code) => getRepresentativeStockWithFallback(code))
  );
  const available = results.filter(
    (result): result is RepresentativeStockResult => Boolean(result)
  );
  const realCount = available.filter((result) => result.isReal).length;

  if (realCount === 0) return null;

  return buildDangerWarnings(available.map((result) => result.stock)).map(
    (item): DangerWarningItem => ({
      ...item,
      dataSource: (Array.isArray(item.stock.tags) ? item.stock.tags : []).some(
        (tag) => tag.toLowerCase() === "data.go.kr"
      )
        ? "data.go.kr 일별 종가"
        : "일별 종가 데이터",
      updatedAt: item.stock.date ? `${item.stock.date} 기준` : DATA_UPDATED_AT
    })
  );
}

function calculateRecentVolatility(candles: Candle[]) {
  const recent = candles.slice(-20);
  if (recent.length < 2) return 0;

  const changes = recent
    .slice(1)
    .map((item, index) => Math.abs(percentChange(item.close, recent[index].close)));

  return average(changes);
}

function getDataSourceLabel(stock: Stock) {
  const tags = Array.isArray(stock.tags) ? stock.tags : [];
  return tags.some((tag) => tag.toLowerCase() === "data.go.kr") ? "data.go.kr" : "mock";
}

function buildRealWatchlistPriorityItems(results: RepresentativeStockResult[]) {
  const baseItems = buildWatchlistPriority(results.map((result) => result.stock));
  const resultMap = new Map(results.map((result) => [result.stock.symbol, result]));

  return baseItems
    .map((item) => {
      const result = resultMap.get(item.stock.symbol);
      const stock = item.stock;
      const ma20Gap = percentChange(stock.price, stock.ma20);
      const volatility = result ? calculateRecentVolatility(result.candles) : 0;
      const nearHigh = stock.price >= stock.resistancePrice * 0.97;
      const nearLow = stock.price <= stock.supportPrice * 1.03;
      const isAboveMa20 = stock.price >= stock.ma20;
      const riskLevel = getSimpleStockRiskLevel(stock);
      const reasons: string[] = [];

      if (Math.abs(stock.changeRate) >= 1.5) {
        reasons.push(`당일 등락률 ${formatSignedPercent(stock.changeRate)}`);
      }

      if (stock.volumeChange >= 20) {
        reasons.push(`거래량 ${formatSignedPercent(stock.volumeChange)} 확대`);
      } else if (stock.volumeChange <= -25) {
        reasons.push(`거래량 ${formatSignedPercent(stock.volumeChange)} 둔화`);
      }

      reasons.push(
        isAboveMa20
          ? `MA20 위 ${formatSignedPercent(ma20Gap)} 유지`
          : `MA20 아래 ${formatSignedPercent(ma20Gap)} 이탈`
      );

      if (stock.rsi >= 70) {
        reasons.push(`RSI ${stock.rsi.toFixed(1)} 과열권`);
      } else if (stock.rsi <= 35) {
        reasons.push(`RSI ${stock.rsi.toFixed(1)} 침체권`);
      }

      if (nearHigh) reasons.push("20일 고점권 접근");
      if (nearLow) reasons.push("20일 저점권 접근");

      const priority = clampNumber(
        Math.round(
          Math.abs(stock.changeRate) * 7 +
            Math.max(stock.volumeChange, 0) * 0.25 +
            Math.abs(ma20Gap) * 3 +
            volatility * 4 +
            getRiskPriorityWeight(riskLevel) +
            (nearHigh ? 14 : 0) +
            (nearLow ? 12 : 0) +
            (result?.isReal ? 4 : 0)
        ),
        0,
        100
      );
      const focus = nearHigh
        ? `20일 고점 ${stock.resistancePrice.toLocaleString("ko-KR")}원 부근 저항 반응을 참고 관찰`
        : nearLow
          ? `20일 저점 ${stock.supportPrice.toLocaleString("ko-KR")}원 부근 지지 여부를 참고 관찰`
          : isAboveMa20
            ? "MA20 위에서 종가와 거래량이 유지되는지 참고 관찰"
            : "MA20 회복 여부와 거래량 동반을 참고 관찰";
      const dataSource = getDataSourceLabel(stock);
      const whyToday =
        reasons.length > 2
          ? `${reasons.length}개 신호가 겹쳐 오늘 우선 확인이 필요합니다. 위험 등급은 ${riskLevel}이며 데이터 출처는 ${dataSource}입니다.`
          : `관심종목 내 변화 폭은 제한적이지만 MA20, RSI, 거래량 변화를 함께 참고 관찰합니다. 데이터 출처는 ${dataSource}입니다.`;

      return {
        ...item,
        priority,
        riskLevel,
        reasons: reasons.slice(0, 4),
        focus,
        whyToday,
        briefingLine: `${stock.koreanName}: ${reasons.slice(0, 2).join(", ") || "뚜렷한 단기 신호 없음"}. 위험 등급은 ${riskLevel}, 오늘은 ${focus}. 데이터 출처는 ${dataSource}입니다.`
      };
    })
    .sort((left, right) => right.priority - left.priority);
}

function getPopularStockScore(result: RepresentativeStockResult) {
  const { stock, candles, isReal } = result;
  const tradeValue = stock.tradeValue ?? stock.price * stock.volume;
  const volatility = calculateRecentVolatility(candles);
  const dataCompleteness =
    (isReal ? 24 : 0) +
    Math.min(candles.length, 30) * 0.7 +
    (stock.tradeValue ? 8 : 0) +
    (stock.marketCap ? 4 : 0);

  return (
    Math.log10(Math.max(stock.volume, 1)) * 11 +
    Math.log10(Math.max(tradeValue, 1)) * 8 +
    Math.abs(stock.changeRate) * 6 +
    volatility * 5 +
    dataCompleteness
  );
}

async function getDataGoKrPopularStocks() {
  const results = await Promise.all(
    representativeStockCodes.map((code) => getRepresentativeStockWithFallback(code))
  );
  const available = results.filter(
    (result): result is RepresentativeStockResult => Boolean(result)
  );
  const realCount = available.filter((result) => result.isReal).length;

  if (realCount === 0) return null;

  return available
    .sort((left, right) => getPopularStockScore(right) - getPopularStockScore(left))
    .map((result) => result.stock)
    .slice(0, 8);
}

async function getDataGoKrWatchlistPriority(watchlistCodes: string[]) {
  const codes = Array.from(
    new Set(watchlistCodes.map((code) => code.trim().toUpperCase()).filter(Boolean))
  );
  if (codes.length === 0) return [];

  const results = await Promise.all(codes.map((code) => getRepresentativeStockWithFallback(code)));
  const available = results.filter(
    (result): result is RepresentativeStockResult => Boolean(result)
  );
  const realCount = available.filter((result) => result.isReal).length;

  if (available.length === 0 || realCount === 0) return null;

  return buildRealWatchlistPriorityItems(available);
}

const mockProvider = {
  getMarketOverview(): MarketOverview {
    return {
      indices: marketIndices,
      signals: marketSignals
    };
  },
  searchStocks(keyword: string): Stock[] {
    return searchMockStocks(keyword);
  },
  getStockDetail(code: string): Stock | undefined {
    return getStockBySymbol(code);
  },
  getStockCandles(code: string): Candle[] {
    return getCandlesBySymbol(code);
  },
  getTechnicalIndicators(code: string): TechnicalPoint[] {
    return buildTechnicalSeries(getCandlesBySymbol(code));
  },
  getOpportunityRadar() {
    return buildOpportunityRadar(stocks);
  },
  getPotentialRadar() {
    return buildPotentialRadar(stocks);
  },
  getDangerWarnings() {
    return buildDangerWarnings(stocks);
  },
  getWatchlistPriority(watchlistCodes: string[]) {
    const codeSet = new Set(watchlistCodes.map((code) => code.toUpperCase()));
    return buildWatchlistPriority(stocks.filter((stock) => codeSet.has(stock.symbol)));
  },
  getPopularStocks(): Stock[] {
    return popularStocks;
  },
  getNewsSentiment(code: string): Stock["newsSentiment"] | null {
    return getStockBySymbol(code)?.newsSentiment ?? null;
  },
  getInvestorFlow(code: string): InvestorFlow | null {
    const stock = getStockBySymbol(code);
    if (!stock) return null;

    return {
      foreignFlow: stock.foreignFlow,
      institutionFlow: stock.institutionFlow,
      netFlow: stock.foreignFlow + stock.institutionFlow
    };
  }
};

const dataGoKrAdapter: RealStockAdapter = {
  source: "data_go_kr",
  label: "data.go.kr",
  apiKeyEnvName: "DATA_GO_KR_API_KEY",
  async getMarketOverview() {
    const overview = await getMarketOverviewFromDataGoKr();
    return overview ? mergeMarketOverviewWithMock(overview) : null;
  },
  searchStocks(keyword: string) {
    return searchStocksFromDataGoKr(keyword);
  },
  getStockDetail(code: string) {
    return getStockDetailFromDataGoKr(code);
  },
  getStockCandles(code: string) {
    return getStockCandlesFromDataGoKr(code);
  },
  async getTechnicalIndicators(code: string) {
    const candles = await getStockCandlesFromDataGoKr(code);
    return candles ? buildTechnicalSeries(candles) : null;
  },
  getOpportunityRadar() {
    return getDataGoKrOpportunityRadar();
  },
  getPotentialRadar() {
    return getDataGoKrPotentialRadar();
  },
  getDangerWarnings() {
    return getDataGoKrDangerWarnings();
  },
  async getWatchlistPriority(watchlistCodes: string[]) {
    return getDataGoKrWatchlistPriority(watchlistCodes);
  },
  getPopularStocks() {
    return getDataGoKrPopularStocks();
  },
  getNewsSentiment() {
    // TODO: Connect a Korean news sentiment pipeline or vendor feed.
    return null;
  },
  getInvestorFlow() {
    // TODO: Connect foreign/institution investor flow endpoints here.
    return null;
  }
};

const krxAdapter: RealStockAdapter = {
  source: "krx",
  label: "KRX",
  apiKeyEnvName: "KRX_API_KEY",
  getMarketOverview() {
    return getMarketOverviewFromKrx();
  },
  searchStocks(keyword: string) {
    return searchStocksFromKrx(keyword);
  },
  getStockDetail(code: string) {
    return getStockDetailFromKrx(code);
  },
  getStockCandles(code: string) {
    return getStockCandlesFromKrx(code);
  },
  getTechnicalIndicators(code: string) {
    const candles = getStockCandlesFromKrx(code);
    return candles ? buildTechnicalSeries(candles) : null;
  },
  getOpportunityRadar() {
    // TODO: Build radar from real quotes, volume, investor flow, and sentiment.
    return null;
  },
  getPotentialRadar() {
    // TODO: Build potential radar from real KRX daily candles.
    return null;
  },
  getDangerWarnings() {
    // TODO: Build danger warnings from real KRX daily candles.
    return null;
  },
  getWatchlistPriority(watchlistCodes: string[]) {
    const details = watchlistCodes
      .map((code) => getStockDetailFromKrx(code))
      .filter((stock): stock is Stock => Boolean(stock));

    return details.length > 0 ? buildWatchlistPriority(details) : null;
  },
  getPopularStocks() {
    return searchStocksFromKrx("");
  },
  getNewsSentiment() {
    // TODO: Connect a Korean news sentiment pipeline or vendor feed.
    return null;
  },
  getInvestorFlow() {
    // TODO: Connect foreign/institution investor flow endpoints here.
    return null;
  }
};

function getRealAdapter() {
  return getApiSource() === "krx" ? krxAdapter : dataGoKrAdapter;
}

const realProvider = {
  getMarketOverview(): Promise<MarketOverview> {
    return resolveRealData(
      "getMarketOverview",
      (adapter) => adapter.getMarketOverview(),
      () => mockProvider.getMarketOverview(),
      isEmptyMarketOverview
    );
  },
  searchStocks(keyword: string): Promise<Stock[]> {
    return resolveRealData(
      "searchStocks",
      (adapter) => adapter.searchStocks(keyword),
      () => mockProvider.searchStocks(keyword)
    );
  },
  getStockDetail(code: string): Promise<Stock | undefined> {
    return resolveRealData(
      "getStockDetail",
      (adapter) => adapter.getStockDetail(code),
      () => mockProvider.getStockDetail(code)
    );
  },
  getStockCandles(code: string): Promise<Candle[]> {
    return resolveRealData(
      "getStockCandles",
      (adapter) => adapter.getStockCandles(code),
      () => mockProvider.getStockCandles(code)
    );
  },
  getTechnicalIndicators(code: string): Promise<TechnicalPoint[]> {
    return resolveRealData(
      "getTechnicalIndicators",
      (adapter) => adapter.getTechnicalIndicators(code),
      () => mockProvider.getTechnicalIndicators(code)
    );
  },
  getOpportunityRadar() {
    return resolveRealData(
      "getOpportunityRadar",
      (adapter) => adapter.getOpportunityRadar(),
      () => mockProvider.getOpportunityRadar(),
      () => false
    );
  },
  getPotentialRadar() {
    return resolveRealData(
      "getPotentialRadar",
      (adapter) => adapter.getPotentialRadar(),
      () => mockProvider.getPotentialRadar(),
      () => false
    );
  },
  getDangerWarnings() {
    return resolveRealData(
      "getDangerWarnings",
      (adapter) => adapter.getDangerWarnings(),
      () => mockProvider.getDangerWarnings(),
      () => false
    );
  },
  getWatchlistPriority(watchlistCodes: string[]) {
    return resolveRealData(
      "getWatchlistPriority",
      (adapter) => adapter.getWatchlistPriority(watchlistCodes),
      () => mockProvider.getWatchlistPriority(watchlistCodes)
    );
  },
  getPopularStocks(): Promise<Stock[]> {
    return resolveRealData(
      "getPopularStocks",
      (adapter) => adapter.getPopularStocks(),
      () => mockProvider.getPopularStocks()
    );
  },
  getNewsSentiment(code: string): Promise<Stock["newsSentiment"] | null> {
    return resolveRealData(
      "getNewsSentiment",
      (adapter) => adapter.getNewsSentiment(code),
      () => mockProvider.getNewsSentiment(code)
    );
  },
  getInvestorFlow(code: string): Promise<InvestorFlow | null> {
    return resolveRealData(
      "getInvestorFlow",
      (adapter) => adapter.getInvestorFlow(code),
      () => mockProvider.getInvestorFlow(code)
    );
  }
};

function provider() {
  return getProviderMode() === "real" ? realProvider : mockProvider;
}

function getRealtimeProvider() {
  return process.env.REALTIME_STOCK_PROVIDER === "kis" ? "kis" : null;
}

export function getMarketOverview() {
  return provider().getMarketOverview();
}

export function searchStocks(keyword: string) {
  return provider().searchStocks(keyword);
}

export function getStockDetail(code: string) {
  return provider().getStockDetail(code);
}

export function getStockCandles(code: string) {
  return provider().getStockCandles(code);
}

export function getTechnicalIndicators(code: string) {
  return provider().getTechnicalIndicators(code);
}

export function getOpportunityRadar() {
  return provider().getOpportunityRadar();
}

export function getPotentialRadar() {
  return provider().getPotentialRadar();
}

export function getDangerWarnings() {
  return provider().getDangerWarnings();
}

export function getWatchlistPriority(watchlistCodes: string[]) {
  return provider().getWatchlistPriority(watchlistCodes);
}

export function getPopularStocks() {
  return provider().getPopularStocks();
}

export function getNewsSentiment(code: string) {
  return provider().getNewsSentiment(code);
}

export function getInvestorFlow(code: string) {
  return provider().getInvestorFlow(code);
}

export async function getRealtimeQuote(code: string): Promise<RealtimeQuote | null> {
  if (getRealtimeProvider() !== "kis") {
    return null;
  }

  try {
    return await getRealtimeQuoteFromKis(code);
  } catch {
    return null;
  }
}

export async function getForeignOwnership(
  code: string
): Promise<ForeignOwnershipData | null> {
  if (getRealtimeProvider() !== "kis") {
    return null;
  }

  try {
    return await getForeignOwnershipFromKis(code);
  } catch {
    return null;
  }
}

export function getStockDataProviderMode() {
  return getProviderMode();
}

export function getKoreaStockApiSource() {
  return getApiSource();
}
