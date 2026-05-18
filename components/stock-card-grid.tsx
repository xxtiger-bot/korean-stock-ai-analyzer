import Link from "next/link";
import { ArrowUpRight, Layers, TrendingDown, TrendingUp } from "lucide-react";
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

function getDataSource(stock: Stock) {
  return stock.tags.some((tag) => tag.toLowerCase() === "data.go.kr") ? "data.go.kr" : "mock";
}

export function StockCardGrid({
  title,
  stocks
}: {
  title: string;
  stocks: Stock[];
}) {
  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            주요 관심 종목
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{title}</h2>
        </div>
        <span className="rounded-md bg-slate-100 px-3 py-2 text-xs font-bold text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
          거래량 기준
        </span>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {stocks.map((stock) => {
          const positive = stock.change >= 0;
          const TrendIcon = positive ? TrendingUp : TrendingDown;
          const dataSource = getDataSource(stock);
          const visibleTags = stock.tags.filter(
            (tag) => tag.toLowerCase() !== "data.go.kr" && tag !== stock.market
          );
          const sectorLabel = stock.sector === "미분류" ? stock.market : stock.sector;
          const secondaryName =
            stock.name && stock.name !== stock.koreanName ? stock.name : `데이터: ${dataSource}`;

          return (
            <article
              key={stock.symbol}
              className="rounded-lg border border-line bg-slate-50 p-4 transition hover:-translate-y-0.5 hover:border-brand hover:bg-white hover:shadow-soft dark:border-dark-line dark:bg-slate-900/50 dark:hover:bg-slate-900"
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
                    className="mt-3 block truncate text-lg font-bold text-ink hover:text-brand dark:text-white"
                  >
                    {stock.koreanName}
                  </Link>
                  <p className="mt-1 truncate text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {secondaryName}
                  </p>
                </div>
                <WatchlistButton symbol={stock.symbol} compact />
              </div>

              <div className="mt-5 flex items-end justify-between gap-3">
                <div>
                  <p className="text-2xl font-bold text-ink dark:text-white">
                    {formatKRW(stock.price)}
                  </p>
                  <span
                    className={`mt-2 inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${changeBgClass(
                      stock.change
                    )}`}
                  >
                    <TrendIcon className="h-3.5 w-3.5" />
                    {formatPercent(stock.changeRate)}
                  </span>
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

              <div className="mt-5 grid grid-cols-2 gap-2 text-xs font-bold">
                <div className="rounded-md bg-white px-3 py-2 dark:bg-dark-panel">
                  <p className="text-slate-400">거래량</p>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">
                    {formatNumber(stock.volume)}
                  </p>
                </div>
                <div className="rounded-md bg-white px-3 py-2 dark:bg-dark-panel">
                  <p className="text-slate-400">시가총액</p>
                  <p className="mt-1 text-slate-700 dark:text-slate-200">
                    {formatCompactKRW(stock.marketCap)}
                  </p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                  <Layers className="h-3 w-3" />
                  {sectorLabel}
                </span>
                <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                  데이터: {dataSource}
                </span>
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
    </section>
  );
}
