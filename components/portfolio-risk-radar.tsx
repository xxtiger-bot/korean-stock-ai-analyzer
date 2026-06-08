"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { ShareCard } from "@/components/share/share-card";
import { ProUpgradePrompt } from "@/components/subscription/pro-upgrade-prompt";
import { EmptyState, LoadingState } from "@/components/ui-states";
import { useWatchlist } from "@/components/watchlist-provider";
import {
  getWatchlistPriority as getLocalWatchlistPriority,
  type RiskLevel
} from "@/lib/insights";
import type { Stock } from "@/lib/types";

type WatchlistPriorityItem = {
  stock: Stock;
  priority: number;
  riskLevel: RiskLevel;
  reasons: string[];
  focus: string;
  whyToday: string;
  briefingLine: string;
  dataSource?: string;
};

type WatchlistPriorityResponse = {
  generatedAt?: string;
  dataSource?: string;
  priorities?: WatchlistPriorityItem[];
  report?: string;
};

function getRadarStatus(riskLevel?: string | null) {
  if (riskLevel === "매우 높음" || riskLevel === "높음" || riskLevel === "위험 높음") {
    return "리스크 확인";
  }
  if (riskLevel === "보통" || riskLevel === "신중 관찰" || riskLevel === "관찰") {
    return "관망";
  }
  return "관심";
}

export function PortfolioRiskRadar({ stocks }: { stocks: Stock[] }) {
  const { symbols } = useWatchlist();
  const [isLoading, setIsLoading] = useState(false);
  const [remotePriorities, setRemotePriorities] = useState<WatchlistPriorityItem[]>([]);
  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
  const symbolKey = symbols.join("|");

  const selectedStocks = useMemo(() => {
    const stockMap = new Map(safeStocks.map((stock) => [stock.symbol, stock]));
    return symbols
      .map((symbol) => stockMap.get(symbol))
      .filter((stock): stock is Stock => Boolean(stock));
  }, [safeStocks, symbols]);

  const fallbackPriorities = useMemo(
    () => getLocalWatchlistPriority(selectedStocks).slice(0, 5),
    [selectedStocks]
  );

  const priorities = remotePriorities.length > 0 ? remotePriorities.slice(0, 5) : fallbackPriorities;
  const focusItems = priorities.slice(0, 3);
  const statusList = priorities.map((item) =>
    getRadarStatus(typeof item?.riskLevel === "string" ? item.riskLevel : undefined)
  );
  const riskCount = statusList.filter((status) => status === "리스크 확인").length;
  const watchCount = statusList.filter((status) => status === "관망").length;
  const interestCount = statusList.filter((status) => status === "관심").length;
  const dateLabel = useMemo(
    () =>
      new Intl.DateTimeFormat("ko-KR", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }).format(new Date()),
    []
  );

  useEffect(() => {
    if (symbols.length === 0) {
      setRemotePriorities([]);
      return;
    }

    let cancelled = false;

    async function loadPriority() {
      setIsLoading(true);

      try {
        const response = await fetch("/api/watchlist/priority", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ symbols }),
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("priority failed");
        }

        const data = (await response.json()) as WatchlistPriorityResponse;
        if (cancelled) return;
        setRemotePriorities(
          Array.isArray(data.priorities) ? data.priorities.filter((item) => item?.stock) : []
        );
      } catch {
        if (!cancelled) setRemotePriorities([]);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadPriority();

    return () => {
      cancelled = true;
    };
  }, [symbolKey, symbols]);

  return (
    <section className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold uppercase tracking-normal text-brand">Portfolio</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
          관심/보유 종목 리스크 레이더
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          AI가 관심종목과 우선 확인 데이터를 기준으로 리스크 상태를 정리합니다.
        </p>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-900/40 dark:bg-amber-950/20">
          <p className="text-xs font-bold uppercase tracking-normal text-amber-700 dark:text-amber-300">
            안내
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            현재 이 레이더는 관심종목 및 우선 확인 데이터를 기준으로 제공됩니다. 실제
            보유 수량, 평균 매입가, 수익률 기반 분석은 향후 업데이트될 예정입니다.
          </p>
        </div>

        {isLoading && symbols.length > 0 ? (
          <div className="mt-5">
            <LoadingState
              title="리스크 레이더 정리 중"
              description="관심/보유 종목의 우선 확인 상태를 계산하고 있습니다."
            />
          </div>
        ) : priorities.length === 0 ? (
          <div className="mt-5 rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
            <EmptyState
              compact
              title="리스크 레이더 데이터 없음"
              description="보유종목을 추가하면 AI가 매일 리스크 상태를 정리해드립니다."
            />
            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <Link
                href="/#watchlist-desk"
                className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
              >
                관심종목 추가하기
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900/70"
              >
                종목 검색하기
              </Link>
            </div>
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            <div className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                Portfolio Risk Summary
              </p>
              <h2 className="mt-2 text-lg font-bold text-ink dark:text-white">
                총 확인 종목 {priorities.length}개
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                리스크 확인 {riskCount}개 · 관망 {watchCount}개 · 관심 {interestCount}개
              </p>
            </div>

            <div className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold uppercase tracking-normal text-brand">
                    Today Risk Focus
                  </p>
                  <h2 className="mt-2 text-lg font-bold text-ink dark:text-white">
                    오늘 먼저 확인할 종목
                  </h2>
                </div>
                <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                  TOP {focusItems.length}
                </span>
              </div>

              <div className="mt-4 grid gap-3">
                {focusItems.map((item, index) => {
                  const stockName = item?.stock?.koreanName ?? item?.stock?.name ?? "종목명 확인 필요";
                  const symbol = item?.stock?.symbol ?? "코드 확인 필요";
                  const reason =
                    typeof item?.whyToday === "string" && item.whyToday.trim().length > 0
                      ? item.whyToday
                      : typeof item?.focus === "string" && item.focus.trim().length > 0
                        ? item.focus
                        : Array.isArray(item?.reasons) && item.reasons.length > 0
                          ? item.reasons.slice(0, 2).join(" · ")
                          : "오늘 확인이 필요한 흐름이 감지되었습니다.";

                  return (
                    <div
                      key={`${symbol}-${index}`}
                      className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-base font-bold text-ink dark:text-white">
                            {stockName}
                          </p>
                          <p className="mt-1 text-xs font-semibold text-slate-400">{symbol}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                          {getRadarStatus(typeof item?.riskLevel === "string" ? item.riskLevel : undefined)}
                        </span>
                      </div>
                      <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                        {reason}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <ProUpgradePrompt
              featureName="Risk History"
              title="리스크 기록"
              description={
                "최근 3일 리스크 변화는 Free에서 확인할 수 있습니다.\n90일 리스크 추적은 Pro에서 제공됩니다."
              }
            />

            <ShareCard
              title="관심/보유 종목 리스크 레이더"
              subtitle="AI가 관심종목과 우선 확인 데이터를 기준으로 리스크 상태를 정리했습니다."
              statusLabel="Risk Radar"
              mainText="AI가 관심종목과 우선 확인 데이터를 기준으로 리스크 상태를 정리했습니다."
              items={[
                `총 확인 종목 ${priorities.length}개`,
                `리스크 확인 ${riskCount}개`,
                `관망 ${watchCount}개`,
                `관심 ${interestCount}개`
              ]}
              dateLabel={dateLabel}
              sourceLabel="관심/보유 종목 우선순위 기준"
              disclaimer="AI 보조 분석이며, 투자 조언이 아닙니다."
              ctaText="KRX Insight에서 관심/보유 종목 흐름을 더 확인하세요."
              compact
              triggerLabel="리스크 요약 공유하기"
            />
          </div>
        )}
      </div>
    </section>
  );
}
