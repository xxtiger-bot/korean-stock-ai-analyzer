export type MarketCode = "KOSPI" | "KOSDAQ";

export type MarketIndex = {
  code: string;
  name: string;
  koreanName: string;
  price: number;
  change: number;
  changeRate: number;
  turnover: number;
  trend: number[];
  date?: string;
};

export type MarketSignal = {
  code: string;
  name: string;
  koreanName: string;
  value: number;
  unit: string;
  change: number;
  changeRate: number;
  meta: string;
  trend: number[];
  date?: string;
};

export type Stock = {
  symbol: string;
  name: string;
  koreanName: string;
  market: MarketCode;
  sector: string;
  price: number;
  change: number;
  changeRate: number;
  volume: number;
  tradeValue?: number;
  marketCap: number;
  pe: number;
  eps: number;
  tags: string[];
  volumeChange: number;
  rsi: number;
  macdSignal: "golden_cross" | "bullish" | "bearish" | "dead_cross";
  ma5: number;
  ma20: number;
  ma60: number;
  recentChangeRate: number;
  supportPrice: number;
  resistancePrice: number;
  foreignFlow: number;
  institutionFlow: number;
  newsSentiment: "positive" | "neutral" | "negative";
  date?: string;
};

export type Candle = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type RealtimeQuote = {
  symbol: string;
  price: number;
  change: number;
  changeRate: number;
  volume: number;
  source: "kis";
  asOf: string;
};

export type TechnicalPoint = Candle & {
  ma5: number | null;
  ma20: number | null;
  ma60: number | null;
  rsi: number | null;
  macd: number;
  macdSignal: number;
  macdHistogram: number;
};

export type AiReport = {
  trend: string;
  technical: string;
  risk: string;
  risks: string[];
  watchPoints: string[];
  shortTermCheckPoints: string[];
};
