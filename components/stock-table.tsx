"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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

type StockTableProps = {
  title: string;
  stocks: Stock[];
};

export function StockTable({ title, stocks }: StockTableProps) {
  const safeStocks = Array.isArray(stocks) ? stocks : [];

  function getQuoteMeta(stock: Stock) {
    if (stock.quoteSource === "KIS") {
      return {
        label: "시세: KIS",
        primaryLabel: "현재가",
        hasPrice: Number.isFinite(stock.price) && stock.price > 0
      };
    }
    if (stock.quoteSource === "data.go.kr") {
      return {
        label: "data.go.kr 일별 종가 기준",
        primaryLabel: "현재가 확인 불가",
        hasPrice: Number.isFinite(stock.price) && stock.price > 0
      };
    }
    if (stock.quoteSource === "none") {
      return { label: "최근 종가 참고", primaryLabel: "현재가 데이터 없음", hasPrice: false };
    }

    const tags = Array.isArray(stock.tags) ? stock.tags : [];
    const isDataGo = tags.some((tag) => tag.toLowerCase() === "data.go.kr");
    return {
      label: isDataGo ? "data.go.kr 일별 종가 기준" : "최근 종가 참고",
      primaryLabel: isDataGo ? "현재가 확인 불가" : "현재가 데이터 없음",
      hasPrice: isDataGo && Number.isFinite(stock.price) && stock.price > 0
    };
  }

  function getPriceAnomalyText(stock: Stock) {
    if (stock.priceAnomaly !== "warning" && stock.priceAnomaly !== "critical") return "";
    const gapRate = Number.isFinite(stock.priceAnomalyGapRate)
      ? Math.round((stock.priceAnomalyGapRate ?? 0) * 100)
      : null;
    const title = stock.priceAnomaly === "critical" ? "데이터 검증 필요" : "가격 확인 필요";
    return `${title}${gapRate !== null ? ` · ${gapRate}%` : ""}`;
  }

  return (
    <section className="min-w-0 rounded-lg border border-line bg-white shadow-soft dark:border-dark-line dark:bg-dark-panel">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 dark:border-dark-line">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">종목 리스트</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{title}</h2>
        </div>
      </div>
      {safeStocks.length === 0 ? (
        <div className="p-5">
          <EmptyState
            compact
            title="종목 리스트 없음"
            description="표시할 종목 데이터가 없습니다."
          />
        </div>
      ) : (
      <>
      <div className="grid gap-2 p-3 md:hidden">
        {safeStocks.map((stock) => (
          <article
            key={`mobile-${stock.symbol}`}
            className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink dark:text-white">
                  {stock.koreanName}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stock.symbol} · {stock.sector}
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">
                  {getQuoteMeta(stock).primaryLabel}
                  {stock.date ? ` · ${stock.date} 기준` : ""}
                </p>
                {getPriceAnomalyText(stock) ? (
                  <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-200">
                    {getPriceAnomalyText(stock)}
                  </p>
                ) : null}
              </div>
              <WatchlistButton symbol={stock.symbol} compact />
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 text-xs font-semibold">
              <p className="text-slate-600 dark:text-slate-300">
                {getQuoteMeta(stock).primaryLabel}{" "}
                <span className="font-bold text-ink dark:text-white">
                  {getQuoteMeta(stock).hasPrice
                    ? getQuoteMeta(stock).primaryLabel === "현재가"
                      ? formatKRW(stock.price)
                      : `최근 종가 ${formatKRW(stock.price)}`
                    : "최근 종가 참고"}
                </span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                등락{" "}
                {getQuoteMeta(stock).hasPrice ? (
                  <span className={`font-bold ${changeColorClass(stock.change)}`}>
                    {formatPercent(stock.changeRate)}
                  </span>
                ) : (
                  <span className="font-bold text-slate-400">확인 필요</span>
                )}
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                거래량{" "}
                <span className="font-bold text-ink dark:text-white">{formatNumber(stock.volume)}</span>
              </p>
              <p className="text-slate-600 dark:text-slate-300">
                시가총액{" "}
                <span className="font-bold text-ink dark:text-white">
                  {formatCompactKRW(stock.marketCap)}
                </span>
              </p>
            </div>
            <div className="mt-2 flex justify-end">
              <Link
                href={`/stocks/${stock.symbol}`}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white transition hover:border-brand dark:border-dark-line dark:bg-dark-panel ${changeColorClass(
                  stock.change
                )}`}
                aria-label={`${stock.koreanName} 상세`}
                title={`${stock.koreanName} 상세`}
              >
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </article>
        ))}
      </div>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-xs font-bold uppercase tracking-normal text-slate-400 dark:border-dark-line dark:bg-slate-900/60">
              <th className="px-5 py-3">종목</th>
              <th className="px-4 py-3 text-right">현재가 / 최근 종가</th>
              <th className="px-4 py-3 text-right">등락률</th>
              <th className="px-4 py-3 text-right">거래량</th>
              <th className="px-4 py-3 text-right">시가총액</th>
              <th className="px-4 py-3 text-right">관심</th>
              <th className="px-5 py-3 text-right">상세</th>
            </tr>
          </thead>
          <tbody>
            {safeStocks.map((stock) => (
              <tr key={stock.symbol} className="border-b border-line last:border-0 dark:border-dark-line">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {(stock.koreanName || stock.symbol || "--").slice(0, 2)}
                    </span>
                    <div>
                      <Link
                        href={`/stocks/${stock.symbol}`}
                        className="font-bold text-ink hover:text-brand dark:text-white"
                      >
                        {stock.koreanName}
                      </Link>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {stock.symbol} · {stock.sector}
                        {stock.date ? ` · ${stock.date} 기준` : ""}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">
                        {getQuoteMeta(stock).primaryLabel}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">
                        {getQuoteMeta(stock).label}
                      </p>
                      {getPriceAnomalyText(stock) ? (
                        <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-200">
                          {getPriceAnomalyText(stock)}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-sm font-bold text-ink dark:text-white">
                  {getQuoteMeta(stock).hasPrice
                    ? getQuoteMeta(stock).primaryLabel === "현재가"
                      ? formatKRW(stock.price)
                      : `최근 종가 ${formatKRW(stock.price)}`
                    : "최근 종가 참고"}
                </td>
                <td className="px-4 py-4 text-right">
                  {getQuoteMeta(stock).hasPrice ? (
                    <span
                      className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${changeBgClass(
                        stock.change
                      )}`}
                    >
                      {formatPercent(stock.changeRate)}
                    </span>
                  ) : (
                    <span className="inline-flex rounded-md border border-slate-200 bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-800/60 dark:text-slate-400">
                      확인 필요
                    </span>
                  )}
                </td>
                <td className="px-4 py-4 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {formatNumber(stock.volume)}
                </td>
                <td className="px-4 py-4 text-right text-sm font-semibold text-slate-600 dark:text-slate-300">
                  {formatCompactKRW(stock.marketCap)}
                </td>
                <td className="px-4 py-4 text-right">
                  <WatchlistButton symbol={stock.symbol} compact />
                </td>
                <td className="px-5 py-4 text-right">
                  <Link
                    href={`/stocks/${stock.symbol}`}
                    className={`inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white transition hover:border-brand dark:border-dark-line dark:bg-dark-panel ${changeColorClass(
                      stock.change
                    )}`}
                    aria-label={`${stock.koreanName} 상세`}
                    title={`${stock.koreanName} 상세`}
                  >
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </>
      )}
    </section>
  );
}
