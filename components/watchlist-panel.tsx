"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { ProUpgradePrompt } from "@/components/subscription/pro-upgrade-prompt";
import { EmptyState } from "@/components/ui-states";
import { PortfolioRiskSummary } from "@/components/portfolio-risk-summary";
import { WatchlistDangerWarnings } from "@/components/watchlist-danger-warnings";
import { WatchlistPriority } from "@/components/watchlist-priority";
import { useWatchlist } from "@/components/watchlist-provider";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";
import {
  resolveStockDisplayPrice
} from "@/lib/market/price-resolver";
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
    planStatusLabel,
    watchlistLimit,
    isWatchlistLimitReached,
    isWatchlistNearLimit,
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
  const resolvedSelected = useMemo(() => {
    return selected.map((stock) => ({
      stock,
      resolvedPrice: resolveStockDisplayPrice((() => {
        const tags = Array.isArray(stock.tags) ? stock.tags : [];
        const hasDataGoKr = tags.some((tag) => tag.toLowerCase() === "data.go.kr");
        const hasSuspiciousDailyClose = tags.some(
          (tag) => tag.toLowerCase() === "data.go.kr:suspicious-close"
        );

        return {
          symbol: stock.symbol,
          dailyClose: hasDataGoKr
            ? {
                price: stock.price,
                baseDate: stock.date,
                updatedAt: stock.date
              }
            : null,
          dailyCloseSource: hasDataGoKr ? "data.go.kr" : "none",
          cachedPrice: Number.isFinite(stock.price) && stock.price > 0 ? stock.price : null,
          cachedPriceSource:
            Number.isFinite(stock.price) && stock.price > 0 ? "cache" : "none",
          dailyCloseSuspicious: hasSuspiciousDailyClose,
          market: stock.market
        };
      })())
    }));
  }, [selected]);

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
          {symbols.length}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          현재 플랜: {planStatusLabel}
        </span>
        {watchlistLimit !== null ? (
          <span
            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
              isWatchlistLimitReached
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                : isWatchlistNearLimit
                  ? "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
            }`}
          >
            관심종목 {symbols.length}/{watchlistLimit}
          </span>
        ) : null}
        {(isWatchlistLimitReached || isWatchlistNearLimit) && watchlistLimit !== null ? (
          <Link
            href="/pricing#pro"
            className="inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
          >
            요금제 보기
          </Link>
        ) : null}
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
        {symbols.length >= 5 ? (
          <ProUpgradePrompt
            compact
            featureName="Watchlist"
            title="관심종목 추적 한도"
            description={
              "Free 플랜에서는 관심종목을 최대 5개까지 추적할 수 있습니다.\nPro에서는 최대 30개 관심종목을 추적할 수 있습니다."
            }
          />
        ) : null}
        {resolvedSelected.length === 0 ? (
          <EmptyState
            compact
            title="관심종목 없음"
            description="관심종목을 추가하면 매일 확인할 종목을 더 쉽게 볼 수 있습니다."
          />
        ) : (
          resolvedSelected.map(({ stock, resolvedPrice }) => {
            const displayPrice =
              resolvedPrice.displayPrice !== null ? formatKRW(resolvedPrice.displayPrice) : "";
            const sourceLine =
              resolvedPrice.priceKind === "kis_current"
                ? `${resolvedPrice.basisKo}${resolvedPrice.updatedAt ? ` · ${resolvedPrice.updatedAt}` : ""}`
                : resolvedPrice.priceKind === "recent_close"
                  ? `${resolvedPrice.basisKo}${resolvedPrice.baseDate ? ` · ${resolvedPrice.baseDate} 기준` : ""}`
                  : resolvedPrice.basisKo;
            const changeText =
              resolvedPrice.priceKind === "unavailable"
                ? "데이터 부족"
                : Number.isFinite(stock.changeRate)
                  ? formatPercent(stock.changeRate)
                  : "데이터 부족";

            return (
            <div
              key={stock.symbol}
              className="flex items-center justify-between gap-3 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
            >
              <Link href={`/stocks/${stock.symbol}`} className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink dark:text-white">
                  {stock.koreanName}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {stock.symbol} · {resolvedPrice.labelKo}{" "}
                  {displayPrice}
                  <span
                    className={`ml-2 ${
                      resolvedPrice.priceKind === "unavailable"
                        ? "text-slate-400"
                        : changeColorClass(stock.change)
                    }`}
                  >
                    {changeText}
                  </span>
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">{sourceLine}</p>
                {resolvedPrice.warningKo && (
                  <p className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                    {resolvedPrice.warningKo}
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
            );
          })
        )}
      </div>
      <div id={alertsId} className="scroll-mt-32">
        <WatchlistDangerWarnings stocks={selected} />
      </div>
      <div id={portfolioId} className="scroll-mt-32">
        <PortfolioRiskSummary />
      </div>
      <WatchlistPriority stocks={safeStocks} />
      {selected.length > 0 ? (
        <div className="mt-3">
          <ProUpgradePrompt
            compact
            featureName="Risk History"
            title="리스크 기록"
            description={
              "최근 3일 리스크 변화는 Free에서 확인할 수 있습니다.\n90일 리스크 추적은 Pro에서 제공됩니다."
            }
          />
        </div>
      ) : null}
    </aside>
  );
}
