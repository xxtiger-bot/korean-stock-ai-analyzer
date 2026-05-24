"use client";

import { AlertTriangle } from "lucide-react";
import { DataAsOfNote } from "@/components/data-as-of-note";
import { formatKRW, formatPercent } from "@/lib/format";
import { DISCLAIMER } from "@/lib/insights";
import type {
  Candle,
  ForeignOwnershipData,
  PriceGuard,
  RealtimeQuote,
  Stock,
  TechnicalPoint
} from "@/lib/types";

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function average(values: number[]) {
  const safeValues = Array.isArray(values)
    ? values.filter((value) => Number.isFinite(value))
    : [];
  if (safeValues.length === 0) return 0;
  return safeValues.reduce((sum, value) => sum + value, 0) / safeValues.length;
}

function percentChange(current: number, base: number) {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return 0;
  return ((current - base) / base) * 100;
}

function rangeText(start: number, end: number) {
  return `${formatKRW(start)} ~ ${formatKRW(end)}`;
}

function candlePatternText(recent5: TechnicalPoint[]) {
  const safeRecent = Array.isArray(recent5) ? recent5 : [];
  if (safeRecent.length < 5) return "최근 캔들 패턴을 해석하기 위한 데이터가 부족합니다.";

  const upCandles = safeRecent.filter((item) => safeNumber(item.close) >= safeNumber(item.open)).length;
  const downCandles = safeRecent.length - upCandles;
  const latest = safeRecent[safeRecent.length - 1];
  const first = safeRecent[0];
  const recentChange = percentChange(safeNumber(latest?.close), safeNumber(first?.close));

  if (upCandles >= 4 && recentChange > 0) {
    return "최근 5개 캔들에서 양봉 비중이 높아 단기 매수 우위 흐름이 관찰됩니다.";
  }
  if (downCandles >= 4 && recentChange < 0) {
    return "최근 5개 캔들에서 음봉 비중이 높아 단기 조정 압력이 관찰됩니다.";
  }

  return "최근 5개 캔들에서 방향성이 교차하며 추세 재확인이 필요한 구간입니다.";
}

export function CandlestickAiExpertCard({
  stock,
  candles,
  technicalSeries,
  realtimeQuote,
  foreignOwnership,
  priceGuard
}: {
  stock: Stock;
  candles: Candle[];
  technicalSeries: TechnicalPoint[];
  realtimeQuote?: RealtimeQuote | null;
  foreignOwnership?: ForeignOwnershipData | null;
  priceGuard?: PriceGuard | null;
}) {
  const safeCandles = Array.isArray(candles) ? candles : [];
  const safeSeries = Array.isArray(technicalSeries) ? technicalSeries : [];

  if (safeCandles.length < 20 || safeSeries.length < 20) {
    return (
      <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h3 className="text-base font-bold text-ink dark:text-white">AI 캔들차트 분석 전문가</h3>
        <div className="mt-3 rounded-lg border border-dashed border-line bg-slate-50 p-4 text-center dark:border-dark-line dark:bg-slate-900/50">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-white text-slate-400 dark:bg-dark-panel dark:text-slate-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-bold text-ink dark:text-white">
            K선 데이터가 부족하여 캔들차트 분석을 생성할 수 없습니다.
          </p>
        </div>
      </section>
    );
  }

  const latest = safeSeries[safeSeries.length - 1];
  const previous = safeSeries[safeSeries.length - 2];
  const recent20 = safeSeries.slice(-20);
  const recent5 = safeSeries.slice(-5);

  const hasRealtimePrice = Boolean(
    realtimeQuote && Number.isFinite(realtimeQuote.price) && realtimeQuote.price > 0
  );
  const hasPriceAnomaly =
    priceGuard?.status === "warning" || priceGuard?.status === "critical";
  const currentPrice = hasRealtimePrice ? safeNumber(realtimeQuote?.price) : safeNumber(latest?.close, safeNumber(stock.price));
  const recentClose = safeNumber(latest?.close, safeNumber(stock.price));
  const chartBaseDate = typeof latest?.date === "string" && latest.date ? latest.date : stock.date ?? "확인 필요";
  const ma5 = safeNumber(latest?.ma5, safeNumber(stock.ma5, recentClose));
  const ma20 = safeNumber(latest?.ma20, safeNumber(stock.ma20, recentClose));
  const ma60 = safeNumber(latest?.ma60, safeNumber(stock.ma60, ma20 || recentClose));
  const rsi = safeNumber(latest?.rsi, safeNumber(stock.rsi, 50));
  const macdHistogram = safeNumber(latest?.macdHistogram);
  const previousMacdHistogram = safeNumber(previous?.macdHistogram);

  const high20 = Math.max(...recent20.map((item) => safeNumber(item.high, recentClose)));
  const low20 = Math.min(...recent20.map((item) => safeNumber(item.low, recentClose)));
  const volumeNow = safeNumber(latest?.volume, safeNumber(stock.volume));
  const volumeAvg20 = average(recent20.slice(0, -1).map((item) => safeNumber(item.volume)));
  const volumeChange = volumeAvg20 > 0 ? percentChange(volumeNow, volumeAvg20) : 0;
  const ma20Gap = ma20 > 0 ? percentChange(currentPrice, ma20) : 0;
  const recent5Change = percentChange(safeNumber(recent5[recent5.length - 1]?.close), safeNumber(recent5[0]?.close));

  const isBullAlign = ma5 > ma20 && ma20 >= ma60;
  const isBearAlign = ma5 < ma20 && ma20 <= ma60;
  const isAboveMa20 = currentPrice >= ma20;
  const isNearHigh = currentPrice >= high20 * 0.97;
  const isOverheated = rsi >= 70 || ma20Gap >= 8;
  const isChasingRisk = recent5Change >= 6 && isNearHigh;

  const trendStructure = isBullAlign
    ? "MA5 > MA20 > MA60 정배열 흐름으로 추세 우위가 관찰됩니다."
    : isBearAlign
      ? "MA5 < MA20 < MA60 역배열 흐름으로 보수적 관찰이 필요합니다."
      : "이동평균선 배열이 혼재되어 방향성 재확인이 필요합니다.";

  const volumeInterpretation =
    volumeChange >= 20
      ? `최근 거래량이 20일 평균 대비 ${formatPercent(volumeChange)} 확대되어 변동성 동반 구간입니다.`
      : volumeChange <= -20
        ? `최근 거래량이 20일 평균 대비 ${formatPercent(volumeChange)} 둔화되어 추세 탄력 재확인이 필요합니다.`
        : "거래량은 평균권으로 방향 확인 신호를 추가 관찰할 구간입니다.";

  const goodSignals: string[] = [];
  if (isAboveMa20) goodSignals.push("현재가가 MA20 위에 있어 단기 지지 확인이 가능합니다.");
  if (isBullAlign) goodSignals.push("이동평균선 정배열로 추세 유지 가능성을 관찰할 수 있습니다.");
  if (rsi >= 45 && rsi <= 65) goodSignals.push(`RSI ${rsi.toFixed(1)}로 과열 부담이 과도하지 않은 구간입니다.`);
  if (macdHistogram >= 0 && macdHistogram >= previousMacdHistogram) {
    goodSignals.push("MACD 동력이 유지되어 추세 연속성을 확인할 수 있습니다.");
  }
  if (goodSignals.length === 0) {
    goodSignals.push("뚜렷한 강세 신호는 제한적이며 추세 재확인이 필요합니다.");
  }

  const cautionSignals: string[] = [];
  if (!isAboveMa20) cautionSignals.push("현재가가 MA20 아래에 있어 추세 약화 가능성을 신중하게 관찰해야 합니다.");
  if (isOverheated) cautionSignals.push("RSI 또는 MA20 이격이 높아 과열 구간 진입 여부를 확인할 필요가 있습니다.");
  if (isChasingRisk) cautionSignals.push("최근 단기 상승폭이 커 추격 관찰 리스크 관리가 필요합니다.");
  if (macdHistogram < 0 && macdHistogram < previousMacdHistogram) {
    cautionSignals.push("MACD 동력이 약화되어 단기 반등 실패 가능성을 확인해야 합니다.");
  }
  if (cautionSignals.length === 0) {
    cautionSignals.push("현재 과열·추격 위험은 제한적이지만 변동성 확대 여부를 계속 관찰해야 합니다.");
  }
  if (hasPriceAnomaly) {
    cautionSignals.push("현재가 데이터 차이가 커서 보수적으로 해석해야 합니다.");
  }

  const nextChecks = [
    `다음 종가가 MA20(${formatKRW(ma20)}) 위에서 유지되는지 확인 필요`,
    `RSI ${rsi.toFixed(1)} 흐름이 50 부근에서 안정되는지 관찰`,
    `MACD 히스토그램(${macdHistogram.toFixed(2)}) 방향이 이어지는지 재평가`,
    `20일 고점 ${formatKRW(high20)} / 저점 ${formatKRW(low20)} 반응과 거래량 변화를 참고 정보로 확인`
  ];

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <h3 className="text-base font-bold text-ink dark:text-white">AI 캔들차트 분석 전문가</h3>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        KIS 현재가와 data.go.kr 일별 종가 데이터를 함께 참고한 캔들차트 해석입니다.
      </p>
      <DataAsOfNote
        className="mt-3"
        stockDate={chartBaseDate}
        realtimeQuote={realtimeQuote}
        foreignOwnership={foreignOwnership}
      />
      <div className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
        <p>
          현재가: {formatKRW(currentPrice)} ·{" "}
          {hasRealtimePrice ? "KIS 기준" : "현재가 대신 data.go.kr 최근 종가를 기준으로 표시합니다."}
        </p>
        <p>최근 종가: {formatKRW(recentClose)} · data.go.kr 일별 종가 기준</p>
        <p>차트 기준일: {chartBaseDate}</p>
        {hasPriceAnomaly ? (
          <p className="text-amber-700 dark:text-amber-200">
            현재가 데이터 차이가 커서 보수적으로 해석해야 합니다.
          </p>
        ) : null}
      </div>

      <div className="mt-4 grid gap-4">
        <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60">
          <h4 className="text-sm font-bold text-ink dark:text-white">현재 차트 상태 요약</h4>
          <ul className="mt-2 space-y-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            <li>추세 구조: {trendStructure}</li>
            <li>캔들 패턴: {candlePatternText(recent5)}</li>
            <li>거래량 해석: {volumeInterpretation}</li>
            <li>
              지지 / 저항 구간: {rangeText(low20, ma20)} / {rangeText(ma20, high20)}
            </li>
            <li>
              과열 / 추격 위험:{" "}
              {isOverheated || isChasingRisk
                ? "과열 또는 추격 신호가 있어 신중한 리스크 관리가 필요합니다."
                : "과열 및 추격 신호는 제한적이며 추세 지속 여부를 관찰할 구간입니다."}
            </li>
            <li>
              참고 정보: 현재가 {formatKRW(currentPrice)} · 최근 종가 {formatKRW(recentClose)} ·
              MA5/20/60 {formatKRW(ma5)} / {formatKRW(ma20)} / {formatKRW(ma60)}
            </li>
          </ul>
        </article>

        <article>
          <h4 className="text-sm font-bold text-ink dark:text-white">좋은 신호</h4>
          <ul className="mt-2 grid gap-2">
            {(Array.isArray(goodSignals) ? goodSignals : []).map((signal, index) => (
              <li
                key={`good-${index}-${signal}`}
                className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
              >
                {signal}
              </li>
            ))}
          </ul>
        </article>

        <article>
          <h4 className="text-sm font-bold text-ink dark:text-white">주의 신호</h4>
          <ul className="mt-2 grid gap-2">
            {(Array.isArray(cautionSignals) ? cautionSignals : []).map((signal, index) => (
              <li
                key={`caution-${index}-${signal}`}
                className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
              >
                {signal}
              </li>
            ))}
          </ul>
        </article>

        <div className="grid gap-3 sm:grid-cols-2">
          <article className="rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
            <h4 className="text-sm font-bold text-ink dark:text-white">지지 구간</h4>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              20일 저점과 MA20 기준으로 {rangeText(low20, ma20)} 구간을 참고 관찰합니다.
            </p>
          </article>
          <article className="rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
            <h4 className="text-sm font-bold text-ink dark:text-white">저항 구간</h4>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              20일 고점 기준 {rangeText(ma20, high20)} 구간에서 저항 반응 확인이 필요합니다.
            </p>
          </article>
        </div>

        <article>
          <h4 className="text-sm font-bold text-ink dark:text-white">다음 확인 조건</h4>
          <ul className="mt-2 grid gap-2">
            {(Array.isArray(nextChecks) ? nextChecks : []).map((point, index) => (
              <li
                key={`check-${index}-${point}`}
                className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
              >
                {point}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
          <h4 className="font-bold">면책 문구</h4>
          <p className="mt-1">{DISCLAIMER}</p>
        </article>
      </div>
    </section>
  );
}
