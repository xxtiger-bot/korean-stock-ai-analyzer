"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
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
  return (
    <section className="min-w-0 rounded-lg border border-line bg-white shadow-soft dark:border-dark-line dark:bg-dark-panel">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4 dark:border-dark-line">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">종목 리스트</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{title}</h2>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-xs font-bold uppercase tracking-normal text-slate-400 dark:border-dark-line dark:bg-slate-900/60">
              <th className="px-5 py-3">종목</th>
              <th className="px-4 py-3 text-right">현재가</th>
              <th className="px-4 py-3 text-right">등락률</th>
              <th className="px-4 py-3 text-right">거래량</th>
              <th className="px-4 py-3 text-right">시가총액</th>
              <th className="px-4 py-3 text-right">관심</th>
              <th className="px-5 py-3 text-right">상세</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((stock) => (
              <tr key={stock.symbol} className="border-b border-line last:border-0 dark:border-dark-line">
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-900 dark:text-slate-300">
                      {stock.koreanName.slice(0, 2)}
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
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-4 text-right text-sm font-bold text-ink dark:text-white">
                  {formatKRW(stock.price)}
                </td>
                <td className="px-4 py-4 text-right">
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${changeBgClass(
                      stock.change
                    )}`}
                  >
                    {formatPercent(stock.changeRate)}
                  </span>
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
    </section>
  );
}
