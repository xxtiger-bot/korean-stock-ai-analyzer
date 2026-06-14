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
  const unavailableCount = safeStocks.filter((stock) => !getQuoteMeta(stock).hasPrice).length;

  function getQuoteMeta(stock: Stock) {
    if (stock.quoteSource === "KIS") {
      return {
        label: "KIS 기준",
        primaryLabel: "현재가",
        helperText: stock.date
          ? `업데이트 ${stock.date}${stock.date.includes("KST") ? "" : " KST"}`
          : "업데이트 확인 중",
        hasPrice: Number.isFinite(stock.price) && stock.price > 0
      };
    }
    if (stock.quoteSource === "data.go.kr") {
      return {
        label: "data.go.kr 기준",
        primaryLabel: "최근 종가 기준",
        helperText: "실시간 현재가는 잠시 후 다시 확인됩니다.",
        hasPrice: Number.isFinite(stock.price) && stock.price > 0
      };
    }
    if (stock.quoteSource === "none") {
      return {
        label: "",
        primaryLabel: "최신 데이터 확인 중",
        helperText: "잠시 후 다시 확인됩니다.",
        hasPrice: false
      };
    }

    const tags = Array.isArray(stock.tags) ? stock.tags : [];
    const isDataGo = tags.some((tag) => tag.toLowerCase() === "data.go.kr");
    return {
      label: isDataGo ? "data.go.kr 기준" : "",
      primaryLabel: isDataGo ? "최근 종가 기준" : "최신 데이터 확인 중",
      helperText: isDataGo ? "실시간 현재가는 잠시 후 다시 확인됩니다." : "잠시 후 다시 확인됩니다.",
      hasPrice: isDataGo && Number.isFinite(stock.price) && stock.price > 0
    };
  }

  function getPriceAnomalyText(stock: Stock) {
    if (stock.priceAnomaly !== "warning" && stock.priceAnomaly !== "critical") return "";
    const gapRate = Number.isFinite(stock.priceAnomalyGapRate)
      ? Math.round((stock.priceAnomalyGapRate ?? 0) * 100)
      : null;
    const title = stock.priceAnomaly === "critical" ? "가격 차이 감지" : "변동 재확인";
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
      {unavailableCount > 0 ? (
        <p className="px-5 pt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          일부 종목은 최신 가격 확인 중입니다.
        </p>
      ) : null}
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
      <div className="grid gap-2 overflow-x-hidden p-3 md:hidden">
        {safeStocks.map((stock) => (
          <article
            key={`mobile-${stock.symbol}`}
            className="min-w-0 overflow-hidden rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="whitespace-normal break-keep text-sm font-bold leading-5 text-ink [word-break:keep-all] dark:text-white">
                  {stock.koreanName}
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span className="rounded-full bg-white px-2 py-0.5 dark:bg-dark-panel">
                    {stock.symbol}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 dark:bg-dark-panel">
                    {stock.market}
                  </span>
                  <span className="rounded-full bg-white px-2 py-0.5 dark:bg-dark-panel">
                    {stock.sector}
                  </span>
                </div>
                {getPriceAnomalyText(stock) ? (
                  <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-200">
                    {getPriceAnomalyText(stock)}
                  </p>
                ) : null}
              </div>
              <WatchlistButton
                symbol={stock.symbol}
                stockName={stock.koreanName}
                market={stock.market}
                compact
              />
            </div>
            <div className="mt-3 rounded-lg border border-line bg-white/90 p-3 dark:border-dark-line dark:bg-dark-panel/90">
              <p className="text-[11px] font-bold text-slate-400">
                {getQuoteMeta(stock).primaryLabel}
              </p>
              <p className="mt-1 whitespace-normal break-keep text-base font-bold leading-6 text-ink [word-break:keep-all] dark:text-white">
                <span className="inline-flex min-w-0 items-baseline gap-1">
                  {getQuoteMeta(stock).hasPrice
                    ? getQuoteMeta(stock).primaryLabel === "현재가"
                      ? formatKRW(stock.price)
                      : `최근 종가 ${formatKRW(stock.price)}`
                    : "최신 데이터 확인 중"}
                </span>
              </p>
              {getQuoteMeta(stock).label ? (
                <p className="mt-1 whitespace-normal break-keep text-[11px] font-bold text-slate-400 [word-break:keep-all]">
                  {getQuoteMeta(stock).label}
                </p>
              ) : null}
              {getQuoteMeta(stock).helperText ? (
                <p className="mt-1 whitespace-normal break-keep text-[11px] font-semibold leading-4 text-slate-400 [word-break:keep-all]">
                  {getQuoteMeta(stock).helperText}
                </p>
              ) : null}
            </div>
            <div className="mt-2 grid grid-cols-1 gap-2 text-xs font-semibold sm:grid-cols-2">
              <div className="rounded-md bg-white px-3 py-2 text-slate-600 dark:bg-dark-panel dark:text-slate-300">
                <p className="text-[11px] font-bold text-slate-400">등락</p>
                {getQuoteMeta(stock).hasPrice ? (
                  <p className={`mt-1 font-bold ${changeColorClass(stock.change)}`}>
                    {formatPercent(stock.changeRate)}
                  </p>
                ) : (
                  <p className="mt-1 font-bold text-slate-400">업데이트 대기</p>
                )}
              </div>
              <div className="rounded-md bg-white px-3 py-2 text-slate-600 dark:bg-dark-panel dark:text-slate-300">
                <p className="text-[11px] font-bold text-slate-400">거래량</p>
                <p className="mt-1 min-w-0 whitespace-normal break-keep font-bold text-ink [word-break:keep-all] dark:text-white">
                  {formatNumber(stock.volume)}
                </p>
              </div>
              <div className="rounded-md bg-white px-3 py-2 text-slate-600 dark:bg-dark-panel dark:text-slate-300 sm:col-span-2">
                <p className="text-[11px] font-bold text-slate-400">시가총액</p>
                <p className="mt-1 min-w-0 whitespace-normal break-keep font-bold text-ink [word-break:keep-all] dark:text-white">
                  {formatCompactKRW(stock.marketCap)}
                </p>
              </div>
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
                    <div className="min-w-0">
                      <Link
                        href={`/stocks/${stock.symbol}`}
                        className="block whitespace-normal break-keep font-bold text-ink [word-break:keep-all] hover:text-brand dark:text-white"
                      >
                        {stock.koreanName}
                      </Link>
                      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {stock.symbol} · {stock.sector}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-400">
                        {getQuoteMeta(stock).primaryLabel}
                      </p>
                      {getQuoteMeta(stock).label ? (
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          {getQuoteMeta(stock).label}
                        </p>
                      ) : null}
                      {getQuoteMeta(stock).helperText ? (
                        <p className="mt-1 text-[11px] font-semibold text-slate-400">
                          {getQuoteMeta(stock).helperText}
                        </p>
                      ) : null}
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
                    : "최신 데이터 확인 중"}
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
                      업데이트 대기
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
                  <WatchlistButton
                    symbol={stock.symbol}
                    stockName={stock.koreanName}
                    market={stock.market}
                    compact
                  />
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
