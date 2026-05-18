import type { Candle, MarketIndex, MarketSignal, Stock } from "@/lib/types";
import { buildTechnicalSeries } from "@/lib/indicators";

type StockSeed = Omit<
  Stock,
  | "price"
  | "change"
  | "changeRate"
  | "volume"
  | "volumeChange"
  | "rsi"
  | "macdSignal"
  | "ma5"
  | "ma20"
  | "ma60"
  | "recentChangeRate"
  | "supportPrice"
  | "resistancePrice"
  | "foreignFlow"
  | "institutionFlow"
  | "newsSentiment"
> & {
  basePrice: number;
  seed: number;
  drift: number;
  volatility: number;
};

const stockSeeds: StockSeed[] = [
  {
    symbol: "005930",
    name: "Samsung Electronics",
    koreanName: "삼성전자",
    market: "KOSPI",
    sector: "반도체",
    basePrice: 74500,
    marketCap: 448_0000_0000_0000,
    pe: 15.8,
    eps: 4715,
    tags: ["메모리", "AI", "수출"],
    seed: 31,
    drift: 0.0007,
    volatility: 0.018
  },
  {
    symbol: "000660",
    name: "SK hynix",
    koreanName: "SK하이닉스",
    market: "KOSPI",
    sector: "반도체",
    basePrice: 181000,
    marketCap: 132_0000_0000_0000,
    pe: 22.4,
    eps: 8077,
    tags: ["HBM", "메모리", "AI"],
    seed: 74,
    drift: 0.0011,
    volatility: 0.026
  },
  {
    symbol: "035420",
    name: "NAVER",
    koreanName: "NAVER",
    market: "KOSPI",
    sector: "인터넷",
    basePrice: 198000,
    marketCap: 31_5000_0000_0000,
    pe: 19.2,
    eps: 10312,
    tags: ["검색", "커머스", "AI"],
    seed: 18,
    drift: 0.0002,
    volatility: 0.021
  },
  {
    symbol: "035720",
    name: "Kakao",
    koreanName: "카카오",
    market: "KOSPI",
    sector: "인터넷",
    basePrice: 52400,
    marketCap: 23_3000_0000_0000,
    pe: 28.7,
    eps: 1826,
    tags: ["플랫폼", "콘텐츠", "핀테크"],
    seed: 55,
    drift: -0.0001,
    volatility: 0.024
  },
  {
    symbol: "005380",
    name: "Hyundai Motor",
    koreanName: "현대차",
    market: "KOSPI",
    sector: "자동차",
    basePrice: 243000,
    marketCap: 50_9000_0000_0000,
    pe: 6.1,
    eps: 39836,
    tags: ["전기차", "수출", "배당"],
    seed: 91,
    drift: 0.0003,
    volatility: 0.019
  },
  {
    symbol: "051910",
    name: "LG Chem",
    koreanName: "LG화학",
    market: "KOSPI",
    sector: "화학",
    basePrice: 382000,
    marketCap: 27_0000_0000_0000,
    pe: 17.3,
    eps: 22080,
    tags: ["소재", "배터리", "화학"],
    seed: 43,
    drift: -0.0002,
    volatility: 0.023
  },
  {
    symbol: "373220",
    name: "LG Energy Solution",
    koreanName: "LG에너지솔루션",
    market: "KOSPI",
    sector: "배터리",
    basePrice: 421500,
    marketCap: 98_6000_0000_0000,
    pe: 48.5,
    eps: 8691,
    tags: ["2차전지", "전기차", "글로벌"],
    seed: 67,
    drift: 0.0001,
    volatility: 0.025
  },
  {
    symbol: "207940",
    name: "Samsung Biologics",
    koreanName: "삼성바이오로직스",
    market: "KOSPI",
    sector: "바이오",
    basePrice: 856000,
    marketCap: 60_9000_0000_0000,
    pe: 67.4,
    eps: 12701,
    tags: ["CDMO", "헬스케어", "방어"],
    seed: 84,
    drift: 0.0004,
    volatility: 0.017
  },
  {
    symbol: "068270",
    name: "Celltrion",
    koreanName: "셀트리온",
    market: "KOSPI",
    sector: "바이오",
    basePrice: 179500,
    marketCap: 39_0000_0000_0000,
    pe: 42.2,
    eps: 4254,
    tags: ["바이오시밀러", "헬스케어", "수출"],
    seed: 22,
    drift: 0.0002,
    volatility: 0.02
  },
  {
    symbol: "105560",
    name: "KB Financial Group",
    koreanName: "KB금융",
    market: "KOSPI",
    sector: "금융",
    basePrice: 78500,
    marketCap: 31_9000_0000_0000,
    pe: 5.2,
    eps: 15096,
    tags: ["은행", "배당", "밸류업"],
    seed: 12,
    drift: 0.0003,
    volatility: 0.014
  },
  {
    symbol: "091990",
    name: "Celltrion Healthcare",
    koreanName: "셀트리온헬스케어",
    market: "KOSDAQ",
    sector: "바이오",
    basePrice: 71400,
    marketCap: 11_4000_0000_0000,
    pe: 39.8,
    eps: 1794,
    tags: ["바이오", "유통", "성장"],
    seed: 39,
    drift: 0.0001,
    volatility: 0.025
  },
  {
    symbol: "247540",
    name: "ECOPRO BM",
    koreanName: "에코프로비엠",
    market: "KOSDAQ",
    sector: "배터리",
    basePrice: 184000,
    marketCap: 18_0000_0000_0000,
    pe: 53.7,
    eps: 3427,
    tags: ["양극재", "2차전지", "성장"],
    seed: 63,
    drift: -0.0002,
    volatility: 0.03
  }
];

function random(seed: number) {
  let value = seed >>> 0;

  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function formatDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function addTradingDays(start: Date, days: number) {
  const date = new Date(start);
  let added = 0;

  while (added < days) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) added += 1;
  }

  return date;
}

function createCandles(seed: StockSeed): Candle[] {
  const rand = random(seed.seed);
  const candles: Candle[] = [];
  let close = seed.basePrice;
  const start = new Date("2025-12-15T00:00:00.000Z");

  for (let index = 0; index < 96; index += 1) {
    const wave = Math.sin(index / 7 + seed.seed) * seed.volatility * 0.28;
    const shock = (rand() - 0.5) * seed.volatility * 2;
    const open = close * (1 + (rand() - 0.5) * seed.volatility);
    close = Math.max(1000, close * (1 + seed.drift + wave + shock));
    const high = Math.max(open, close) * (1 + rand() * seed.volatility * 0.9);
    const low = Math.min(open, close) * (1 - rand() * seed.volatility * 0.9);
    const volumeBase = seed.market === "KOSPI" ? 900_000 : 520_000;
    const volume =
      volumeBase +
      Math.round(rand() * volumeBase * 3.4) +
      Math.round(Math.abs(close - open) * 9);

    candles.push({
      date: formatDate(addTradingDays(start, index)),
      open: Math.round(open / 10) * 10,
      high: Math.round(high / 10) * 10,
      low: Math.round(low / 10) * 10,
      close: Math.round(close / 10) * 10,
      volume
    });
  }

  return candles;
}

export const historyBySymbol = stockSeeds.reduce<Record<string, Candle[]>>(
  (accumulator, seed) => {
    accumulator[seed.symbol] = createCandles(seed);
    return accumulator;
  },
  {}
);

export const stocks: Stock[] = stockSeeds.map((seed) => {
  const candles = historyBySymbol[seed.symbol];
  const technicalSeries = buildTechnicalSeries(candles);
  const latest = candles[candles.length - 1];
  const previous = candles[candles.length - 2];
  const latestTechnical = technicalSeries[technicalSeries.length - 1];
  const previousTechnical = technicalSeries[technicalSeries.length - 2];
  const fiveDaysAgo = candles[candles.length - 6] ?? candles[0];
  const volumeBase = candles
    .slice(-21, -1)
    .reduce((sum, item) => sum + item.volume, 0) / 20;
  const recentRange = candles.slice(-20);
  const supportPrice = Math.min(...recentRange.map((item) => item.low));
  const resistancePrice = Math.max(...recentRange.map((item) => item.high));
  const flowRand = random(seed.seed + 1000);
  const change = latest.close - previous.close;
  const macdSignal =
    previousTechnical.macd <= previousTechnical.macdSignal &&
    latestTechnical.macd > latestTechnical.macdSignal
      ? "golden_cross"
      : previousTechnical.macd >= previousTechnical.macdSignal &&
          latestTechnical.macd < latestTechnical.macdSignal
        ? "dead_cross"
        : latestTechnical.macd > latestTechnical.macdSignal
          ? "bullish"
          : "bearish";
  const sentimentRoll = flowRand();

  return {
    symbol: seed.symbol,
    name: seed.name,
    koreanName: seed.koreanName,
    market: seed.market,
    sector: seed.sector,
    price: latest.close,
    change,
    changeRate: (change / previous.close) * 100,
    volume: latest.volume,
    marketCap: seed.marketCap,
    pe: seed.pe,
    eps: seed.eps,
    tags: seed.tags,
    volumeChange: ((latest.volume - volumeBase) / volumeBase) * 100,
    rsi: latestTechnical.rsi ?? 50,
    macdSignal,
    ma5: latestTechnical.ma5 ?? latest.close,
    ma20: latestTechnical.ma20 ?? latest.close,
    ma60: latestTechnical.ma60 ?? latest.close,
    recentChangeRate: ((latest.close - fiveDaysAgo.close) / fiveDaysAgo.close) * 100,
    supportPrice,
    resistancePrice,
    foreignFlow: Math.round((flowRand() - 0.46) * 4200) * 100_000_000,
    institutionFlow: Math.round((flowRand() - 0.5) * 3600) * 100_000_000,
    newsSentiment:
      sentimentRoll > 0.68 ? "positive" : sentimentRoll < 0.32 ? "negative" : "neutral"
  };
});

export const marketIndices: MarketIndex[] = [
  {
    code: "KOSPI",
    name: "Korea Composite Stock Price Index",
    koreanName: "코스피",
    price: 2818.42,
    change: 21.36,
    changeRate: 0.76,
    turnover: 11_8000_0000_0000,
    trend: [2765, 2772, 2798, 2788, 2805, 2818]
  },
  {
    code: "KOSDAQ",
    name: "Korea Securities Dealers Automated Quotations",
    koreanName: "코스닥",
    price: 861.74,
    change: -3.82,
    changeRate: -0.44,
    turnover: 7_1000_0000_0000,
    trend: [872, 869, 866, 871, 865, 862]
  },
  {
    code: "KOSPI200",
    name: "KOSPI 200",
    koreanName: "코스피 200",
    price: 379.18,
    change: 3.15,
    changeRate: 0.84,
    turnover: 8_9000_0000_0000,
    trend: [371, 373, 376, 374, 377, 379]
  }
];

export const marketSignals: MarketSignal[] = [
  {
    code: "KOSPI",
    name: "Korea Composite Stock Price Index",
    koreanName: "코스피",
    value: 2818.42,
    unit: "pt",
    change: 21.36,
    changeRate: 0.76,
    meta: "대형 반도체 주도",
    trend: [2765, 2772, 2798, 2788, 2805, 2818]
  },
  {
    code: "KOSDAQ",
    name: "Korea Securities Dealers Automated Quotations",
    koreanName: "코스닥",
    value: 861.74,
    unit: "pt",
    change: -3.82,
    changeRate: -0.44,
    meta: "바이오 차익실현",
    trend: [872, 869, 866, 871, 865, 862]
  },
  {
    code: "KRW/USD",
    name: "Korean Won per US Dollar",
    koreanName: "원/달러",
    value: 1368.2,
    unit: "KRW",
    change: -4.8,
    changeRate: -0.35,
    meta: "원화 강세 전환",
    trend: [1378, 1375, 1371, 1373, 1369, 1368]
  },
  {
    code: "심리 지수",
    name: "Market Sentiment Index",
    koreanName: "시장 심리",
    value: 68,
    unit: "/100",
    change: 5,
    changeRate: 7.94,
    meta: "위험 선호",
    trend: [54, 58, 61, 59, 64, 68]
  }
];

export function getStockBySymbol(symbol: string) {
  return stocks.find((stock) => stock.symbol === symbol.toUpperCase());
}

export function getCandlesBySymbol(symbol: string) {
  return historyBySymbol[symbol.toUpperCase()] ?? [];
}

export function searchStocks(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return stocks;

  return stocks.filter((stock) =>
    [stock.symbol, stock.name, stock.koreanName, stock.sector, stock.market]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

export const popularStocks = [...stocks]
  .sort((left, right) => right.volume - left.volume)
  .slice(0, 8);
