import { NextResponse } from "next/server";
import { buildTechnicalSeries } from "@/lib/indicators";
import { DISCLAIMER } from "@/lib/insights";
import { getRealtimeQuote } from "@/lib/stock-provider";
import {
  getStockCandlesFromDataGoKr,
  getStockDetailFromDataGoKr
} from "@/lib/providers/data-go-kr";
import type {
  InvestmentHorizon,
  PortfolioDiagnosis,
  PortfolioJudgementLabel,
  PortfolioPositionInput,
  RiskProfile
} from "@/lib/types";

type DiagnoseResponse = {
  generatedAt: string;
  items: PortfolioDiagnosis[];
  failures: Array<{
    id: string;
    symbol: string;
    reason: string;
  }>;
};

function n(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function pct(current: number, base: number) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return 0;
  return ((current - base) / base) * 100;
}

function avg(values: number[]) {
  const safeValues = Array.isArray(values)
    ? values.filter((value) => Number.isFinite(value))
    : [];
  if (safeValues.length === 0) return 0;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

function normalizeSymbol(value: unknown) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function normalizeHorizon(value: unknown): InvestmentHorizon {
  return value === "단기" || value === "중기" || value === "장기" ? value : "중기";
}

function normalizeRiskProfile(value: unknown): RiskProfile {
  return value === "보수형" || value === "일반형" || value === "공격형"
    ? value
    : "일반형";
}

function normalizeMemo(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

function normalizePosition(value: unknown): PortfolioPositionInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;

  const id = typeof raw.id === "string" ? raw.id : "";
  const symbol = normalizeSymbol(raw.symbol);
  const buyPrice = n(raw.buyPrice);
  const quantity = n(raw.quantity);

  if (!id || !symbol || buyPrice <= 0 || quantity <= 0) return null;

  return {
    id,
    symbol,
    buyPrice,
    quantity,
    investmentHorizon: normalizeHorizon(raw.investmentHorizon),
    riskProfile: normalizeRiskProfile(raw.riskProfile),
    memo: normalizeMemo(raw.memo)
  };
}

function getJudgement(holdingHealthScore: number, addObservationScore: number, riskManagementScore: number): PortfolioJudgementLabel {
  if (riskManagementScore >= 80) return "리스크 관리 필요";
  if (riskManagementScore >= 65) return "비중 축소 관찰";
  if (addObservationScore <= 35 || riskManagementScore >= 50) return "대기 / 확인 필요";
  if (holdingHealthScore >= 70 && addObservationScore >= 65 && riskManagementScore <= 45) {
    return "추가 관찰 가능";
  }
  return "유지 관찰";
}

function getUpdatedAtLabel(realtimeAsOf: string | null, date: string | undefined) {
  if (typeof realtimeAsOf === "string" && realtimeAsOf.trim()) {
    return realtimeAsOf;
  }
  if (typeof date === "string" && date.trim()) {
    return `${date} 종가`;
  }
  return new Date().toISOString();
}

async function diagnoseOne(position: PortfolioPositionInput) {
  const [detail, candles, realtime] = await Promise.all([
    getStockDetailFromDataGoKr(position.symbol),
    getStockCandlesFromDataGoKr(position.symbol),
    getRealtimeQuote(position.symbol)
  ]);

  if (!detail || !Array.isArray(candles) || candles.length < 20) {
    return {
      failure: {
        id: position.id,
        symbol: position.symbol,
        reason: "data.go.kr 일별 종가 데이터가 부족해 진단을 생성할 수 없습니다."
      }
    };
  }

  const technicalSeries = buildTechnicalSeries(candles);
  const latest = technicalSeries[technicalSeries.length - 1];
  if (!latest) {
    return {
      failure: {
        id: position.id,
        symbol: position.symbol,
        reason: "기술 지표 계산을 위한 데이터가 부족합니다."
      }
    };
  }

  const recent20 = candles.slice(-20);
  const recent5 = candles.slice(-5);
  if (recent20.length < 20 || recent5.length < 5) {
    return {
      failure: {
        id: position.id,
        symbol: position.symbol,
        reason: "최근 20거래일 데이터가 부족해 진단을 생성할 수 없습니다."
      }
    };
  }

  const recentClosePrice = n(detail.price, n(latest.close));
  const hasRealtimePrice = Boolean(realtime && Number.isFinite(realtime.price) && realtime.price > 0);
  const quoteSource: PortfolioDiagnosis["quoteSource"] = hasRealtimePrice
    ? "KIS"
    : "data.go.kr fallback";
  const currentPrice = hasRealtimePrice ? n(realtime?.price) : recentClosePrice;

  const ma5 = n(latest.ma5, n(detail.ma5, recentClosePrice));
  const ma20 = n(latest.ma20, n(detail.ma20, recentClosePrice));
  const ma60 = n(latest.ma60, n(detail.ma60, ma20 || recentClosePrice));
  const rsi = n(latest.rsi, n(detail.rsi, 50));
  const macdHistogram = n(latest.macdHistogram);
  const latestChangeRate = pct(recentClosePrice, n(candles[candles.length - 2]?.close, recentClosePrice));
  const volumeNow = n(latest.volume, n(detail.volume));
  const avgVolume20 = avg(recent20.slice(0, -1).map((item) => n(item.volume)));
  const volumeChange = avgVolume20 > 0 ? pct(volumeNow, avgVolume20) : n(detail.volumeChange);
  const high20 = Math.max(...recent20.map((item) => n(item.high, recentClosePrice)));
  const low20 = Math.min(...recent20.map((item) => n(item.low, recentClosePrice)));
  const ma20Gap = ma20 > 0 ? pct(currentPrice, ma20) : 0;
  const recent5StartClose = n(recent5[0]?.close, recentClosePrice);
  const recent5Change = pct(recentClosePrice, recent5StartClose);
  const todayLow = n(candles[candles.length - 1]?.low, recentClosePrice);
  const yesterdayClose = n(candles[candles.length - 2]?.close, recentClosePrice);
  const isVolumeDownDay = recentClosePrice < yesterdayClose && volumeNow > avgVolume20 * 1.2;
  const isNear20Low = currentPrice <= low20 * 1.03;
  const isPullbackOnMa20 = todayLow <= ma20 * 1.01 && currentPrice >= ma20;
  const isFarFromMa20 = Math.abs(ma20Gap) >= 8;

  let holdingHealthScore = 40;
  let addObservationScore = 45;
  let riskManagementScore = 30;

  if (currentPrice > position.buyPrice) holdingHealthScore += 10;
  else riskManagementScore += 10;

  if (currentPrice > ma20) holdingHealthScore += 20;
  else riskManagementScore += 20;

  if (ma5 > ma20) holdingHealthScore += 10;
  else riskManagementScore += 10;

  if (rsi >= 45 && rsi <= 65) holdingHealthScore += 10;

  if (rsi > 75) {
    addObservationScore -= 20;
    riskManagementScore += 20;
  }

  if (isVolumeDownDay) riskManagementScore += 20;
  if (isNear20Low) riskManagementScore += 15;
  if (isPullbackOnMa20) addObservationScore += 20;
  if (isFarFromMa20) addObservationScore -= 15;

  if (position.investmentHorizon === "장기") {
    holdingHealthScore += 3;
    riskManagementScore -= 3;
  } else if (position.investmentHorizon === "단기") {
    addObservationScore += 4;
  }

  if (position.riskProfile === "보수형") {
    riskManagementScore += 6;
    addObservationScore -= 4;
  } else if (position.riskProfile === "공격형") {
    addObservationScore += 5;
    riskManagementScore -= 4;
  }

  holdingHealthScore = clamp(Math.round(holdingHealthScore), 0, 100);
  addObservationScore = clamp(Math.round(addObservationScore), 0, 100);
  riskManagementScore = clamp(Math.round(riskManagementScore), 0, 100);

  const valuationAmount = currentPrice * position.quantity;
  const costBasis = position.buyPrice * position.quantity;
  const profitLoss = valuationAmount - costBasis;
  const returnRate = costBasis > 0 ? (profitLoss / costBasis) * 100 : 0;

  const judgement = getJudgement(holdingHealthScore, addObservationScore, riskManagementScore);

  const addReasons: string[] = [];
  const cautionReasons: string[] = [];
  const riskManagementReasons: string[] = [];
  const nextChecks: string[] = [];

  if (currentPrice > ma20) addReasons.push(`현재가가 MA20 대비 ${ma20Gap.toFixed(2)}% 위에 있어 추세 관찰이 가능합니다.`);
  if (ma5 > ma20) addReasons.push("MA5가 MA20 위에 있어 단기 배열은 유지 관찰 흐름입니다.");
  if (rsi >= 45 && rsi <= 65) addReasons.push(`RSI ${rsi.toFixed(1)}로 과열 부담이 과도하지 않아 추가 관찰 여지가 있습니다.`);
  if (isPullbackOnMa20) addReasons.push("MA20 부근 되돌림 후 이탈이 제한돼 추가 관찰 조건이 보입니다.");
  if (addReasons.length === 0) addReasons.push("추가 관찰 신호는 제한적이며 확인 필요 구간입니다.");

  if (currentPrice < ma20) cautionReasons.push("현재가가 MA20 아래에 있어 대기 / 확인 필요 구간입니다.");
  if (rsi > 75) cautionReasons.push(`RSI ${rsi.toFixed(1)}로 단기 과열 부담이 커 신중한 재평가가 필요합니다.`);
  if (recent5Change >= 6) cautionReasons.push(`최근 5거래일 변동률 ${recent5Change.toFixed(2)}%로 추격 관찰 위험이 높습니다.`);
  if (isFarFromMa20) cautionReasons.push(`현재가가 MA20과 멀어져 이격 부담 확인이 필요합니다.`);
  if (cautionReasons.length === 0) cautionReasons.push("신중 구간 신호는 제한적이지만 추세 지속 여부는 계속 확인이 필요합니다.");

  if (profitLoss < 0) riskManagementReasons.push("평가손익이 음수 구간이라 리스크 관리 관찰이 필요합니다.");
  if (riskManagementScore >= 65) riskManagementReasons.push("리스크 관리 점수가 높아 비중 조절 관찰이 필요한 구간입니다.");
  if (isVolumeDownDay) riskManagementReasons.push("방향 약세와 거래량 증가가 겹쳐 변동성 확대 가능성을 신중하게 관찰해야 합니다.");
  if (isNear20Low) riskManagementReasons.push("20일 저점 부근 접근으로 지지 여부 재확인이 필요합니다.");
  if (macdHistogram < 0) riskManagementReasons.push("MACD 동력이 약해져 리스크 관리 기준을 재평가할 필요가 있습니다.");
  if (riskManagementReasons.length === 0) riskManagementReasons.push("현재 리스크는 통제 범위지만 기준 이탈 시 즉시 재평가가 필요합니다.");

  nextChecks.push(
    `다음 종가가 MA20(${Math.round(ma20).toLocaleString("ko-KR")}원) 위에서 유지되는지 확인 필요`
  );
  nextChecks.push(`RSI ${rsi.toFixed(1)} 흐름이 50 부근에서 안정되는지 관찰`);
  nextChecks.push(
    `MACD 히스토그램 ${macdHistogram.toFixed(2)} 방향이 연속되는지 재평가`
  );
  nextChecks.push(
    `20일 고점 ${Math.round(high20).toLocaleString("ko-KR")}원 / 저점 ${Math.round(low20).toLocaleString(
      "ko-KR"
    )} 반응과 거래량 변화(${volumeChange.toFixed(2)}%) 확인`
  );

  const item: PortfolioDiagnosis = {
    id: position.id,
    symbol: detail.symbol,
    stockName: detail.koreanName,
    market: detail.market,
    quoteSource,
    buyPrice: position.buyPrice,
    quantity: position.quantity,
    currentPrice,
    recentClosePrice,
    valuationAmount,
    profitLoss,
    returnRate,
    holdingHealthScore,
    addObservationScore,
    riskManagementScore,
    judgement,
    why: `현재가와 최근 종가, MA5/MA20/MA60, RSI, MACD, 최근 5거래일 흐름, 20일 고저점, 거래량 변화를 합산한 참고 정보입니다.`,
    addReasons: addReasons.slice(0, 4),
    cautionReasons: cautionReasons.slice(0, 4),
    riskManagementReasons: riskManagementReasons.slice(0, 4),
    nextChecks: nextChecks.slice(0, 4),
    disclaimer: DISCLAIMER,
    hasRealtimePrice,
    dataSource: hasRealtimePrice
      ? "KIS 현재가 + data.go.kr 일별 종가"
      : "현재가는 data.go.kr 최근 종가 기준입니다.",
    updatedAt: getUpdatedAtLabel(hasRealtimePrice ? realtime?.asOf ?? null : null, detail.date)
  };

  return { item };
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const rawPositions = payload && Array.isArray(payload.positions) ? payload.positions : [];
  const positions = rawPositions
    .map(normalizePosition)
    .filter((item): item is PortfolioPositionInput => Boolean(item));

  const response: DiagnoseResponse = {
    generatedAt: new Date().toISOString(),
    items: [],
    failures: []
  };

  if (positions.length === 0) {
    return NextResponse.json(response);
  }

  const results = await Promise.all(
    positions.map(async (position) => diagnoseOne(position))
  );

  for (const result of results) {
    if ("item" in result && result.item) {
      response.items.push(result.item);
    } else if ("failure" in result && result.failure) {
      response.failures.push(result.failure);
    }
  }

  return NextResponse.json(response);
}
