import { Bot, ShieldAlert } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { formatKRW, formatPercent } from "@/lib/format";
import { DISCLAIMER } from "@/lib/insights";
import type {
  Candle,
  ForeignOwnershipData,
  RealtimeQuote,
  Stock,
  TechnicalPoint
} from "@/lib/types";

type DecisionLabel =
  | "진입 관찰 가능"
  | "대기·확인 필요"
  | "추격 주의"
  | "리스크 관리 필요";

type TradingJudgement = {
  score: number;
  label: DecisionLabel;
  why: string;
  entryReasons: string[];
  cautionReasons: string[];
  riskManagementReasons: string[];
  nextChecks: string[];
  realtimeSourceText: string;
  closeSourceText: string;
  technicalSourceText: string;
  foreignOwnershipText: string;
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

function getDecisionLabel(score: number): DecisionLabel {
  if (score <= 30) return "진입 관찰 가능";
  if (score <= 55) return "대기·확인 필요";
  if (score <= 75) return "추격 주의";
  return "리스크 관리 필요";
}

function getScoreToneClass(score: number) {
  if (score <= 30) {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200";
  }
  if (score <= 55) {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";
  }
  if (score <= 75) {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200";
  }
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200";
}

function computeJudgement(
  stock: Stock,
  candles: Candle[],
  technicalSeries: TechnicalPoint[],
  realtimeQuote?: RealtimeQuote | null,
  foreignOwnership?: ForeignOwnershipData | null
): TradingJudgement | null {
  const safeCandles = Array.isArray(candles) ? candles : [];
  const safeSeries = Array.isArray(technicalSeries) ? technicalSeries : [];

  if (safeCandles.length < 20 || safeSeries.length < 20) {
    return null;
  }

  const recent20 = safeCandles.slice(-20);
  const recent5 = safeCandles.slice(-5);
  const latest = safeSeries[safeSeries.length - 1];

  if (!latest || recent5.length < 5) {
    return null;
  }

  const recentClose = n(stock.price, n(latest.close));
  const realtimePrice =
    realtimeQuote && Number.isFinite(realtimeQuote.price) && realtimeQuote.price > 0
      ? n(realtimeQuote.price)
      : null;
  const currentPrice = realtimePrice ?? recentClose;

  const ma5 = n(latest.ma5, n(stock.ma5, recentClose));
  const ma20 = n(latest.ma20, n(stock.ma20, recentClose));
  const ma60 = n(latest.ma60, n(stock.ma60, ma20 || recentClose));
  const rsi = n(latest.rsi, n(stock.rsi, 50));
  const macdHistogram = n(latest.macdHistogram);
  const volumeNow = n(latest.volume, n(stock.volume));
  const avgVolume20 = avg(recent20.map((item) => n(item.volume)));
  const volumeChange = avgVolume20 > 0 ? pct(volumeNow, avgVolume20) : n(stock.volumeChange);

  const high20 = Math.max(...recent20.map((item) => n(item.high, recentClose)));
  const low20 = Math.min(...recent20.map((item) => n(item.low, recentClose)));
  const firstRecent5Close = n(recent5[0]?.close, recentClose);
  const recent5ChangeRate = pct(recentClose, firstRecent5Close);
  const ma20Gap = ma20 > 0 ? pct(currentPrice, ma20) : 0;
  const ma60Gap = ma60 > 0 ? pct(currentPrice, ma60) : 0;
  const high20Distance = high20 > 0 ? ((high20 - currentPrice) / high20) * 100 : 99;
  const low20Distance = low20 > 0 ? ((currentPrice - low20) / low20) * 100 : 99;
  const foreignOwnershipRatio =
    typeof foreignOwnership?.foreignOwnershipRatio === "number" &&
    Number.isFinite(foreignOwnership.foreignOwnershipRatio)
      ? foreignOwnership.foreignOwnershipRatio
      : null;

  let score = 48;

  if (currentPrice >= ma20) score -= 12;
  else score += 14;

  if (ma5 >= ma20) score -= 6;
  else score += 8;

  if (currentPrice >= ma5) score -= 4;
  else score += 6;

  if (rsi >= 72) score += 16;
  else if (rsi <= 35) score += 8;
  else if (rsi >= 45 && rsi <= 65) score -= 6;

  if (macdHistogram >= 0) score -= 6;
  else score += 9;

  if (recent5ChangeRate >= 6) score += 14;
  else if (recent5ChangeRate <= -6) score += 8;

  if (volumeChange >= 30 && currentPrice < ma20) score += 8;
  else if (volumeChange >= 20 && currentPrice >= ma20) score -= 2;

  if (high20Distance <= 2) score += 10;
  if (low20Distance <= 2) score += 5;
  if (Math.abs(ma20Gap) >= 9) score += 8;
  if (foreignOwnershipRatio !== null && foreignOwnershipRatio >= 20) score -= 3;
  if (foreignOwnershipRatio !== null && foreignOwnershipRatio <= 5) score += 4;

  const normalizedScore = clamp(Math.round(score), 0, 100);
  const label = getDecisionLabel(normalizedScore);

  const entryReasons: string[] = [];
  const cautionReasons: string[] = [];
  const riskManagementReasons: string[] = [];
  const nextChecks: string[] = [];

  if (currentPrice >= ma20) {
    entryReasons.push(`현재가가 MA20 대비 ${formatPercent(ma20Gap)} 위에서 관찰됩니다.`);
  }
  if (ma5 >= ma20) {
    entryReasons.push("MA5가 MA20 위에 있어 단기 배열은 관찰 가능한 상태입니다.");
  }
  if (macdHistogram >= 0) {
    entryReasons.push("MACD 동력이 약화되지 않고 유지되는 구간입니다.");
  }
  if (rsi >= 42 && rsi <= 68) {
    entryReasons.push(`RSI ${rsi.toFixed(1)}로 과열 부담이 과도하지 않은 구간입니다.`);
  }
  if (volumeChange >= 10 && currentPrice >= ma20) {
    entryReasons.push(`거래량이 20일 평균 대비 ${formatPercent(volumeChange)} 변화해 추세 확인에 참고됩니다.`);
  }
  if (entryReasons.length === 0) {
    entryReasons.push("진입 관찰 신호는 제한적이며 추가 확인이 필요한 상태입니다.");
  }
  if (foreignOwnershipRatio !== null && foreignOwnershipRatio >= 20) {
    entryReasons.push(
      `외국인 보유율 ${foreignOwnershipRatio.toFixed(2)}%로 수급 안정 참고 구간입니다.`
    );
  }

  if (currentPrice < ma20) {
    cautionReasons.push("현재가가 MA20 아래에 있어 대기·확인 필요 구간입니다.");
  }
  if (rsi >= 70) {
    cautionReasons.push(`RSI ${rsi.toFixed(1)}로 단기 과열 부담이 있어 추격은 신중해야 합니다.`);
  }
  if (recent5ChangeRate >= 5) {
    cautionReasons.push(`최근 5거래일 변동률 ${formatPercent(recent5ChangeRate)}로 상승 속도 재평가가 필요합니다.`);
  }
  if (high20Distance <= 2) {
    cautionReasons.push("20일 고점 부근이라 추격 시 변동성 확대를 신중하게 관찰해야 합니다.");
  }
  if (macdHistogram < 0) {
    cautionReasons.push("MACD 동력이 약해져 확인 필요 신호가 남아 있습니다.");
  }
  if (cautionReasons.length === 0) {
    cautionReasons.push("단기 과열 신호는 제한적이지만 추세 지속 여부는 계속 확인이 필요합니다.");
  }
  if (foreignOwnershipRatio !== null && foreignOwnershipRatio <= 5) {
    cautionReasons.push(
      `외국인 보유율 ${foreignOwnershipRatio.toFixed(2)}%로 수급 변동성 확인이 필요합니다.`
    );
  }

  if (normalizedScore >= 76) {
    riskManagementReasons.push("판단 점수가 높아 리스크 관리 우선 관찰이 필요한 구간입니다.");
  }
  if (high20Distance <= 1.5) {
    riskManagementReasons.push("20일 고점권에서 되돌림이 나오는지 재평가가 필요합니다.");
  }
  if (ma20Gap >= 10) {
    riskManagementReasons.push("MA20 대비 이격이 커져 단기 과열 리스크 관리가 필요합니다.");
  }
  if (low20Distance <= 1.5 || currentPrice <= ma20) {
    riskManagementReasons.push("지지선 이탈 여부를 관찰하며 단계적 리스크 관리를 준비해야 합니다.");
  }
  if (riskManagementReasons.length === 0) {
    riskManagementReasons.push("리스크 관리 조건은 완화됐지만 변동성 재확인은 계속 필요합니다.");
  }

  nextChecks.push(
    `다음 종가가 MA20(${formatKRW(ma20)}) 위에서 유지되는지 확인`
  );
  nextChecks.push(
    `RSI ${rsi.toFixed(1)} 흐름이 50 부근에서 안정되는지 재평가`
  );
  nextChecks.push(
    `MACD 히스토그램 ${macdHistogram.toFixed(2)}의 방향 전환 여부 확인`
  );
  nextChecks.push(
    `20일 고점 ${formatKRW(high20)} / 저점 ${formatKRW(low20)} 반응과 거래량(${formatPercent(
      volumeChange
    )}) 변화 확인`
  );

  const realtimeSourceText =
    realtimePrice !== null
      ? `현재가 ${formatKRW(currentPrice)} (KIS 기준)`
      : "현재가 대신 data.go.kr 최근 종가를 기준으로 표시합니다.";
  const closeSourceText = `최근 종가 ${formatKRW(recentClose)} (data.go.kr 일별 종가 기준)`;
  const technicalSourceText =
    "기술지표(MA5/MA20/MA60, RSI, MACD)는 data.go.kr 일별 종가 데이터 기준으로 계산됩니다.";
  const foreignOwnershipText =
    foreignOwnershipRatio !== null
      ? `외국인 보유율 ${foreignOwnershipRatio.toFixed(2)}% (KIS 기준)도 수급 참고 요소로 반영했습니다.`
      : "외국인 보유율 데이터는 확인 필요 상태이며 판단 점수 계산에는 영향 없이 처리했습니다.";

  return {
    score: normalizedScore,
    label,
    why: `현재가·최근 종가 위치, MA5/MA20/MA60 배열, RSI·MACD 동력, 최근 5거래일 변동, 20일 고저점, 거래량 변화를 함께 반영한 참고 정보입니다.`,
    entryReasons,
    cautionReasons,
    riskManagementReasons,
    nextChecks,
    realtimeSourceText,
    closeSourceText,
    technicalSourceText,
    foreignOwnershipText
  };
}

function SafeList({ items }: { items: string[] }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <ul className="mt-2 grid gap-2">
      {safeItems.map((item, index) => (
        <li
          key={`${index}-${item}`}
          className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300"
        >
          {item}
        </li>
      ))}
    </ul>
  );
}

export function AiTradingJudgementCard({
  stock,
  candles,
  technicalSeries,
  realtimeQuote,
  foreignOwnership
}: {
  stock: Stock;
  candles: Candle[];
  technicalSeries: TechnicalPoint[];
  realtimeQuote?: RealtimeQuote | null;
  foreignOwnership?: ForeignOwnershipData | null;
}) {
  const judgement = computeJudgement(
    stock,
    candles,
    technicalSeries,
    realtimeQuote,
    foreignOwnership
  );

  if (!judgement) {
    return (
      <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <EmptyState
          compact
          title="AI 매매 판단 근거 준비 중"
          description="최근 20거래일 이상의 일별 종가 데이터가 필요합니다. 데이터가 채워지면 판단 근거를 표시합니다."
        />
      </section>
    );
  }

  const score = Number.isFinite(judgement.score) ? judgement.score : 0;
  const scoreWidth = `${clamp(score, 0, 100)}%`;

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">AI 판단</p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">AI 매매 판단 근거</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            KIS 현재가와 data.go.kr 일별 종가·기술 지표를 함께 반영한 참고 정보입니다.
          </p>
        </div>
        <Bot className="h-5 w-5 text-brand" />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400">AI 판단 점수</p>
            <p className="mt-1 text-3xl font-bold text-ink dark:text-white">
              {score}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>
          <span
            className={`inline-flex rounded-md border px-3 py-1.5 text-xs font-bold ${getScoreToneClass(
              score
            )}`}
          >
            {judgement.label}
          </span>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div className="h-full rounded-full bg-brand" style={{ width: scoreWidth }} />
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-white p-3 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
        <p className="font-bold text-slate-800 dark:text-white">왜 이런 판단인가?</p>
        <p className="mt-1">{judgement.why}</p>
        <p className="mt-2">{judgement.realtimeSourceText}</p>
        <p>{judgement.closeSourceText}</p>
        <p>{judgement.technicalSourceText}</p>
        <p>{judgement.foreignOwnershipText}</p>
      </div>

      <div className="mt-4 grid gap-4">
        <article>
          <h3 className="text-sm font-bold text-ink dark:text-white">진입을 고려할 수 있는 이유</h3>
          <SafeList items={judgement.entryReasons} />
        </article>
        <article>
          <h3 className="text-sm font-bold text-ink dark:text-white">신중해야 하는 이유</h3>
          <SafeList items={judgement.cautionReasons} />
        </article>
        <article>
          <h3 className="text-sm font-bold text-ink dark:text-white">청산 / 리스크 관리 관찰 이유</h3>
          <SafeList items={judgement.riskManagementReasons} />
        </article>
        <article>
          <h3 className="text-sm font-bold text-ink dark:text-white">다음 확인 조건</h3>
          <SafeList items={judgement.nextChecks} />
        </article>
      </div>

      <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{DISCLAIMER}</p>
        </div>
      </div>
    </section>
  );
}
