"use client";

import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, Gauge, Wallet } from "lucide-react";
import { AiReportCard } from "@/components/ai-report-card";
import { CandlestickChart } from "@/components/candlestick-chart";
import { DangerWarningCard } from "@/components/danger-warning-card";
import { EntryRiskScoreCard } from "@/components/entry-risk-score-card";
import { IndicatorSummary } from "@/components/indicator-summary";
import { IndicatorTranslator } from "@/components/indicator-translator";
import { KeyIndicatorsPanel } from "@/components/key-indicators-panel";
import { MetricCard } from "@/components/metric-card";
import { PotentialScoreCard } from "@/components/potential-score-card";
import { TradingPlanHelper } from "@/components/trading-plan-helper";
import { WatchlistButton } from "@/components/watchlist-button";
import { EmptyState } from "@/components/ui-states";
import { buildTechnicalSeries } from "@/lib/indicators";
import {
  changeBgClass,
  formatCompactKRW,
  formatKRW,
  formatNumber,
  formatPercent
} from "@/lib/format";
import type { Candle, RealtimeQuote, Stock } from "@/lib/types";
import { useMemo } from "react";

export function StockDetailClient({
  stock,
  candles,
  realtimeQuote
}: {
  stock: Stock;
  candles: Candle[];
  realtimeQuote?: RealtimeQuote | null;
}) {
  const safeCandles = useMemo(() => (Array.isArray(candles) ? candles : []), [candles]);
  const technicalSeries = useMemo(() => buildTechnicalSeries(safeCandles), [safeCandles]);
  const latest = technicalSeries[technicalSeries.length - 1];
  const previous = technicalSeries[technicalSeries.length - 2];
  const dayRange = latest ? `${formatKRW(latest.low)} - ${formatKRW(latest.high)}` : "-";
  const hasRealtimeQuote = Boolean(
    realtimeQuote && Number.isFinite(realtimeQuote.price) && realtimeQuote.price > 0
  );
  const headlinePrice = hasRealtimeQuote ? realtimeQuote!.price : stock.price;
  const headlineChange =
    hasRealtimeQuote && Number.isFinite(realtimeQuote?.change)
      ? realtimeQuote!.change
      : stock.change;
  const headlineChangeRate =
    hasRealtimeQuote && Number.isFinite(realtimeQuote?.changeRate)
      ? realtimeQuote!.changeRate
      : stock.changeRate;
  const headlineLabel = hasRealtimeQuote ? "현재가" : "최근 종가";
  const headlineSource = hasRealtimeQuote ? "KIS 기준" : "data.go.kr 일별 종가 기준";
  const tone = headlineChange > 0 ? "up" : headlineChange < 0 ? "down" : "neutral";
  const tags = Array.isArray(stock.tags) ? stock.tags : [];
  const dataSource = tags.find((tag) => tag.toLowerCase() === "data.go.kr") ?? "mock";
  const chartSource = dataSource === "mock" ? "mock" : "data.go.kr";
  const detailTags = tags.filter(
    (tag) => tag.toLowerCase() !== "data.go.kr" && tag !== stock.market
  );
  const visibleTags = [
    ...(stock.sector && stock.sector !== "미분류" ? [stock.sector] : []),
    ...detailTags
  ];
  const secondaryName =
    stock.name && stock.name !== stock.koreanName ? stock.name : undefined;
  const dataDate = stock.date ?? latest?.date;
  const dataDateLabel = dataDate ? `${dataDate} 기준` : "일별 종가 기준";
  const sourceMeta = hasRealtimeQuote
    ? ([
        ["시장", stock.market],
        ["코드", stock.symbol],
        ["시세", "KIS"],
        ["차트", chartSource],
        ["기준일", dataDateLabel]
      ] as const)
    : ([
        ["시장", stock.market],
        ["코드", stock.symbol],
        ["데이터", dataSource],
        ["기준일", dataDateLabel]
      ] as const);

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-white px-3 text-sm font-bold text-slate-600 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          홈
        </Link>
        <WatchlistButton symbol={stock.symbol} />
      </div>

      <section className="min-w-0 max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex max-w-full flex-wrap items-center gap-2">
              {sourceMeta.map(([label, value]) => (
                <span
                  key={label}
                  className="inline-flex max-w-full items-center gap-1 rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
                >
                  <span className="text-slate-400">{label}:</span>
                  <span className="break-words text-ink dark:text-white">{value}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              data.go.kr 데이터는 일별 종가 기준이며 실시간 시세가 아닙니다.
            </p>
            <h1 className="mt-4 break-words text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
              {stock.koreanName}
            </h1>
            {secondaryName && (
              <p className="mt-1 break-words text-sm font-semibold text-slate-500 dark:text-slate-400">
                {secondaryName}
              </p>
            )}
          </div>
          <div className="min-w-0 max-w-full text-left lg:text-right">
            <p className="mb-1 text-xs font-bold text-slate-400">{headlineLabel}</p>
            <p className="break-words text-2xl font-bold text-ink dark:text-white sm:text-3xl">
              {formatKRW(headlinePrice)}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {headlineSource}
            </p>
            <div
              className={`mt-3 inline-flex max-w-full flex-wrap rounded-md border px-3 py-2 text-sm font-bold ${changeBgClass(
                headlineChange
              )}`}
            >
              {headlineChange > 0 ? "+" : ""}
              {formatKRW(headlineChange)} · {formatPercent(headlineChangeRate)}
            </div>
          </div>
        </div>
        {visibleTags.length > 0 && (
          <div className="mt-5 flex max-w-full flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="max-w-full break-words rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </section>

      <section className="mt-5 grid min-w-0 max-w-full grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="거래량"
          value={formatNumber(stock.volume)}
          subValue={dataDateLabel}
          icon={BarChart3}
        />
        <MetricCard label="시가총액" value={formatCompactKRW(stock.marketCap)} icon={Wallet} />
        <MetricCard label="일중 범위" value={dayRange} icon={Activity} tone={tone} />
        <MetricCard
          label="PER / EPS"
          value={`${Number.isFinite(stock.pe) ? stock.pe.toFixed(1) : "0.0"}x`}
          subValue={formatKRW(stock.eps)}
          icon={Gauge}
        />
      </section>

      <div className="mt-5 grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] 2xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 max-w-full xl:col-start-1">
          <CandlestickChart series={technicalSeries} />
        </div>
        <div className="grid min-w-0 max-w-full content-start gap-5 xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <AiReportCard stock={stock} />
          <PotentialScoreCard stock={stock} />
          <DangerWarningCard stock={stock} />
          <EntryRiskScoreCard stock={stock} />
          {latest && previous ? (
            <KeyIndicatorsPanel stock={stock} latest={latest} previous={previous} />
          ) : (
            <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
              <EmptyState
                compact
                title="핵심 지표 없음"
                description="기술 지표를 계산할 일별 데이터가 부족합니다."
              />
            </section>
          )}
          <TradingPlanHelper stock={stock} />
        </div>
        <div className="min-w-0 max-w-full xl:col-start-1">
          {latest ? (
            <IndicatorTranslator stock={stock} latest={latest} />
          ) : (
            <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
              <EmptyState
                compact
                title="지표 해석 없음"
                description="해석할 기술 지표 데이터가 없습니다."
              />
            </section>
          )}
        </div>
        <div className="min-w-0 max-w-full xl:col-start-1">
          <IndicatorSummary series={technicalSeries} />
        </div>
      </div>
    </main>
  );
}
