import Link from "next/link";
import { ArrowUpRight, Layers, TrendingDown, TrendingUp } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { WatchlistButton } from "@/components/watchlist-button";
import {
  changeBgClass,
  changeColorClass,
  formatCompactKRW,
  formatKRW,
  formatNumber,
  formatPercent
} from "@/lib/format";
import type { Stock } from "@/lib/types";

function formatUpdateLabel(value: string | null | undefined) {
  if (!value) return "업데이트 확인 중";
  return value.includes("KST") ? `업데이트 ${value}` : `업데이트 ${value} KST`;
}

function getQuoteMeta(stock: Stock) {
  if (stock.quoteSource === "KIS") {
    return {
      heading: "현재가",
      statusText: "KIS 현재가",
      sourceText: "KIS 기준",
      helperText: formatUpdateLabel(stock.date),
      hasPrice: Number.isFinite(stock.price) && stock.price > 0
    };
  }

  if (stock.quoteSource === "data.go.kr") {
    return {
      heading: "최근 종가 기준",
      statusText: "최근 종가 기준",
      sourceText: "data.go.kr 기준",
      helperText: "실시간 현재가는 잠시 후 다시 확인됩니다.",
      hasPrice: Number.isFinite(stock.price) && stock.price > 0
    };
  }

  if (stock.quoteSource === "none") {
      return {
      heading: "최신 데이터 확인 중",
      statusText: "업데이트 대기",
      sourceText: "",
      helperText: "잠시 후 다시 확인됩니다.",
      hasPrice: false
    };
  }

  const tags = Array.isArray(stock.tags) ? stock.tags : [];
  const isDataGo = tags.some((tag) => tag.toLowerCase() === "data.go.kr");
  return {
    heading: isDataGo ? "최근 종가 기준" : "최신 데이터 확인 중",
    statusText: isDataGo ? "최근 종가 기준" : "업데이트 대기",
    sourceText: isDataGo ? "data.go.kr 기준" : "",
    helperText: isDataGo ? "실시간 현재가는 잠시 후 다시 확인됩니다." : "잠시 후 다시 확인됩니다.",
    hasPrice: isDataGo && Number.isFinite(stock.price) && stock.price > 0
  };
}

function getPriceAnomalyMeta(stock: Stock) {
  const anomaly = stock.priceAnomaly;
  if (anomaly !== "warning" && anomaly !== "critical") return null;

  const gapRate = Number.isFinite(stock.priceAnomalyGapRate)
    ? Math.round((stock.priceAnomalyGapRate ?? 0) * 100)
    : null;

  if (anomaly === "critical") {
    return {
      text: `가격 차이 감지${gapRate !== null ? ` · ${gapRate}%` : ""}`,
      className:
        "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100"
    };
  }

  return {
    text: `변동 재확인${gapRate !== null ? ` · ${gapRate}%` : ""}`,
    className:
      "border-slate-200 bg-slate-100 text-slate-700 dark:border-dark-line dark:bg-slate-800/70 dark:text-slate-200"
  };
}

export function StockCardGrid({
  title,
  stocks
}: {
  title: string;
  stocks: Stock[];
}) {
  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const unavailableCount = safeStocks.filter((stock) => !getQuoteMeta(stock).hasPrice).length;

  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            주요 관심 종목
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{title}</h2>
        </div>
        <span className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
          거래량 기준
        </span>
      </div>
      {unavailableCount > 0 ? (
        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          일부 종목은 최신 가격 확인 중입니다.
        </p>
      ) : null}
      {safeStocks.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            compact
            title="종목 데이터 없음"
            description="표시할 인기 종목 데이터가 없습니다."
          />
        </div>
      ) : (
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {safeStocks.map((stock) => {
          const positive = stock.change >= 0;
          const TrendIcon = positive ? TrendingUp : TrendingDown;
          const quoteMeta = getQuoteMeta(stock);
          const anomalyMeta = getPriceAnomalyMeta(stock);
          const canShowChange = quoteMeta.hasPrice && quoteMeta.heading === "현재가";
          const tags = Array.isArray(stock.tags) ? stock.tags : [];
          const visibleTags = tags.filter(
            (tag) => tag.toLowerCase() !== "data.go.kr" && tag !== stock.market
          );
          const sectorLabel = stock.sector === "미분류" ? stock.market : stock.sector;
          const secondaryName =
            stock.name && stock.name !== stock.koreanName ? stock.name : stock.market;

          return (
            <article
              key={stock.symbol}
              className="rounded-md border border-line bg-slate-50 p-3 transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:shadow-soft dark:border-dark-line dark:bg-slate-900/50 dark:hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-ink px-2 py-1 text-xs font-bold text-white dark:bg-white dark:text-ink">
                      {stock.market}
                    </span>
                    <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                      {stock.symbol}
                    </span>
                  </div>
                  <Link
                    href={`/stocks/${stock.symbol}`}
                    className="mt-2 block truncate text-base font-bold text-ink hover:text-brand dark:text-white"
                  >
                    {stock.koreanName}
                  </Link>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {secondaryName}
                  </p>
                </div>
                <WatchlistButton
                  symbol={stock.symbol}
                  stockName={stock.koreanName}
                  market={stock.market}
                  compact
                />
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-slate-400">{quoteMeta.heading}</p>
                  <p className="text-lg font-bold text-ink dark:text-white">
                    {quoteMeta.hasPrice
                      ? formatKRW(stock.price)
                      : "최신 데이터 확인 중"}
                  </p>
                  {quoteMeta.sourceText ? (
                    <p className="mt-1 text-[11px] font-bold text-slate-400">
                      {quoteMeta.sourceText}
                    </p>
                  ) : null}
                  {quoteMeta.helperText ? (
                    <p className="mt-1 text-[11px] font-semibold text-slate-400">
                      {quoteMeta.helperText}
                    </p>
                  ) : null}
                  {canShowChange ? (
                    <span
                      className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${changeBgClass(
                        stock.change
                      )}`}
                    >
                      <TrendIcon className="h-3.5 w-3.5" />
                      {formatPercent(stock.changeRate)}
                    </span>
                  ) : (
                    <span className="mt-2 inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-800/60 dark:text-slate-400">
                      {quoteMeta.hasPrice ? "참고 가격" : "업데이트 대기"}
                    </span>
                  )}
                </div>
                <Link
                  href={`/stocks/${stock.symbol}`}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-line bg-white dark:border-dark-line dark:bg-dark-panel ${changeColorClass(
                    stock.change
                  )}`}
                  aria-label={`${stock.koreanName} 상세`}
                  title={`${stock.koreanName} 상세`}
                >
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </div>

              <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                <div className="rounded-md bg-white px-2.5 py-2 dark:bg-dark-panel">
                  <p className="text-slate-400">거래량</p>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">
                    {formatNumber(stock.volume)}
                  </p>
                </div>
                <div className="rounded-md bg-white px-2.5 py-2 dark:bg-dark-panel">
                  <p className="text-slate-400">시가총액</p>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">
                    {formatCompactKRW(stock.marketCap)}
                  </p>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                  <Layers className="h-3 w-3" />
                  {sectorLabel}
                </span>
                <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                  {quoteMeta.statusText}
                </span>
                {anomalyMeta ? (
                  <span
                    className={`rounded-md border px-2 py-1 text-xs font-bold ${anomalyMeta.className}`}
                  >
                    {anomalyMeta.text}
                  </span>
                ) : null}
                {visibleTags.slice(0, 1).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          );
        })}
      </div>
      )}
    </section>
  );
}
