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
  quoteSource?: "KIS" | "data.go.kr" | "none";
  quoteLabel?: "현재가" | "최근 종가" | "데이터 없음";
  priceAnomaly?: "warning" | "critical" | null;
  priceAnomalyGapRate?: number | null;
  priceAnomalyMessage?: string | null;
};

export type PriceGuard = {
  status: "normal" | "warning" | "critical";
  gapRate: number | null;
  message: string | null;
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
  change: number | null;
  changeRate: number | null;
  volume: number;
  source: "kis";
  asOf: string;
};

export type ForeignOwnershipData = {
  code: string;
  foreignOwnershipRatio: number | null;
  foreignHoldingQty: number | null;
  foreignLimitQty: number | null;
  foreignExhaustionRate: number | null;
  source: "KIS";
  updatedAt: string;
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

export type InvestmentHorizon = "단기" | "중기" | "장기";
export type RiskProfile = "보수형" | "일반형" | "공격형";

export type PortfolioPositionInput = {
  id: string;
  symbol: string;
  stockName?: string;
  market?: string;
  dataSource?: string;
  buyPrice: number;
  quantity: number;
  investmentHorizon: InvestmentHorizon;
  riskProfile: RiskProfile;
  memo: string;
};

export type PortfolioJudgementLabel =
  | "추가 관찰 가능"
  | "유지 관찰"
  | "대기 / 확인 필요"
  | "비중 조절 검토 구간"
  | "리스크 관리 관찰";

export type PortfolioDiagnosis = {
  id: string;
  symbol: string;
  stockName: string;
  market: string;
  quoteSource: "KIS" | "data.go.kr fallback";
  buyPrice: number;
  quantity: number;
  currentPrice: number;
  recentClosePrice: number;
  valuationAmount: number;
  profitLoss: number;
  returnRate: number;
  holdingHealthScore: number;
  addObservationScore: number;
  riskManagementScore: number;
  judgement: PortfolioJudgementLabel;
  why: string;
  addReasons: string[];
  cautionReasons: string[];
  riskManagementReasons: string[];
  nextChecks: string[];
  disclaimer: string;
  hasRealtimePrice: boolean;
  dataSource: string;
  updatedAt: string;
};
