import { Compass, ShieldAlert } from "lucide-react";
import { formatKRW, formatPercent } from "@/lib/format";
import type { Stock, TechnicalPoint } from "@/lib/types";
import { EmptyState } from "@/components/ui-states";

type JudgementResult =
  | "진입 관찰 가능"
  | "대기·확인 필요"
  | "추격 주의"
  | "리스크 관리 필요";

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function average(values: number[]) {
  const finite = values.filter((value) => Number.isFinite(value));
  if (finite.length === 0) return 0;
  return finite.reduce((sum, value) => sum + value, 0) / finite.length;
}

function maxFinite(values: number[], fallback: number) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length > 0 ? Math.max(...finite) : fallback;
}

function minFinite(values: number[], fallback: number) {
  const finite = values.filter((value) => Number.isFinite(value));
  return finite.length > 0 ? Math.min(...finite) : fallback;
}

function toJudgement(score: number): JudgementResult {
  if (score >= 70) return "진입 관찰 가능";
  if (score >= 50) return "대기·확인 필요";
  if (score >= 35) return "추격 주의";
  return "리스크 관리 필요";
}

function scoreBarClass(score: number) {
  if (score >= 70) return "bg-emerald-500";
  if (score >= 50) return "bg-blue-500";
  if (score >= 35) return "bg-amber-500";
  return "bg-red-500";
}

function judgementClass(result: JudgementResult) {
  if (result === "진입 관찰 가능") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (result === "대기·확인 필요") {
    return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200";
  }
  if (result === "추격 주의") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  }
  return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
}

export function AiTradingJudgementCard({
  stock,
  series
}: {
  stock: Stock;
  series: TechnicalPoint[];
}) {
  const safeSeries = Array.isArray(series) ? series : [];

  if (safeSeries.length < 20) {
    return (
      <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <EmptyState
          compact
          title="AI 매매 판단 근거 없음"
          description="일별 종가 K선 데이터가 부족해 판단 근거를 계산할 수 없습니다."
        />
      </section>
    );
  }

  const latest = safeSeries[safeSeries.length - 1];
  const previous = safeSeries[safeSeries.length - 2] ?? latest;
  const recent20 = safeSeries.slice(-20);
  const recent5 = safeSeries.slice(-5);
  const recent5Safe = Array.isArray(recent5) ? recent5 : [];
  const recent20Safe = Array.isArray(recent20) ? recent20 : [];

  const latestClose = safeNumber(latest?.close, safeNumber(stock.price));
  const ma5 = safeNumber(latest?.ma5, safeNumber(stock.ma5));
  const ma20 = safeNumber(latest?.ma20, safeNumber(stock.ma20));
  const ma60 = safeNumber(latest?.ma60, safeNumber(stock.ma60));
  const rsi = safeNumber(latest?.rsi, safeNumber(stock.rsi, 50));
  const macdDiff = safeNumber(safeNumber(latest?.macd) - safeNumber(latest?.macdSignal));
  const prevMacdDiff = safeNumber(
    safeNumber(previous?.macd) - safeNumber(previous?.macdSignal)
  );
  const macdSlope = macdDiff - prevMacdDiff;

  const high20 = maxFinite(recent20Safe.map((item) => safeNumber(item.close)), latestClose);
  const low20 = minFinite(recent20Safe.map((item) => safeNumber(item.close)), latestClose);

  const volumeAvg20 = average(recent20Safe.map((item) => safeNumber(item.volume)));
  const latestVolume = safeNumber(latest?.volume, safeNumber(stock.volume));
  const volumeChange =
    volumeAvg20 > 0
      ? ((latestVolume - volumeAvg20) / volumeAvg20) * 100
      : safeNumber(stock.volumeChange);

  const first5Close = safeNumber(recent5Safe[0]?.close, latestClose);
  const recent5Change =
    recent5Safe.length >= 2 && first5Close > 0
      ? ((latestClose - first5Close) / first5Close) * 100
      : safeNumber(stock.recentChangeRate);

  const priceVsMa20 = ma20 > 0 ? ((latestClose - ma20) / ma20) * 100 : 0;
  const nearHighGap = high20 > 0 ? ((high20 - latestClose) / high20) * 100 : 0;
  const nearLowGap = low20 > 0 ? ((latestClose - low20) / low20) * 100 : 0;

  let score = 50;
  if (latestClose >= ma20) score += 12;
  else score -= 12;
  if (ma5 >= ma20) score += 8;
  else score -= 8;
  if (ma20 >= ma60) score += 6;
  else score -= 6;
  if (rsi >= 45 && rsi <= 68) score += 8;
  if (rsi > 75) score -= 15;
  if (rsi < 30) score += 3;
  if (macdDiff >= 0) score += 8;
  else score -= 10;
  if (macdSlope >= 0) score += 4;
  else score -= 4;
  if (Math.abs(priceVsMa20) > 10) score -= 12;
  if (recent5Change > 8) score -= 10;
  if (volumeChange > 20 && recent5Change > 0) score += 4;
  if (recent5Change < -7) score -= 10;

  const finalScore = clamp(Math.round(score), 0, 100);
  const result = toJudgement(finalScore);

  const whyReasons: string[] = [];
  if (latestClose >= ma20) whyReasons.push("최근 종가가 MA20 위에 있어 추세 관찰 근거가 있습니다.");
  else whyReasons.push("최근 종가가 MA20 아래라 추세 재평가가 필요합니다.");
  if (rsi > 70) whyReasons.push(`RSI ${rsi.toFixed(1)}로 과열 구간에 가까워 신중 관찰이 필요합니다.`);
  else if (rsi < 35) whyReasons.push(`RSI ${rsi.toFixed(1)}로 변동성이 커 확인 필요 구간입니다.`);
  else whyReasons.push(`RSI ${rsi.toFixed(1)}로 과열/침체 중간 구간에서 방향 확인이 가능합니다.`);
  if (macdDiff >= 0) whyReasons.push("MACD가 신호선 위에 있어 단기 동력은 유지 중입니다.");
  else whyReasons.push("MACD가 신호선 아래라 하락 동력 재확인이 필요합니다.");

  const entryReasons: string[] = [];
  if (latestClose >= ma20) entryReasons.push("종가가 MA20 위를 유지해 관찰 기반이 있습니다.");
  if (ma5 >= ma20) entryReasons.push("MA5가 MA20 위에 있어 단기 흐름이 상대적으로 안정적입니다.");
  if (rsi >= 45 && rsi <= 68) entryReasons.push("RSI가 중립 구간이라 과열 부담이 과도하지 않습니다.");
  if (macdDiff >= 0 && macdSlope >= 0) entryReasons.push("MACD 동력이 완만히 개선되어 확인 필요 조건이 충족됩니다.");
  if (volumeChange > 0) {
    entryReasons.push(`거래량이 20일 평균 대비 ${formatPercent(volumeChange)}로 관찰 강도가 높습니다.`);
  }
  if (!Array.isArray(entryReasons) || entryReasons.length === 0) {
    entryReasons.push("현재는 뚜렷한 진입 관찰 근거가 제한적이어서 추가 확인이 필요합니다.");
  }

  const cautionReasons: string[] = [];
  if (rsi > 70) cautionReasons.push("RSI 과열 구간 진입으로 추격 위험이 커질 수 있습니다.");
  if (recent5Change > 7) cautionReasons.push(`최근 5거래일 상승률 ${formatPercent(recent5Change)}로 변동성 확대 구간입니다.`);
  if (Math.abs(priceVsMa20) > 8) cautionReasons.push(`종가와 MA20 괴리율 ${formatPercent(priceVsMa20)}로 재평가가 필요합니다.`);
  if (latestClose >= high20 * 0.98) cautionReasons.push("20일 고점 부근으로 돌파 실패 시 되돌림 관찰이 필요합니다.");
  if (volumeChange < -20) cautionReasons.push("거래량 둔화로 추세 신뢰도 재확인이 필요합니다.");
  if (!Array.isArray(cautionReasons) || cautionReasons.length === 0) {
    cautionReasons.push("현재 신중 요인은 제한적이지만 변동성 재확인은 계속 필요합니다.");
  }

  const riskReasons: string[] = [];
  if (latestClose < ma20 && ma5 < ma20) riskReasons.push("종가와 MA5가 MA20 아래에 있어 리스크 관리 우선 구간입니다.");
  if (macdDiff < 0 && macdSlope < 0) riskReasons.push("MACD 약세 동력이 이어져 하방 리스크 관리가 필요합니다.");
  if (recent5Change < -6) riskReasons.push(`최근 5거래일 ${formatPercent(recent5Change)} 하락으로 변동성 재평가가 필요합니다.`);
  if (nearLowGap < 2) riskReasons.push("20일 저점 인접 구간으로 지지 이탈 여부를 관찰해야 합니다.");
  if (!Array.isArray(riskReasons) || riskReasons.length === 0) {
    riskReasons.push("현재는 강한 리스크 관리 신호가 제한적이지만 조건 변화 시 즉시 재평가가 필요합니다.");
  }

  const nextChecks: string[] = [
    `MA20 (${formatKRW(ma20)}) 위/아래 종가 유지 여부를 확인 필요 조건으로 관찰합니다.`,
    `RSI (${rsi.toFixed(1)})가 45~68 범위로 회귀하는지 재평가합니다.`,
    `MACD 격차 (${macdDiff.toFixed(2)})가 개선되는지 확인 필요 항목으로 봅니다.`,
    `20일 고점/저점 (${formatKRW(high20)} / ${formatKRW(low20)}) 이탈 여부를 관찰합니다.`,
    `최근 5거래일 변화 (${formatPercent(recent5Change)})와 거래량 변화 (${formatPercent(volumeChange)})를 함께 참고 정보로 확인합니다.`
  ];

  const summary =
    result === "진입 관찰 가능"
      ? "추세와 동력이 상대적으로 안정적이어서 관찰 기반 진입 검토는 가능하지만, 조건 훼손 시 즉시 재평가가 필요합니다."
      : result === "대기·확인 필요"
        ? "일부 지표가 혼재되어 있어 서두르기보다 확인 필요 조건이 충족되는지 기다리는 구간입니다."
        : result === "추격 주의"
          ? "단기 변동성 대비 추세 신뢰가 약해 추격보다 신중 관찰과 재평가가 우선입니다."
          : "하방 또는 과열 리스크가 커 리스크 관리 중심의 관찰 전략이 필요한 구간입니다.";

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            AI 매매 판단 근거
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
            AI 매매 판단 근거
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            data.go.kr 일별 종가 기준 참고 정보
          </p>
        </div>
        <Compass className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400">AI 판단 점수</p>
            <p className="mt-1 text-3xl font-bold text-ink dark:text-white">
              {finalScore}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-400">판단 결과</p>
            <span
              className={`mt-1 inline-flex rounded-md border px-3 py-1.5 text-xs font-bold ${judgementClass(
                result
              )}`}
            >
              {result}
            </span>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${scoreBarClass(finalScore)}`}
            style={{ width: `${finalScore}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
        <p>
          <span className="font-bold text-slate-800 dark:text-white">왜 이런 판단인가? </span>
          {summary}
        </p>

        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            진입을 고려할 수 있는 이유
          </p>
          <div className="mt-1 text-sm">
            {(Array.isArray(entryReasons) ? entryReasons : []).map((reason, index) => (
              <p key={`entry-${index}`}>- {reason}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            신중해야 하는 이유
          </p>
          <div className="mt-1 text-sm">
            {(Array.isArray(cautionReasons) ? cautionReasons : []).map((reason, index) => (
              <p key={`caution-${index}`}>- {reason}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            청산 / 리스크 관리 관찰 이유
          </p>
          <div className="mt-1 text-sm">
            {(Array.isArray(riskReasons) ? riskReasons : []).map((reason, index) => (
              <p key={`risk-${index}`}>- {reason}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            다음 확인 조건
          </p>
          <div className="mt-1 text-sm">
            {(Array.isArray(nextChecks) ? nextChecks : []).map((condition, index) => (
              <p key={`check-${index}`}>- {condition}</p>
            ))}
          </div>
        </div>

        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            면책 문구
          </p>
          <p className="mt-1 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <ShieldAlert className="mr-1 inline h-4 w-4" />
            본 판단은 관찰·확인 필요·신중·리스크 관리 관점의 참고 정보이며, 투자 실행 판단은 사용자 책임입니다. 조건 변화 시 재평가가 필요합니다.
          </p>
        </div>
      </div>
    </section>
  );
}
