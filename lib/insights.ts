import type { Stock, TechnicalPoint } from "@/lib/types";

export const DATA_UPDATED_AT = "2026-05-18 15:30 KST";
export const DISCLAIMER =
  "본 내용은 정보 제공용이며 투자 조언이 아닙니다. 주식 투자는 원금 손실 위험이 있으며 최종 결정과 책임은 사용자에게 있습니다.";

export type RiskLevel =
  | "낮음"
  | "보통"
  | "높음"
  | "매우 높음"
  | "낮은 위험 관찰"
  | "중성 대기"
  | "신중 관찰"
  | "위험 높음";

export type SignalSeverity = "low" | "medium" | "high" | "extreme";

export type OpportunityCategory =
  | "거래량 이상"
  | "추세 돌파"
  | "침체 반등"
  | "고위험 추격"
  | "수급 관심";

export type OpportunitySignal = {
  id: string;
  label: string;
  category: OpportunityCategory;
  severity: SignalSeverity;
  reason: string;
  aiComment: string;
  observationFocus: string;
};

export type OpportunityRadarItem = {
  stock: Stock;
  signals: OpportunitySignal[];
  riskLevel: RiskLevel;
  priorityScore: number;
  aiSummary: string;
  observationFocus: string;
  updatedAt: string;
};

export type RiskComponent = {
  id: string;
  label: string;
  score: number;
  maxScore: number;
  value: string;
  tone: SignalSeverity;
  explanation: string;
};

export type EntryRiskScore = {
  score: number;
  level: RiskLevel;
  summary: string;
  methodology: string;
  components: RiskComponent[];
  drivers: Array<{
    label: string;
    value: string;
    tone: SignalSeverity;
  }>;
  updatedAt: string;
};

export type IndicatorTranslation = {
  label: string;
  value: string;
  plainText: string;
  riskMeaning: string;
  nextWatch: string;
};

export type HoldingPeriod = "short" | "mid" | "long";

export type TradingPlan = {
  profitLossAmount: number;
  profitLossRate: number;
  supportPrice: number;
  resistancePrice: number;
  warning: string;
  observationStrategy: string;
  periodLabel: string;
};

export type PotentialLevel =
  | "강한 잠재 후보"
  | "관찰 가치 있음"
  | "중립 관찰"
  | "잠재 신호 약함";

export type PotentialRadarItem = {
  stock: Stock;
  score: number;
  level: PotentialLevel;
  reasons: string[];
  observationPoints: string[];
  riskLevel: RiskLevel;
  dataSource: string;
  updatedAt: string;
};

export type DangerWarningItem = {
  stock: Stock;
  score: number;
  level: RiskLevel;
  signals: string[];
  cautionReason: string;
  recheckCriteria: string;
  dataSource: string;
  updatedAt: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function n(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStockLike(value: unknown): value is Stock {
  return isRecord(value);
}

function pct(value: number) {
  const safeValue = n(value);
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${safeValue.toFixed(2)}%`;
}

function formatFlow(value: number) {
  const safeValue = n(value);
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${(safeValue / 100_000_000).toFixed(0)}억원`;
}

function translateMacdSignal(signal: Stock["macdSignal"]) {
  if (signal === "golden_cross") return "골든크로스";
  if (signal === "bullish") return "강세";
  if (signal === "dead_cross") return "데드크로스";
  return "약세";
}

function getDailyCloseSource(stock: Stock) {
  const tags = Array.isArray(stock.tags) ? stock.tags : [];
  return tags.some((tag) => tag.toLowerCase() === "data.go.kr")
    ? "data.go.kr 일별 종가"
    : "일별 종가 데이터";
}

function maGap(stock: Stock, period: "ma5" | "ma20" | "ma60") {
  const baseline = n(stock[period]);
  if (!baseline) return 0;
  return ((n(stock.price) - baseline) / baseline) * 100;
}

export function getRiskLevel(score: number): RiskLevel {
  if (score >= 82) return "위험 높음";
  if (score >= 62) return "신중 관찰";
  if (score >= 38) return "중성 대기";
  return "낮은 위험 관찰";
}

export function getRiskSeverity(level: RiskLevel): SignalSeverity {
  if (level === "매우 높음" || level === "위험 높음") return "extreme";
  if (level === "높음" || level === "신중 관찰") return "high";
  if (level === "보통" || level === "중성 대기") return "medium";
  return "low";
}

export function getRiskLabelClass(level: RiskLevel) {
  const severity = getRiskSeverity(level);

  if (severity === "extreme") {
    return "border-red-200 bg-red-100 text-red-700 dark:border-red-900/60 dark:bg-red-950/60 dark:text-red-200";
  }

  if (severity === "high") {
    return "border-orange-200 bg-orange-100 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-200";
  }

  if (severity === "medium") {
    return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200";
  }

  return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200";
}

export function getSignalLabelClass(severity: SignalSeverity) {
  if (severity === "extreme") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200";
  }

  if (severity === "high") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-200";
  }

  if (severity === "medium") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";
  }

  return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200";
}

export function getOpportunitySignals(stock: Stock): OpportunitySignal[] {
  const signals: OpportunitySignal[] = [];
  const ma20Gap = maGap(stock, "ma20");
  const ma60Gap = maGap(stock, "ma60");

  const rsi = n(stock.rsi, 50);
  const recentChangeRate = n(stock.recentChangeRate);
  const volumeChange = n(stock.volumeChange);
  const netFlow = n(stock.foreignFlow) + n(stock.institutionFlow);

  if (volumeChange >= 18) {
    signals.push({
      id: "volume_expansion",
      label: "거래량 확대",
      category: "거래량 이상",
      severity: volumeChange >= 55 ? "high" : "medium",
      reason: `거래량이 20일 평균 대비 ${pct(volumeChange)} 확대`,
      aiComment: "거래 참여가 늘어나며 가격 방향을 확인해야 하는 구간입니다.",
      observationFocus: "거래량 증가가 가격 유지로 이어지는지 확인"
    });
  }

  if (ma20Gap > 0.4) {
    signals.push({
      id: "ma20_breakout",
      label: "MA20 돌파",
      category: "추세 돌파",
      severity: ma20Gap > 3 ? "high" : "medium",
      reason: `최근 종가가 MA20보다 ${pct(ma20Gap)} 위`,
      aiComment: "단기 추세선을 회복했습니다. 유지 여부가 중요합니다.",
      observationFocus: "MA20 위에서 종가가 유지되는지 관찰"
    });
  }

  if (ma60Gap > 0.2 && recentChangeRate > 0) {
    signals.push({
      id: "ma60_breakout",
      label: "MA60 돌파",
      category: "추세 돌파",
      severity: ma60Gap > 4 ? "high" : "medium",
      reason: `중기 평균선 대비 ${pct(ma60Gap)} 위치`,
      aiComment: "중기 흐름 회복 신호가 나타났습니다.",
      observationFocus: "MA60 재이탈 없이 거래량이 유지되는지 확인"
    });
  }

  if (rsi <= 42 && recentChangeRate > -1) {
    signals.push({
      id: "rsi_rebound",
      label: "RSI 침체 반등",
      category: "침체 반등",
      severity: "medium",
      reason: `RSI ${rsi.toFixed(1)}에서 반등 가능 구간`,
      aiComment: "낙폭 이후 하락 압력이 둔화되는지 볼 수 있는 위치입니다.",
      observationFocus: "RSI 45 회복과 거래량 동반 여부 확인"
    });
  }

  if (stock.macdSignal === "golden_cross" || stock.macdSignal === "bullish") {
    signals.push({
      id: "macd_cross",
      label: stock.macdSignal === "golden_cross" ? "MACD 골든크로스" : "MACD 우위",
      category: "추세 돌파",
      severity: stock.macdSignal === "golden_cross" ? "high" : "medium",
      reason:
        stock.macdSignal === "golden_cross"
          ? "MACD가 신호선을 상향 돌파"
          : "MACD가 신호선 위에서 유지",
      aiComment: "단기 동력이 개선되고 있으나 거래량 확인이 필요합니다.",
      observationFocus: "MACD 우위가 2~3거래일 유지되는지 관찰"
    });
  }

  if (recentChangeRate >= 5 || rsi >= 70 || ma20Gap >= 7) {
    signals.push({
      id: "fast_rally_risk",
      label: "단기 급등 주의",
      category: "고위험 추격",
      severity: recentChangeRate >= 8 || rsi >= 76 ? "extreme" : "high",
      reason: `최근 5거래일 등락률 ${pct(recentChangeRate)}, RSI ${rsi.toFixed(1)}`,
      aiComment: "단기 과열 신호가 있어 변동성 확대를 조심해서 관찰해야 합니다.",
      observationFocus: "고점 부근 거래량 감소나 긴 윗꼬리 발생 여부 확인"
    });
  }

  if (netFlow > 90_000_000_000 || stock.newsSentiment === "positive") {
    signals.push({
      id: "capital_attention",
      label: "수급 관심",
      category: "수급 관심",
      severity: netFlow > 180_000_000_000 ? "high" : "medium",
      reason: `외국인+기관 순흐름 ${formatFlow(netFlow)}, 뉴스 심리 ${stock.newsSentiment}`,
      aiComment: "수급 관심이 감지됩니다. 가격 반응과 동행하는지 확인해야 합니다.",
      observationFocus: "외국인·기관 흐름이 연속성을 갖는지 관찰"
    });
  }

  return signals;
}

function getComponentTone(score: number, maxScore: number): SignalSeverity {
  const ratio = score / maxScore;
  if (ratio >= 0.82) return "extreme";
  if (ratio >= 0.62) return "high";
  if (ratio >= 0.38) return "medium";
  return "low";
}

export function calculateEntryRiskScore(stock: Stock): EntryRiskScore {
  const ma20Gap = maGap(stock, "ma20");
  const rsi = n(stock.rsi, 50);
  const volumeChange = n(stock.volumeChange);
  const recentChangeRate = n(stock.recentChangeRate);
  const rsiRisk = clamp(Math.round((rsi - 35) * 0.55), 0, 22);
  const maRisk = clamp(Math.round(Math.abs(ma20Gap) * 2.2), 0, 22);
  const volumeRisk = clamp(Math.round(Math.max(volumeChange, 0) * 0.28), 0, 18);
  const rallyRisk = clamp(Math.round(Math.max(recentChangeRate, 0) * 3.1), 0, 20);
  const macdRisk =
    stock.macdSignal === "golden_cross"
      ? 8
      : stock.macdSignal === "bullish"
        ? 5
        : stock.macdSignal === "dead_cross"
          ? 12
          : 10;
  const sentimentRisk =
    stock.newsSentiment === "negative" ? 6 : stock.newsSentiment === "positive" ? -2 : 0;
  const normalized = Math.round(
    clamp(18 + rsiRisk + maRisk + volumeRisk + rallyRisk + macdRisk + sentimentRisk, 0, 100)
  );
  const level = getRiskLevel(normalized);
  const components: RiskComponent[] = [
    {
      id: "rsi",
      label: "RSI 위험",
      score: rsiRisk,
      maxScore: 22,
      value: rsi.toFixed(1),
      tone: getComponentTone(rsiRisk, 22),
      explanation:
        rsi >= 70
          ? "단기 과열권에 가까워 신중 관찰이 필요합니다."
          : rsi <= 35
            ? "침체권에 가까워 반등 확인이 우선입니다."
            : "과열과 침체 사이의 중립 구간입니다."
    },
    {
      id: "ma_gap",
      label: "이동평균 이격 위험",
      score: maRisk,
      maxScore: 22,
      value: pct(ma20Gap),
      tone: getComponentTone(maRisk, 22),
      explanation:
        Math.abs(ma20Gap) >= 6
          ? "MA20과의 거리가 커져 변동성 되돌림을 관찰해야 합니다."
          : "MA20과의 거리는 아직 과도하지 않은 편입니다."
    },
    {
      id: "volume",
      label: "거래량 위험",
      score: volumeRisk,
      maxScore: 18,
      value: pct(volumeChange),
      tone: getComponentTone(volumeRisk, 18),
      explanation:
        volumeChange >= 50
          ? "거래량이 급증해 기대와 변동성이 동시에 커진 상태입니다."
          : "거래량 변화는 확인 가능한 수준입니다."
    },
    {
      id: "recent_change",
      label: "단기 상승 위험",
      score: rallyRisk,
      maxScore: 20,
      value: pct(recentChangeRate),
      tone: getComponentTone(rallyRisk, 20),
      explanation:
        recentChangeRate >= 5
          ? "최근 상승 속도가 빨라 기다림과 확인이 필요한 구간입니다."
          : "최근 등락 속도는 과도하지 않은 편입니다."
    },
    {
      id: "macd",
      label: "MACD 동력 위험",
      score: macdRisk,
      maxScore: 18,
      value: stock.macdSignal.replace("_", " "),
      tone: getComponentTone(macdRisk, 18),
      explanation:
        stock.macdSignal === "golden_cross" || stock.macdSignal === "bullish"
          ? "동력은 개선 중이지만 과열 여부를 함께 확인해야 합니다."
          : "동력이 약해져 추가 확인 전까지 신중한 관찰이 필요합니다."
    }
  ];

  return {
    score: normalized,
    level,
    summary:
      level === "낮은 위험 관찰"
        ? "과열 신호가 크지 않아 차분히 관찰할 수 있는 구간입니다."
        : level === "중성 대기"
          ? "방향성은 열려 있지만 확인 신호가 더 필요한 구간입니다."
          : level === "신중 관찰"
            ? "단기 부담이 있어 기다림과 확인이 필요한 구간입니다."
            : "과열과 변동성 신호가 커져 매우 신중한 관찰이 필요한 구간입니다.",
    methodology:
      "RSI, MA20 이격, 5거래일 등락률, 거래량 변화, MACD 상태, 뉴스 심리를 0~100 점수로 합산한 참고 관찰 지표입니다.",
    components,
    drivers: components.map((component) => ({
      label: component.label,
      value: component.value,
      tone: component.tone
    })),
    updatedAt: DATA_UPDATED_AT
  };
}

export function getOpportunityRadar(stocks: Stock[]) {
  return stocks
    .map((stock): OpportunityRadarItem => {
      const signals = getOpportunitySignals(stock);
      const risk = calculateEntryRiskScore(stock);
      const severityBonus = signals.reduce(
        (sum, signal) =>
          sum + (signal.severity === "extreme" ? 18 : signal.severity === "high" ? 12 : 7),
        0
      );
      const priorityScore = clamp(
        Math.round(
          signals.length * 14 +
            risk.score * 0.46 +
            Math.max(stock.volumeChange, 0) * 0.12 +
            severityBonus
        ),
        0,
        100
      );
      const leadSignal = signals[0];

      return {
        stock,
        signals,
        riskLevel: risk.level,
        priorityScore,
        aiSummary: leadSignal
          ? `${leadSignal.category}: ${leadSignal.aiComment}`
          : "뚜렷한 단기 신호는 약합니다. 지수와 업종 흐름을 함께 확인하세요.",
        observationFocus:
          leadSignal?.observationFocus ??
          `거래량 변화 ${pct(stock.volumeChange)}와 MA20 위치를 우선 확인`,
        updatedAt: DATA_UPDATED_AT
      };
    })
    .filter((item) => item.signals.length > 0)
    .sort((left, right) => right.priorityScore - left.priorityScore)
    .slice(0, 10);
}

export function getTopOpportunities(stocks: Stock[], count = 5) {
  return getOpportunityRadar(stocks).slice(0, count);
}

export function getOpportunityCategoryCounts(items: OpportunityRadarItem[]) {
  const categories: OpportunityCategory[] = [
    "거래량 이상",
    "추세 돌파",
    "침체 반등",
    "고위험 추격",
    "수급 관심"
  ];

  return categories.map((category) => ({
    category,
    count: (Array.isArray(items) ? items : []).filter((item) => {
      const signals = Array.isArray(item?.signals) ? item.signals : [];
      return signals.some((signal) => signal?.category === category);
    })
      .length
  }));
}

export function getIndicatorTranslations(stock: Stock, latest?: TechnicalPoint): IndicatorTranslation[] {
  const macdValue = latest?.macd ?? 0;
  const macdSignalValue = latest?.macdSignal ?? 0;
  const ma5Gap = maGap(stock, "ma5");
  const ma20Gap = maGap(stock, "ma20");
  const ma60Gap = maGap(stock, "ma60");
  const rsi = n(stock.rsi, 50);
  const ma5 = n(stock.ma5, n(stock.price));
  const ma20 = n(stock.ma20, n(stock.price));
  const ma60 = n(stock.ma60, n(stock.price));

  return [
    {
      label: "RSI",
      value: rsi.toFixed(1),
      plainText:
        rsi >= 70
          ? `RSI ${rsi.toFixed(0)}: 단기 과열권에 가까워 추격 관찰 위험이 높아집니다.`
          : rsi <= 35
            ? `RSI ${rsi.toFixed(0)}: 하락 압력이 컸던 구간으로 반등 확인이 필요합니다.`
            : `RSI ${rsi.toFixed(0)}: 과열과 침체 사이의 중립 구간입니다.`,
      riskMeaning:
        rsi >= 70
          ? "단기 기대가 앞서 있어 변동성 확대 가능성이 있습니다."
          : rsi <= 35
            ? "낙폭 이후에도 추가 확인 전까지 방향성이 불안정할 수 있습니다."
            : "과열 부담은 제한적이지만 뚜렷한 우위 신호도 아직 약합니다.",
      nextWatch: "RSI 50선 회복 또는 70선 근처 둔화 여부를 관찰합니다."
    },
    {
      label: "MACD",
      value: translateMacdSignal(stock.macdSignal),
      plainText:
        stock.macdSignal === "golden_cross"
          ? "MACD 골든크로스: 단기 동력이 강해졌지만 거래량 확인이 필요합니다."
          : macdValue > macdSignalValue
            ? "MACD가 신호선 위에 있어 단기 동력이 우세합니다."
            : "MACD가 신호선 아래에 있어 단기 탄력은 아직 약합니다.",
      riskMeaning:
        macdValue > macdSignalValue
          ? "동력은 개선됐지만 가격이 이미 많이 오른 경우 신중 관찰이 필요합니다."
          : "동력 확인이 부족해 기다림과 재확인이 필요한 구간입니다.",
      nextWatch: "MACD와 신호선 간격이 확대되는지, 거래량이 동반되는지 확인합니다."
    },
    {
      label: "MA5",
      value: ma5.toLocaleString("ko-KR"),
      plainText:
        ma5Gap >= 0
          ? `최근 종가가 MA5보다 ${pct(ma5Gap)} 위에 있어 아주 단기 흐름은 강한 편입니다.`
          : `최근 종가가 MA5보다 ${pct(ma5Gap)} 아래에 있어 단기 속도 조절이 나타납니다.`,
      riskMeaning:
        Math.abs(ma5Gap) >= 4
          ? "단기 평균과 거리가 벌어져 하루 단위 흔들림이 커질 수 있습니다."
          : "단기 평균과의 거리는 아직 관리 가능한 범위입니다.",
      nextWatch: "MA5 이탈 후 재회복 여부와 당일 종가 위치를 봅니다."
    },
    {
      label: "MA20",
      value: ma20.toLocaleString("ko-KR"),
      plainText:
        ma20Gap >= 0
          ? `최근 종가가 MA20 위에 있어 단기 추세선은 참고 관찰 지지 역할을 할 수 있습니다.`
          : `최근 종가가 MA20 아래에 있어 회복 확인 전까지 변동성 관찰이 필요합니다.`,
      riskMeaning:
        Math.abs(ma20Gap) >= 6
          ? "20일 평균과의 이격이 커져 되돌림 또는 재확인 가능성이 있습니다."
          : "20일 평균과의 거리는 과도하지 않은 편입니다.",
      nextWatch: "MA20 위에서 2~3거래일 유지되는지 확인합니다."
    },
    {
      label: "MA60",
      value: ma60.toLocaleString("ko-KR"),
      plainText:
        ma60Gap >= 0
          ? `최근 종가가 MA60 위에 있어 중기 흐름은 상대적으로 안정적인 편입니다.`
          : `최근 종가가 MA60 아래에 있어 중기 추세 회복 여부를 더 확인해야 합니다.`,
      riskMeaning:
        ma60Gap >= 0
          ? "중기 흐름은 우호적이나 단기 과열과 별도로 확인해야 합니다."
          : "중기 흐름이 약해 변동성 구간이 길어질 수 있습니다.",
      nextWatch: "MA60 재이탈 여부와 업종 대표주의 동조 흐름을 관찰합니다."
    }
  ];
}

export function createTradingPlan(
  stock: Stock,
  entryPrice: number,
  quantity: number,
  holdingPeriod: HoldingPeriod
): TradingPlan {
  const safeEntryPrice = n(entryPrice);
  const safeQuantity = n(quantity);
  const price = n(stock.price);
  const supportPrice = n(stock.supportPrice, price);
  const resistancePrice = n(stock.resistancePrice, price);
  const invested = safeEntryPrice * safeQuantity;
  const currentValue = price * safeQuantity;
  const profitLossAmount = currentValue - invested;
  const profitLossRate = invested > 0 ? (profitLossAmount / invested) * 100 : 0;
  const periodLabel =
    holdingPeriod === "short" ? "단기" : holdingPeriod === "mid" ? "중기" : "장기";
  const periodStrategy =
    holdingPeriod === "short"
      ? "단기 계획은 MA5, 거래량, 장중 변동성을 우선 참고 관찰합니다."
      : holdingPeriod === "mid"
        ? "중기 계획은 MA20 유지와 업종 흐름을 함께 참고 관찰합니다."
        : "장기 계획은 MA60, 실적 흐름, 수급 연속성을 참고 관찰합니다.";

  return {
    profitLossAmount,
    profitLossRate,
    supportPrice,
    resistancePrice,
    periodLabel,
    warning:
      price < supportPrice * 1.02
        ? "최근 종가가 참고 관찰 지지권에 가까워 변동성 확대 여부를 확인해야 합니다."
        : price > resistancePrice * 0.98
          ? "최근 종가가 참고 관찰 저항권에 가까워 단기 되돌림 가능성을 함께 봐야 합니다."
          : "최근 종가는 참고 관찰 지지권과 저항권 사이에 있어 거래량 변화가 중요합니다.",
    observationStrategy: `${periodStrategy} 참고 관찰 지지위 ${supportPrice.toLocaleString(
      "ko-KR"
    )}원, 참고 관찰 저항위 ${resistancePrice.toLocaleString("ko-KR")}원을 기준으로 흔들림 범위를 확인합니다.`
  };
}

export function getPotentialLevel(score: number): PotentialLevel {
  if (score >= 80) return "강한 잠재 후보";
  if (score >= 60) return "관찰 가치 있음";
  if (score >= 40) return "중립 관찰";
  return "잠재 신호 약함";
}

export function getDangerRiskLevel(score: number): RiskLevel {
  if (score >= 81) return "매우 높음";
  if (score >= 61) return "높음";
  if (score >= 31) return "보통";
  return "낮음";
}

export function calculatePotentialRadarItem(stock: Stock): PotentialRadarItem {
  const price = n(stock.price);
  const ma5 = n(stock.ma5, price);
  const ma20 = n(stock.ma20, price);
  const ma60 = n(stock.ma60, ma20);
  const rsi = n(stock.rsi, 50);
  const volumeChange = n(stock.volumeChange);
  const ma20Gap = maGap(stock, "ma20");
  const distanceToHigh = stock.resistancePrice
    ? ((n(stock.resistancePrice, price) - price) / n(stock.resistancePrice, price)) * 100
    : 99;
  const reasons: string[] = [];
  const observationPoints: string[] = [];
  let score = 0;

  if (price > ma20) {
    score += 20;
    reasons.push("최근 종가가 MA20 위에서 마감");
  } else {
    observationPoints.push("MA20 회복 여부 확인 필요");
  }

  if (ma5 > ma20) {
    score += 15;
    reasons.push("MA5가 MA20 위에 위치");
  }

  if (ma20 >= ma60 * 0.995 || ma20Gap >= -1) {
    score += 15;
    reasons.push("MA20 흐름이 완만하거나 개선 구간");
  }

  if (rsi >= 45 && rsi <= 68) {
    score += 15;
    reasons.push(`RSI ${rsi.toFixed(1)} 건강 구간`);
  } else if (rsi > 68) {
    observationPoints.push("RSI 과열 접근 여부 신중 확인");
  } else {
    observationPoints.push("RSI 45 회복 여부 관찰");
  }

  if (stock.macdSignal === "golden_cross" || stock.macdSignal === "bullish") {
    score += 15;
    reasons.push(`MACD ${translateMacdSignal(stock.macdSignal)} 상태`);
  }

  if (volumeChange > 0) {
    score += 10;
    reasons.push(`거래량 20일 평균 대비 ${pct(volumeChange)}`);
  }

  if (distanceToHigh >= 0 && distanceToHigh < 8) {
    score += 10;
    reasons.push(`20일 고점까지 ${Math.max(distanceToHigh, 0).toFixed(1)}% 거리`);
  }

  if (rsi > 75) {
    score -= 15;
    observationPoints.push("RSI 75 초과로 단기 과열 부담 확인 필요");
  }

  if (ma20Gap > 12) {
    score -= 15;
    observationPoints.push(`MA20 대비 ${pct(ma20Gap)} 이격으로 되돌림 리스크 관리 필요`);
  }

  if (n(stock.recentChangeRate) > 10) {
    score -= 8;
    observationPoints.push("최근 5거래일 상승 속도 과도 여부 신중 확인");
  }

  const normalizedScore = clamp(Math.round(score), 0, 100);
  const danger = calculateDangerWarningItem(stock);

  return {
    stock,
    score: normalizedScore,
    level: getPotentialLevel(normalizedScore),
    reasons:
      reasons.length > 0
        ? reasons.slice(0, 4)
        : ["잠재 신호가 아직 약해 MA20, 거래량, RSI 확인이 필요합니다."],
    observationPoints:
      observationPoints.length > 0
        ? observationPoints.slice(0, 3)
        : ["MA20 위 종가 유지", "거래량 확대 지속", "RSI 건강 구간 유지"],
    riskLevel: danger.level,
    dataSource: getDailyCloseSource(stock),
    updatedAt: stock.date ? `${stock.date} 기준` : DATA_UPDATED_AT
  };
}

export function calculateDangerWarningItem(stock: Stock): DangerWarningItem {
  const price = n(stock.price);
  const ma5 = n(stock.ma5, price);
  const ma20 = n(stock.ma20, price);
  const rsi = n(stock.rsi, 50);
  const volumeChange = n(stock.volumeChange);
  const ma20Gap = maGap(stock, "ma20");
  const nearHigh = price >= n(stock.resistancePrice, price) * 0.95;
  const signals: string[] = [];
  let score = 0;

  if (rsi > 75) {
    score += 20;
    signals.push(`RSI ${rsi.toFixed(1)} 과열 구간`);
  }

  if (ma20Gap > 8) {
    score += 20;
    signals.push(`MA20 대비 ${pct(ma20Gap)} 높은 위치`);
  }

  if (stock.changeRate < 0 && volumeChange > 25) {
    score += 20;
    signals.push(`거래량 확대 속 하락 마감 ${pct(stock.changeRate)}`);
  }

  if (price < ma20) {
    score += 20;
    signals.push("최근 종가가 MA20 아래에서 마감");
  }

  if (ma5 < ma20) {
    score += 10;
    signals.push("MA5가 MA20 아래에 위치");
  }

  if (stock.macdSignal === "bearish" || stock.macdSignal === "dead_cross") {
    score += 10;
    signals.push(`MACD ${translateMacdSignal(stock.macdSignal)} 전환`);
  }

  if (nearHigh && (stock.changeRate <= 0 || n(stock.recentChangeRate) < 1 || stock.macdSignal === "bearish")) {
    score += 10;
    signals.push("20일 고점권에서 상승 탄력 둔화");
  }

  const normalizedScore = clamp(Math.round(score), 0, 100);
  const level = getDangerRiskLevel(normalizedScore);
  const cautionReason =
    signals.length > 0
      ? `${signals.slice(0, 3).join(" · ")} 신호가 있어 신중한 참고 관찰이 필요합니다.`
      : "강한 위험 신호는 제한적이지만 일별 종가 기준 추세 확인은 필요합니다.";
  const recheckCriteria =
    price < ma20
      ? "MA20 회복과 거래량 안정 여부를 재확인합니다."
      : rsi > 75
        ? "RSI 과열 완화와 20일 고점권 반응을 재확인합니다."
        : "MA5, MA20, 거래량 변화가 같은 방향으로 안정되는지 재확인합니다.";

  return {
    stock,
    score: normalizedScore,
    level,
    signals: signals.length > 0 ? signals.slice(0, 5) : ["두드러진 고위험 신호 없음"],
    cautionReason,
    recheckCriteria,
    dataSource: getDailyCloseSource(stock),
    updatedAt: stock.date ? `${stock.date} 기준` : DATA_UPDATED_AT
  };
}

export function getPotentialRadar(stocks: Stock[]) {
  return (Array.isArray(stocks) ? stocks : [])
    .filter(isStockLike)
    .map(calculatePotentialRadarItem)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}

export function getDangerWarnings(stocks: Stock[]) {
  return (Array.isArray(stocks) ? stocks : [])
    .filter(isStockLike)
    .map(calculateDangerWarningItem)
    .filter((item) => item.score >= 31)
    .sort((left, right) => right.score - left.score)
    .slice(0, 8);
}

export function getWatchlistPriority(stocks: Stock[]) {
  return stocks
    .map((stock) => {
      const signals = getOpportunitySignals(stock);
      const risk = calculateEntryRiskScore(stock);
      const volumeChange = n(stock.volumeChange);
      const severityBonus = signals.reduce(
        (sum, signal) =>
          sum + (signal.severity === "extreme" ? 12 : signal.severity === "high" ? 9 : 5),
        0
      );
      const priority = clamp(
        Math.round(
            signals.length * 18 +
            severityBonus +
            risk.score * 0.5 +
            Math.max(volumeChange, 0) * 0.18
        ),
        0,
        100
      );
      const leadReason =
        signals[0]?.reason ?? `거래량 변화 ${pct(volumeChange)}와 MA20 위치를 우선 확인`;

      return {
        stock,
        priority,
        riskLevel: risk.level,
        reasons:
          signals.length > 0
            ? signals.slice(0, 3).map((signal) => signal.label)
            : ["뚜렷한 신호 없음"],
        focus: leadReason,
        whyToday:
          signals.length > 0
            ? `${signals.length}개 신호가 겹쳤고 ${risk.level} 구간이라 오늘 먼저 확인할 필요가 있습니다.`
            : "강한 신호는 없지만 자주 보는 종목이므로 변화 발생 여부를 확인합니다.",
        briefingLine: `${stock.koreanName}: ${leadReason}. 위험도는 ${risk.level}, 오늘은 ${signals[0]?.observationFocus ?? "거래량과 이동평균 위치"}를 참고 관찰합니다.`
      };
    })
    .sort((left, right) => right.priority - left.priority);
}
