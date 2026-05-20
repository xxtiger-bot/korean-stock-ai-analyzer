"use client";

import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, Gauge, Wallet } from "lucide-react";
import { useMemo } from "react";
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
import { EmptyState } from "@/components/ui-states";
import { WatchlistButton } from "@/components/watchlist-button";
import {
  resolveStockDisplayPrice,
  type ResolvedStockDisplayPrice
} from "@/lib/market/price-resolver";
import {
  changeBgClass,
  formatCompactKRW,
  formatKRW,
  formatNumber,
  formatPercent
} from "@/lib/format";
import { buildTechnicalSeries } from "@/lib/indicators";
import type { Candle, RealtimeQuote, Stock } from "@/lib/types";

export function StockDetailClient({
  stock,
  candles,
  realtimeQuote,
  resolvedPrice: resolvedPriceFromPage
}: {
  stock: Stock;
  candles: Candle[];
  realtimeQuote?: RealtimeQuote | null;
  resolvedPrice?: ResolvedStockDisplayPrice;
}) {
  const safeCandles = useMemo(() => (Array.isArray(candles) ? candles : []), [candles]);
  const technicalSeries = useMemo(() => buildTechnicalSeries(safeCandles), [safeCandles]);
  const latest = technicalSeries[technicalSeries.length - 1];
  const previous = technicalSeries[technicalSeries.length - 2];
  const dayRange = latest ? `${formatKRW(latest.low)} - ${formatKRW(latest.high)}` : "-";
  const tags = Array.isArray(stock.tags) ? stock.tags : [];
  const hasDataGoKr = tags.some((tag) => tag.toLowerCase() === "data.go.kr");
  const hasSuspiciousDailyClose = tags.some(
    (tag) => tag.toLowerCase() === "data.go.kr:suspicious-close"
  );
  const hasKisRealtime = realtimeQuote?.source === "kis";

  const resolvedPrice = useMemo<ResolvedStockDisplayPrice>(
    () =>
      resolvedPriceFromPage ??
      resolveStockDisplayPrice({
        symbol: stock.symbol,
        kisQuote:
          hasKisRealtime && realtimeQuote
            ? {
                price: realtimeQuote.price,
                change: realtimeQuote.change,
                changeRate: realtimeQuote.changeRate,
                volume: realtimeQuote.volume,
                asOf: realtimeQuote.asOf,
                updatedAt: realtimeQuote.asOf
              }
            : null,
        kisQuoteSource: hasKisRealtime ? "KIS" : "none",
        dailyClose: hasDataGoKr
          ? {
              price: stock.price,
              baseDate: stock.date,
              updatedAt: stock.date
            }
          : null,
        dailyCloseSource: hasDataGoKr ? "data.go.kr" : "none",
        cachedPrice: Number.isFinite(stock.price) && stock.price > 0 ? stock.price : null,
        cachedPriceSource: Number.isFinite(stock.price) && stock.price > 0 ? "cache" : "none",
        dailyCloseSuspicious: hasSuspiciousDailyClose,
        market: stock.market
      }),
    [
      hasDataGoKr,
      hasKisRealtime,
      hasSuspiciousDailyClose,
      realtimeQuote,
      resolvedPriceFromPage,
      stock.date,
      stock.market,
      stock.price,
      stock.symbol
    ]
  );

  const headlinePrice = resolvedPrice.displayPrice;
  const headlineChange =
    resolvedPrice.priceKind === "kis_current"
      ? realtimeQuote && Number.isFinite(realtimeQuote.change)
        ? realtimeQuote.change
        : null
      : resolvedPrice.priceKind === "recent_close" && Number.isFinite(stock.change)
        ? stock.change
        : null;
  const headlineChangeRate =
    resolvedPrice.priceKind === "kis_current"
      ? realtimeQuote && Number.isFinite(realtimeQuote.changeRate)
        ? realtimeQuote.changeRate
        : null
      : resolvedPrice.priceKind === "recent_close" && Number.isFinite(stock.changeRate)
        ? stock.changeRate
        : null;
  const headlineLabel = resolvedPrice.labelKo;
  const headlineSource = resolvedPrice.basisKo;
  const tone =
    typeof headlineChange === "number"
      ? headlineChange > 0
        ? "up"
        : headlineChange < 0
          ? "down"
          : "neutral"
      : "neutral";
  const statusBadgeLabel =
    resolvedPrice.priceKind === "kis_current"
      ? "현재가: KIS"
      : resolvedPrice.priceKind === "recent_close"
        ? "현재가 확인 불가"
        : "가격 데이터 확인 필요";
  const sourceBadgeLabel =
    resolvedPrice.priceKind === "kis_current"
      ? "KIS 기준"
      : resolvedPrice.priceKind === "recent_close"
        ? "최근 종가: data.go.kr"
        : "비정상 가격 감지";
  const detailTags = tags.filter(
    (tag) =>
      tag.toLowerCase() !== "data.go.kr" &&
      tag.toLowerCase() !== "data.go.kr:suspicious-close" &&
      tag !== stock.market
  );
  const visibleTags = [
    ...(stock.sector && stock.sector !== "미분류" ? [stock.sector] : []),
    ...detailTags
  ];
  const secondaryName =
    stock.name && stock.name !== stock.koreanName ? stock.name : undefined;
  const dataDate = stock.date ?? latest?.date;
  const dataDateLabel = dataDate ? `${dataDate} 기준` : "일별 종가 기준";
  const hasPrice = Number.isFinite(headlinePrice ?? NaN) && (headlinePrice ?? 0) > 0;
  const headlineChangeLabel =
    headlineChange === null || headlineChangeRate === null
      ? null
      : `${headlineChange > 0 ? "+" : ""}${formatKRW(headlineChange)} · ${formatPercent(
          headlineChangeRate
        )}`;
  const priceNote =
    resolvedPrice.priceKind === "kis_current"
      ? `업데이트 ${resolvedPrice.updatedAt ?? "확인 필요"}`
      : resolvedPrice.priceKind === "recent_close"
        ? `기준일 ${resolvedPrice.baseDate ?? dataDate ?? "확인 필요"}`
        : resolvedPrice.warningKo ?? "가격 데이터를 일시적으로 불러올 수 없습니다.";
  const isAbnormalPrice = resolvedPrice.basisKo === "비정상 가격 감지";
  const suppressPriceDerivedViews =
    resolvedPrice.priceKind === "unavailable" && isAbnormalPrice;
  const dayRangeValue = suppressPriceDerivedViews ? "데이터 확인 필요" : dayRange;
  const dayRangeSubValue = suppressPriceDerivedViews ? "비정상 가격 감지" : undefined;
  const dataGuideText =
    resolvedPrice.priceKind === "kis_current"
      ? "KIS 현재가를 기준으로 표시합니다."
      : resolvedPrice.priceKind === "recent_close"
        ? "data.go.kr 데이터는 일별 종가 기준이며 실시간 시세가 아닙니다."
        : isAbnormalPrice
          ? "가격 데이터가 비정상 범위를 벗어나 현재 표시에서 제외되었습니다."
          : "가격 데이터를 일시적으로 불러올 수 없습니다.";
  const displayPriceText =
    hasPrice && headlinePrice !== null
      ? formatKRW(headlinePrice)
      : resolvedPrice.priceKind === "unavailable"
        ? "가격 데이터 확인 필요"
        : "가격 데이터 없음";

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
              {[
                ["시장", stock.market],
                ["코드", stock.symbol],
                ["상태", statusBadgeLabel],
                ["출처", sourceBadgeLabel],
                ["기준일", dataDateLabel]
              ].map(([label, value]) => (
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
              {dataGuideText}
            </p>
            {process.env.NODE_ENV === "development" && (
              <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-400 dark:text-slate-500">
                resolvedPrice.priceKind: {resolvedPrice.priceKind} · resolvedPrice.basisKo:{" "}
                {resolvedPrice.basisKo}
              </p>
            )}
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
              {displayPriceText}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {headlineSource}
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400 dark:text-slate-500">
              {priceNote}
            </p>
            {resolvedPrice.priceKind !== "kis_current" && (
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                {resolvedPrice.priceKind === "recent_close"
                  ? "현재가 확인이 어려워 최근 종가를 참고합니다."
                  : isAbnormalPrice
                    ? resolvedPrice.warningKo ??
                      "가격 데이터가 비정상 범위를 벗어나 현재 표시에서 제외되었습니다."
                    : "가격 데이터를 일시적으로 불러올 수 없습니다."}
              </p>
            )}
            {headlineChangeLabel ? (
              <div
                className={`mt-3 inline-flex max-w-full flex-wrap rounded-md border px-3 py-2 text-sm font-bold ${changeBgClass(
                  headlineChange ?? 0
                )}`}
              >
                {headlineChangeLabel}
              </div>
            ) : (
              <div className="mt-3 inline-flex max-w-full flex-wrap rounded-md border border-dashed border-line bg-slate-50 px-3 py-2 text-sm font-bold text-slate-400 dark:border-dark-line dark:bg-slate-900/60">
                가격 변동 데이터 확인 필요
              </div>
            )}
            {resolvedPrice.warningKo && (
              <p className="mt-2 text-xs font-semibold leading-5 text-amber-600 dark:text-amber-300">
                {resolvedPrice.warningKo}
              </p>
            )}
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
        <MetricCard
          label="일중 범위"
          value={dayRangeValue}
          subValue={dayRangeSubValue}
          icon={Activity}
          tone={suppressPriceDerivedViews ? "neutral" : tone}
        />
        <MetricCard
          label="PER / EPS"
          value={`${Number.isFinite(stock.pe) ? stock.pe.toFixed(1) : "0.0"}x`}
          subValue={formatKRW(stock.eps)}
          icon={Gauge}
        />
      </section>

      <div className="mt-5 grid min-w-0 max-w-full gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(280px,0.85fr)] 2xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.8fr)]">
        <div className="min-w-0 max-w-full xl:col-start-1">
          {suppressPriceDerivedViews ? (
            <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
              <EmptyState
                compact
                title="차트 데이터 확인 필요"
                description="비정상 가격 감지로 차트 표시를 일시 중단했습니다."
              />
            </section>
          ) : (
            <CandlestickChart series={technicalSeries} />
          )}
        </div>
        <div className="grid min-w-0 max-w-full content-start gap-5 xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <AiReportCard stock={stock} resolvedPrice={resolvedPrice} />
          <PotentialScoreCard stock={stock} />
          <DangerWarningCard stock={stock} />
          <EntryRiskScoreCard stock={stock} />
          {suppressPriceDerivedViews ? (
            <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
              <EmptyState
                compact
                title="핵심 지표 확인 필요"
                description="비정상 가격 감지로 가격 기반 지표 표시를 일시 중단했습니다."
              />
            </section>
          ) : latest && previous ? (
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
          {suppressPriceDerivedViews ? (
            <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
              <EmptyState
                compact
                title="지표 해석 확인 필요"
                description="비정상 가격 감지로 지표 해석 표시를 일시 중단했습니다."
              />
            </section>
          ) : latest ? (
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
          {suppressPriceDerivedViews ? (
            <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
              <EmptyState
                compact
                title="기술 지표 확인 필요"
                description="비정상 가격 감지로 MA5, MA20, MA60 및 보조 지표 표시를 일시 중단했습니다."
              />
            </section>
          ) : (
            <IndicatorSummary series={technicalSeries} />
          )}
        </div>
      </div>
    </main>
  );
}
