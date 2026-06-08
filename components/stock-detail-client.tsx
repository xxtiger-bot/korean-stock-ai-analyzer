"use client";

import Link from "next/link";
import { Activity, ArrowLeft, BarChart3, Gauge, Wallet } from "lucide-react";
import { AiReportCard } from "@/components/ai-report-card";
import { AiTradingJudgementCard } from "@/components/ai-trading-judgement-card";
import { CandlestickAiExpertCard } from "@/components/candlestick-ai-expert-card";
import { CandlestickChart } from "@/components/candlestick-chart";
import { DangerWarningCard } from "@/components/danger-warning-card";
import { EntryRiskScoreCard } from "@/components/entry-risk-score-card";
import { ForeignOwnershipCard } from "@/components/foreign-ownership-card";
import { IndicatorSummary } from "@/components/indicator-summary";
import { IndicatorTranslator } from "@/components/indicator-translator";
import { KeyIndicatorsPanel } from "@/components/key-indicators-panel";
import { MetricCard } from "@/components/metric-card";
import { MobileTabNav } from "@/components/mobile-tab-nav";
import { PotentialScoreCard } from "@/components/potential-score-card";
import { TradingPlanHelper } from "@/components/trading-plan-helper";
import { WatchlistButton } from "@/components/watchlist-button";
import { EmptyState } from "@/components/ui-states";
import {
  resolveStockDisplayPrice,
  type ResolvedStockDisplayPrice
} from "@/lib/market/price-resolver";
import { buildTechnicalSeries } from "@/lib/indicators";
import {
  changeBgClass,
  formatCompactKRW,
  formatKRW,
  formatNumber,
  formatPercent
} from "@/lib/format";
<<<<<<< HEAD
import type { Candle, ForeignOwnershipData, PriceGuard, RealtimeQuote, Stock } from "@/lib/types";
import { useMemo, useState } from "react";

type MobileDetailTab = "summary" | "chart" | "ai" | "indicators" | "risk";

const cardShellClass =
  "rounded-2xl border border-line/90 bg-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-line dark:bg-dark-panel";
const cardSubtleClass =
  "rounded-xl border border-line/90 bg-slate-50/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-dark-line dark:bg-slate-900/55";
const sectionTitleClass = "text-base font-bold tracking-tight text-ink dark:text-white";

function formatRealtimeUpdatedAt(value: string | undefined) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (!Number.isNaN(parsed.getTime())) {
    return new Intl.DateTimeFormat("sv-SE", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).format(parsed);
  }

  return value;
}
=======
import type { Candle, RealtimeQuote, Stock } from "@/lib/types";
import { useMemo } from "react";
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)

export function StockDetailClient({
  stock,
  candles,
<<<<<<< HEAD
  realtimeQuote,
  foreignOwnership,
  priceGuard
=======
  realtimeQuote
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
}: {
  stock: Stock;
  candles: Candle[];
  realtimeQuote?: RealtimeQuote | null;
<<<<<<< HEAD
  foreignOwnership?: ForeignOwnershipData | null;
  priceGuard?: PriceGuard | null;
=======
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
}) {
  const safeCandles = useMemo(() => (Array.isArray(candles) ? candles : []), [candles]);
  const technicalSeries = useMemo(() => buildTechnicalSeries(safeCandles), [safeCandles]);
  const latest = technicalSeries[technicalSeries.length - 1];
  const previous = technicalSeries[technicalSeries.length - 2];
  const dayRange = latest ? `${formatKRW(latest.low)} - ${formatKRW(latest.high)}` : "-";
<<<<<<< HEAD
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
  const realtimeUpdatedAt = hasRealtimeQuote
    ? formatRealtimeUpdatedAt(realtimeQuote?.asOf)
    : "";
  const headlineSource = hasRealtimeQuote
    ? realtimeUpdatedAt
      ? `KIS 기준 · 업데이트 ${realtimeUpdatedAt}`
      : "KIS 기준"
    : "data.go.kr 일별 종가 기준";
  const tone = headlineChange > 0 ? "up" : headlineChange < 0 ? "down" : "neutral";
=======
  const resolvedPrice = useMemo<ResolvedStockDisplayPrice>(
    () =>
      resolveStockDisplayPrice({
        symbol: stock.symbol,
        kisQuote: realtimeQuote
          ? {
              price: realtimeQuote.price,
              change: realtimeQuote.change,
              changeRate: realtimeQuote.changeRate,
              volume: realtimeQuote.volume,
              asOf: realtimeQuote.asOf,
              updatedAt: realtimeQuote.asOf
            }
          : null,
        dailyClose: {
          price: stock.price,
          baseDate: stock.date,
          updatedAt: stock.date
        },
        cachedPrice: stock.price,
        market: stock.market
      }),
    [realtimeQuote, stock.date, stock.market, stock.price, stock.symbol]
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
  const headlineLabel =
    resolvedPrice.labelKo;
  const headlineSource = resolvedPrice.basisKo;
  const tone =
    typeof headlineChange === "number"
      ? headlineChange > 0
        ? "up"
        : headlineChange < 0
          ? "down"
          : "neutral"
      : "neutral";
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
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
<<<<<<< HEAD
  const hasPriceAnomaly =
    priceGuard?.status === "warning" || priceGuard?.status === "critical";
  const priceAnomalyGapText =
    hasPriceAnomaly && Number.isFinite(priceGuard?.gapRate)
      ? ` (차이 ${Math.round((priceGuard?.gapRate ?? 0) * 100)}%)`
      : "";
  const priceAnomalyTitle =
    priceGuard?.status === "critical" ? "데이터 검증 필요" : "가격 확인 필요";
  const priceAnomalyDescription =
    "KIS 현재가와 data.go.kr 최근 종가의 차이가 커서 확인이 필요합니다.";
  const sourceMeta = hasRealtimeQuote
    ? ([
        ["시장", stock.market],
        ["코드", stock.symbol],
        ["현재가", "KIS"],
        ["최근 종가", chartSource],
        ["기준일", dataDateLabel]
      ] as const)
    : ([
        ["시장", stock.market],
        ["코드", stock.symbol],
        ["최근 종가", dataSource],
        ["기준일", dataDateLabel]
      ] as const);
  const [mobileTab, setMobileTab] = useState<MobileDetailTab>("summary");
  const mobileSummaryLine = hasPriceAnomaly
    ? "현재가 데이터 차이가 커서 보수적으로 해석해야 합니다."
    : headlineChangeRate >= 2
      ? "단기 상승 흐름이지만 변동성 확대 구간 여부를 함께 확인하세요."
      : headlineChangeRate <= -2
        ? "단기 변동성 구간으로 지지선 재확인이 필요합니다."
        : "현재 흐름은 중립 관찰 구간이며 다음 종가와 거래량을 함께 확인하세요.";
  const mobileTabClass = (tab: MobileDetailTab) =>
    mobileTab === tab ? "block" : "hidden";
=======
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
  const displayPriceText =
    hasPrice && headlinePrice !== null ? formatKRW(headlinePrice) : "가격 데이터 없음";
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex h-10 items-center gap-2 rounded-lg border border-line/90 bg-white px-3 text-sm font-bold text-slate-600 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-md dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
        >
          <ArrowLeft className="h-4 w-4" />
          홈
        </Link>
        <div className="hidden md:block">
          <WatchlistButton symbol={stock.symbol} stockName={stock.koreanName} market={stock.market} />
        </div>
      </div>
      <MobileTabNav
        items={[
          { key: "summary", label: "요약" },
          { key: "chart", label: "차트" },
          { key: "ai", label: "AI" },
          { key: "indicators", label: "지표" },
          { key: "risk", label: "리스크" }
        ]}
        activeKey={mobileTab}
        onChange={(value) => setMobileTab(value as MobileDetailTab)}
        topClassName="top-[72px]"
      />

      <section
        id="detail-overview"
        className={`min-w-0 max-w-full scroll-mt-32 p-4 sm:p-5 ${cardShellClass} ${mobileTabClass(
          "summary"
        )} md:block`}
      >
        <div className="grid min-w-0 gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="min-w-0">
            <div className="flex max-w-full flex-wrap items-center gap-2">
              {sourceMeta.map(([label, value]) => (
                <span
                  key={label}
                  className="inline-flex w-full max-w-full items-center gap-1 rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300 sm:w-auto"
                >
                  <span className="text-slate-400">{label}:</span>
                  <span className="break-words text-ink dark:text-white">{value}</span>
                </span>
              ))}
            </div>
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              data.go.kr 데이터는 일별 종가 기준이며 실시간 시세가 아닙니다.
            </p>
            {hasPriceAnomaly && (
              <div
                className={`mt-3 rounded-md border px-3 py-2 text-xs font-semibold leading-5 ${
                  priceGuard?.status === "critical"
                    ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-100"
                    : "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
                }`}
              >
                <p className="font-bold">
                  {priceAnomalyTitle}
                  {priceAnomalyGapText}
                </p>
                <p className="mt-1">{priceAnomalyDescription}</p>
              </div>
            )}
            <p className="mt-4 text-xs font-bold tracking-normal text-brand">현재가 요약</p>
            <h1 className="mt-1 break-words text-2xl font-bold tracking-tight text-ink dark:text-white sm:text-3xl">
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
<<<<<<< HEAD
              {formatKRW(headlinePrice)}
            </p>
            {!hasRealtimeQuote ? (
              <p className="mt-1 break-words text-xs font-bold text-amber-700 dark:text-amber-200">
                현재가 확인 불가
              </p>
            ) : null}
            <p className="mt-1 break-words text-xs font-semibold text-slate-500 dark:text-slate-400">
              {headlineSource}
            </p>
            <div
              className={`mt-3 inline-flex max-w-full flex-wrap break-words rounded-md border px-3 py-2 text-sm font-bold ${changeBgClass(
                headlineChange
              )}`}
            >
              {headlineChange > 0 ? "+" : ""}
              {formatKRW(headlineChange)} · {formatPercent(headlineChangeRate)}
            </div>
=======
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
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
          </div>
        </div>
        {visibleTags.length > 0 && (
          <div className="mt-5 flex max-w-full flex-wrap gap-2">
            {visibleTags.map((tag) => (
              <span
                key={tag}
                className="max-w-full break-words rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        )}
        <div className="mt-4 flex flex-wrap gap-2 md:hidden">
          <WatchlistButton symbol={stock.symbol} stockName={stock.koreanName} market={stock.market} />
          <Link
            href="/portfolio#portfolio-add-entry"
            className="inline-flex h-10 items-center justify-center rounded-lg border border-line/90 bg-slate-50 px-3 text-sm font-bold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand hover:text-brand hover:shadow-md dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            보유 추가
          </Link>
        </div>
        <div className="mt-4 rounded-lg border border-line/90 bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300 md:hidden">
          핵심 판단: {mobileSummaryLine}
        </div>
      </section>

      <section
        id="detail-price"
        className={`mt-6 grid min-w-0 max-w-full scroll-mt-32 grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 ${mobileTabClass(
          "summary"
        )} md:grid`}
      >
        <div className="sm:col-span-2 xl:col-span-5">
          <p className="text-xs font-bold tracking-normal text-brand">가격 범위</p>
          <h2 className="mt-1 text-base font-bold tracking-tight text-ink dark:text-white">가격 범위 · 수급 정보</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              {hasRealtimeQuote ? "KIS 기준" : "data.go.kr 기준"}
            </span>
            <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              {hasRealtimeQuote ? "현재가 기준" : "최근 종가 기준"}
            </span>
          </div>
        </div>
        <MetricCard
          label="거래량"
          value={formatNumber(stock.volume)}
          subValue={dataDateLabel}
          icon={BarChart3}
        />
        <MetricCard label="시가총액" value={formatCompactKRW(stock.marketCap)} icon={Wallet} />
        <MetricCard label="일중 범위" value={dayRange} icon={Activity} tone={tone} />
        <div className="hidden xl:contents">
          <MetricCard
            label="PER / EPS"
            value={
              Number.isFinite(stock.pe) && stock.pe > 0
                ? `${stock.pe.toFixed(1)}x`
                : "데이터 없음"
            }
            subValue={
              Number.isFinite(stock.eps) && stock.eps > 0
                ? formatKRW(stock.eps)
                : "재무 지표는 아직 제공되지 않습니다."
            }
            icon={Gauge}
          />
          <ForeignOwnershipCard data={foreignOwnership} />
        </div>
        <div className="xl:hidden sm:col-span-2">
          <details className={`p-4 ${cardShellClass}`}>
            <summary className="cursor-pointer list-none text-sm font-bold text-ink dark:text-white">
              자세히 보기
            </summary>
            <div className="mt-3 grid gap-3">
              <MetricCard
                label="PER / EPS"
                value={
                  Number.isFinite(stock.pe) && stock.pe > 0
                    ? `${stock.pe.toFixed(1)}x`
                    : "데이터 없음"
                }
                subValue={
                  Number.isFinite(stock.eps) && stock.eps > 0
                    ? formatKRW(stock.eps)
                    : "재무 지표는 아직 제공되지 않습니다."
                }
                icon={Gauge}
              />
              <ForeignOwnershipCard data={foreignOwnership} />
            </div>
          </details>
        </div>
      </section>
      <div className={`mt-6 md:hidden ${mobileTabClass("summary")}`}>
        <EntryRiskScoreCard stock={stock} />
      </div>

      <div className="mt-6 grid min-w-0 max-w-full grid-cols-1 gap-5 xl:grid-cols-12">
        <div id="detail-risk" className={`order-1 min-w-0 max-w-full scroll-mt-32 ${mobileTabClass("risk")} md:block xl:order-5 xl:col-span-8`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              AI 참고
            </span>
            <h2 className={sectionTitleClass}>리스크 및 면책</h2>
          </div>
          <AiTradingJudgementCard
            stock={stock}
            candles={safeCandles}
            technicalSeries={technicalSeries}
            realtimeQuote={realtimeQuote}
            foreignOwnership={foreignOwnership}
            priceGuard={priceGuard}
          />
        </div>
        <div id="detail-chart" className={`order-3 min-w-0 max-w-full scroll-mt-32 ${mobileTabClass("chart")} md:block xl:order-1 xl:col-span-8`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              data.go.kr 기준
            </span>
            <h2 className={sectionTitleClass}>K선 차트</h2>
          </div>
          <CandlestickChart series={technicalSeries} />
        </div>
<<<<<<< HEAD
        <div id="detail-ai" className={`order-5 grid min-w-0 max-w-full scroll-mt-32 content-start gap-5 ${mobileTabClass("ai")} md:grid xl:order-2 xl:col-span-4`}>
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              AI 참고
            </span>
            <h2 className={sectionTitleClass}>AI 분석 요약</h2>
          </div>
          <AiReportCard
            stock={stock}
            foreignOwnership={foreignOwnership}
            realtimeQuote={realtimeQuote}
            priceGuard={priceGuard}
          />
=======
        <div className="grid min-w-0 max-w-full content-start gap-5 xl:col-start-2 xl:row-span-3 xl:row-start-1">
          <AiReportCard stock={stock} resolvedPrice={resolvedPrice} />
          <PotentialScoreCard stock={stock} />
          <DangerWarningCard stock={stock} />
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
          <EntryRiskScoreCard stock={stock} />
          {latest && previous ? (
            <KeyIndicatorsPanel stock={stock} latest={latest} previous={previous} />
          ) : (
            <section className={`p-4 sm:p-5 ${cardShellClass}`}>
              <EmptyState
                compact
                title="핵심 지표 없음"
                description="기술 지표를 계산할 일별 데이터가 부족합니다."
              />
            </section>
          )}
        </div>
        <div className={`order-6 min-w-0 max-w-full scroll-mt-32 ${mobileTabClass("ai")} md:block xl:order-3 xl:col-span-8`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              AI 참고
            </span>
            <h2 className={sectionTitleClass}>AI 캔들차트 분석</h2>
          </div>
          <CandlestickAiExpertCard
            stock={stock}
            candles={safeCandles}
            technicalSeries={technicalSeries}
            realtimeQuote={realtimeQuote}
            foreignOwnership={foreignOwnership}
            priceGuard={priceGuard}
          />
        </div>
        <div className={`order-2 grid min-w-0 max-w-full content-start gap-5 ${mobileTabClass("risk")} md:grid xl:order-6 xl:col-span-4`}>
          <TradingPlanHelper stock={stock} />
          <PotentialScoreCard stock={stock} />
          <DangerWarningCard stock={stock} />
        </div>
        <div id="detail-indicators" className={`order-4 min-w-0 max-w-full scroll-mt-32 ${mobileTabClass("indicators")} md:block xl:hidden xl:col-span-8`}>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              data.go.kr 기준
            </span>
            <h2 className={sectionTitleClass}>기술 지표</h2>
          </div>
          <details className={`p-4 sm:p-5 ${cardShellClass}`}>
            <summary className="cursor-pointer list-none text-sm font-bold text-ink dark:text-white">
              상세 지표 해석 펼치기
            </summary>
            <div className="mt-3">
              {latest ? (
                <IndicatorTranslator stock={stock} latest={latest} />
              ) : (
                <section className={`p-4 sm:p-5 ${cardShellClass}`}>
                  <EmptyState
                    compact
                    title="지표 해석 없음"
                    description="해석할 기술 지표 데이터가 없습니다."
                  />
                </section>
              )}
            </div>
          </details>
        </div>
        <div id="detail-indicators-desktop" className={`order-7 min-w-0 max-w-full ${mobileTabClass("indicators")} md:block xl:col-span-8 xl:order-4`}>
          <div className="hidden xl:block">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md border border-line/90 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 shadow-sm dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
                data.go.kr 기준
              </span>
              <h2 className={sectionTitleClass}>기술 지표</h2>
            </div>
            {latest ? (
              <IndicatorTranslator stock={stock} latest={latest} />
            ) : (
              <section className={`p-4 sm:p-5 ${cardShellClass}`}>
                <EmptyState
                  compact
                  title="지표 해석 없음"
                  description="해석할 기술 지표 데이터가 없습니다."
                />
              </section>
            )}
          </div>
          <details className={`p-4 sm:p-5 xl:hidden ${cardShellClass}`}>
            <summary className="cursor-pointer list-none text-sm font-bold text-ink dark:text-white">
              상세 차트 지표 펼치기
            </summary>
            <div className="mt-3">
              <IndicatorSummary series={technicalSeries} />
            </div>
          </details>
          <div className="hidden xl:block">
            <IndicatorSummary series={technicalSeries} />
          </div>
        </div>
      </div>
    </main>
  );
}
