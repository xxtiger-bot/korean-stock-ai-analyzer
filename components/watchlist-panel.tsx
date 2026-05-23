"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { PortfolioRiskSummary } from "@/components/portfolio-risk-summary";
import { WatchlistDangerWarnings } from "@/components/watchlist-danger-warnings";
import { WatchlistPriority } from "@/components/watchlist-priority";
import { useWatchlist } from "@/components/watchlist-provider";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";
import type { Stock } from "@/lib/types";

type WatchlistPriorityResponse = {
  priorities: Array<{
    stock: Stock;
  }>;
};

type WatchlistPanelSectionIds = {
  root?: string;
  portfolio?: string;
  alerts?: string;
};

export function WatchlistPanel({
  stocks,
  sectionIds
}: {
  stocks: Stock[];
  sectionIds?: WatchlistPanelSectionIds;
}) {
  const {
    symbols,
    remove,
    canSyncLocalToCloud,
    isCloudSyncing,
    syncLocalToCloud,
    syncNotice
  } = useWatchlist();
  const [liveStocks, setLiveStocks] = useState<Stock[]>([]);
  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
  const symbolKey = symbols.join("|");
  const selected = useMemo(() => {
    const liveMap = new Map(liveStocks.map((stock) => [stock.symbol, stock]));
    const fallbackMap = new Map(safeStocks.map((stock) => [stock.symbol, stock]));

    return symbols
      .map((symbol) => liveMap.get(symbol) ?? fallbackMap.get(symbol))
      .filter((stock): stock is Stock => Boolean(stock));
  }, [liveStocks, safeStocks, symbols]);

  useEffect(() => {
    if (symbols.length === 0) {
      setLiveStocks([]);
      return;
    }

    let cancelled = false;

    async function loadLiveStocks() {
      try {
        const response = await fetch("/api/watchlist/priority", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ symbols }),
          cache: "no-store"
        });
        if (!response.ok) return;

        const data = (await response.json()) as WatchlistPriorityResponse;
        if (!cancelled) {
          const priorities = Array.isArray(data.priorities) ? data.priorities : [];
          setLiveStocks(priorities.map((item) => item.stock).filter(Boolean));
        }
      } catch {
        if (!cancelled) setLiveStocks([]);
      }
    }

    void loadLiveStocks();

    return () => {
      cancelled = true;
    };
  }, [symbolKey]);

  const rootId = sectionIds?.root;
  const portfolioId = sectionIds?.portfolio;
  const alertsId = sectionIds?.alerts;

  return (
    <aside
      id={rootId}
      className="scroll-mt-32 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">관심종목</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">관심종목</h2>
        </div>
        <span className="rounded-md bg-slate-100 px-2 py-1 text-xs font-bold text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
          {selected.length}
        </span>
      </div>
      {canSyncLocalToCloud ? (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => void syncLocalToCloud()}
            disabled={isCloudSyncing}
            className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-sm font-bold text-slate-700 transition hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:opacity-60 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            {isCloudSyncing ? "동기화 중..." : "로컬 관심종목을 클라우드에 동기화"}
          </button>
        </div>
      ) : null}
      {syncNotice ? (
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">{syncNotice}</p>
      ) : null}
      <div className="mt-4 space-y-2">
        {selected.length === 0 ? (
          <EmptyState
            compact
            title="관심종목 없음"
            description="관심종목을 추가하면 매일 확인할 종목을 더 쉽게 볼 수 있습니다."
          />
        ) : (
          selected.map((stock) => (
            <div
              key={stock.symbol}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
            >
              <Link href={`/stocks/${stock.symbol}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink dark:text-white">
                  {stock.koreanName}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stock.symbol} · 최근 종가{" "}
                  {formatKRW(stock.price)}
                  <span className={`ml-2 ${changeColorClass(stock.change)}`}>
                    {formatPercent(stock.changeRate)}
                  </span>
                </p>
                {stock.date && (
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    {stock.date} 기준
                  </p>
                )}
              </Link>
              <button
                type="button"
                onClick={() => remove(stock.symbol)}
                className="flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-slate-400 hover:text-slate-700 dark:border-dark-line dark:bg-dark-panel dark:hover:text-white"
                aria-label="관심종목 삭제"
                title="관심종목 삭제"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>
      <div id={alertsId} className="scroll-mt-32">
        <WatchlistDangerWarnings stocks={selected} />
      </div>
      <div id={portfolioId} className="scroll-mt-32">
        <PortfolioRiskSummary />
      </div>
      <WatchlistPriority stocks={safeStocks} />
    </aside>
  );
}
