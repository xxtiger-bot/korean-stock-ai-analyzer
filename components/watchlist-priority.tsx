"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { FileText, ListChecks } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { useWatchlist } from "@/components/watchlist-provider";
import {
  DATA_UPDATED_AT,
  DISCLAIMER,
  getRiskLabelClass,
  getWatchlistPriority as getLocalWatchlistPriority,
  type RiskLevel
} from "@/lib/insights";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";
import { resolveStockDisplayPrice } from "@/lib/market/price-resolver";
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
  generatedAt: string;
  dataSource: string;
  priorities: WatchlistPriorityItem[];
  report: string;
};

type ResolvedStockDisplayPrice = ReturnType<typeof resolveStockDisplayPrice>;

function resolvePriorityPrice(item: WatchlistPriorityItem): ResolvedStockDisplayPrice {
  const tags = Array.isArray(item.stock?.tags) ? item.stock.tags : [];
  const hasDataGoKr = tags.some((tag) => tag.toLowerCase() === "data.go.kr");
  const hasSuspiciousDailyClose = tags.some(
    (tag) => tag.toLowerCase() === "data.go.kr:suspicious-close"
  );

  return resolveStockDisplayPrice({
    symbol: item.stock.symbol,
    dailyClose: hasDataGoKr
      ? {
          price: item.stock.price,
          baseDate: item.stock.date,
          updatedAt: item.stock.date
        }
      : null,
    dailyCloseSource: hasDataGoKr ? "data.go.kr" : "none",
    cachedPrice: Number.isFinite(item.stock.price) && item.stock.price > 0 ? item.stock.price : null,
    cachedPriceSource:
      Number.isFinite(item.stock.price) && item.stock.price > 0 ? "cache" : "none",
    dailyCloseSuspicious: hasSuspiciousDailyClose,
    market: item.stock.market
  });
}

function getDataSource(item: WatchlistPriorityItem) {
  const tags = Array.isArray(item.stock?.tags) ? item.stock.tags : [];
  return (
    item.dataSource ??
    (tags.some((tag) => tag.toLowerCase() === "data.go.kr") ? "data.go.kr" : "mock")
  );
}

function createFallbackBrief(items: WatchlistPriorityItem[]) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.stock) : [];
  if (safeItems.length === 0) return "";

  const top = safeItems.slice(0, 3);
  const highRisk = safeItems
    .filter((item) =>
      ["매우 높음", "높음", "위험 높음", "신중 관찰"].includes(item.riskLevel)
    )
    .slice(0, 3);
  const keepWatching = safeItems
    .filter(
      (item) => !["매우 높음", "높음", "위험 높음", "신중 관찰"].includes(item.riskLevel)
    )
    .slice(0, 3);

  return [
    "오늘 우선 확인 종목 TOP 3",
    ...top.map(
      (item, index) =>
        `${index + 1}. ${item.stock.koreanName}(${item.stock.symbol}) · ${item.priority}점 · ${item.riskLevel} · ${item.focus}`
    ),
    "",
    "주요 변동 요약",
    ...safeItems.slice(0, 5).map((item) => {
      const resolvedPrice = resolvePriorityPrice(item);
      const priceText =
        resolvedPrice.displayPrice !== null ? formatKRW(resolvedPrice.displayPrice) : "가격 데이터 없음";
      const priceBasis =
        resolvedPrice.priceKind === "kis_current"
          ? "KIS 기준"
          : resolvedPrice.priceKind === "recent_close"
            ? "최근 종가 참고"
            : "데이터 일시 불가";
      const changeText = Number.isFinite(item.stock.changeRate)
        ? formatPercent(item.stock.changeRate)
        : "데이터 부족";

      return `- ${item.stock.koreanName}: ${priceText} · ${changeText} · ${priceBasis}${
        item.stock.date ? ` · ${item.stock.date} 기준` : ""
      }, ${item.reasons.slice(0, 2).join(", ")}`;
    }),
    "",
    "리스크가 높아진 종목",
    ...(highRisk.length > 0
      ? highRisk.map((item) => `- ${item.stock.koreanName}: ${item.riskLevel} · ${item.focus}`)
      : ["- 매우 높은 리스크 신호가 두드러진 종목은 없습니다."]),
    "",
    "관심 유지 종목",
    ...(keepWatching.length > 0
      ? keepWatching.map(
          (item) => `- ${item.stock.koreanName}: ${item.reasons.slice(0, 2).join(", ")}`
        )
      : ["- 관심 유지 종목은 우선순위 상위 종목 변화를 먼저 확인합니다."]),
    "",
    "내일 체크 포인트",
    "- MA20 위/아래 위치가 유지되는지 확인합니다.",
    "- RSI 과열권 또는 침체권 진입 여부를 참고 관찰합니다.",
    "- 거래량 확대가 가격 유지와 함께 나타나는지 확인합니다.",
    "",
    "면책 문구",
    DISCLAIMER
  ].join("\n");
}

export function WatchlistPriority({ stocks }: { stocks: Stock[] }) {
  const { symbols } = useWatchlist();
  const [brief, setBrief] = useState("");
  const [remotePriorities, setRemotePriorities] = useState<WatchlistPriorityItem[]>([]);
  const [remoteReport, setRemoteReport] = useState("");
  const [remoteUpdatedAt, setRemoteUpdatedAt] = useState(DATA_UPDATED_AT);
  const [remoteDataSource, setRemoteDataSource] = useState("mock");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
  const symbolKey = symbols.join("|");
  const selected = useMemo(
    () => safeStocks.filter((stock) => symbols.includes(stock.symbol)),
    [safeStocks, symbols]
  );
  const fallbackPriorities = useMemo(
    () =>
      getLocalWatchlistPriority(selected)
        .map((item) => ({ ...item, dataSource: "mock" }))
        .slice(0, 5),
    [selected]
  );
  const priorities =
    remotePriorities.length > 0 ? remotePriorities.slice(0, 5) : fallbackPriorities;
  const resolvedPriorities = useMemo(
    () =>
      priorities.map((item) => ({
        item,
        resolvedPrice: resolvePriorityPrice(item)
      })),
    [priorities]
  );

  useEffect(() => {
    if (symbols.length === 0) {
      setRemotePriorities([]);
      setRemoteReport("");
      setBrief("");
      setErrorMessage("");
      setRemoteUpdatedAt(DATA_UPDATED_AT);
      setRemoteDataSource("mock");
      return;
    }

    let cancelled = false;

    async function loadPriority() {
      setIsLoading(true);
      setErrorMessage("");

      try {
        const response = await fetch("/api/watchlist/priority", {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({ symbols }),
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("관심종목 우선순위를 불러오지 못했습니다.");
        }

        const data = (await response.json()) as WatchlistPriorityResponse;
        if (cancelled) return;

        setRemotePriorities(Array.isArray(data.priorities) ? data.priorities.filter((item) => item?.stock) : []);
        setRemoteReport(data.report ?? "");
        setRemoteUpdatedAt(data.generatedAt ?? DATA_UPDATED_AT);
        setRemoteDataSource(data.dataSource ?? "mock");
      } catch {
        if (cancelled) return;
        setRemotePriorities([]);
        setRemoteReport("");
        setErrorMessage("일별 데이터 기반 우선순위를 불러오지 못해 임시 데이터로 표시합니다.");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void loadPriority();

    return () => {
      cancelled = true;
    };
  }, [symbolKey]);

  async function generateBrief() {
    if (symbols.length === 0 || priorities.length === 0) {
      setBrief("");
      return;
    }

    if (remoteReport) {
      setBrief(remoteReport);
      return;
    }

    setBrief(createFallbackBrief(priorities));
  }

  return (
    <section className="mt-4 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
      <div className="grid gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            관심종목 우선순위
          </p>
          <h3 className="mt-1 text-sm font-bold text-ink dark:text-white">
            오늘 우선 확인
          </h3>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            {symbols.length > 0
              ? `데이터 업데이트 ${remoteUpdatedAt} · ${remoteDataSource}`
              : "관심종목 추가 후 일별 종가 기준으로 정리됩니다."}
          </p>
        </div>
        {priorities.length > 0 && (
          <button
            type="button"
            onClick={generateBrief}
            className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-md bg-ink px-3 py-2 text-[12px] font-bold leading-4 text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
          >
            <FileText className="h-3.5 w-3.5 shrink-0" />
            <span className="whitespace-normal text-center">
              오늘의 관심종목 리포트 생성
            </span>
          </button>
        )}
      </div>

      {isLoading && symbols.length > 0 && (
        <p className="mt-3 rounded-md bg-white px-3 py-2 text-xs font-bold text-slate-500 dark:bg-dark-panel dark:text-slate-300">
          관심종목 일별 데이터 기반 우선순위를 계산하는 중입니다.
        </p>
      )}
      {errorMessage && priorities.length > 0 && (
        <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {errorMessage}
        </p>
      )}

      {priorities.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            title="우선순위 없음"
            description="관심종목을 추가하면 오늘 우선 확인해야 할 종목을 자동으로 정리해드립니다."
            icon={ListChecks}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {resolvedPriorities.map(({ item, resolvedPrice }, index) => {
            const displayPrice =
              resolvedPrice.displayPrice !== null ? formatKRW(resolvedPrice.displayPrice) : "가격 데이터 없음";
            const changeText =
              resolvedPrice.priceKind === "unavailable"
                ? "데이터 부족"
                : Number.isFinite(item.stock.changeRate)
                  ? formatPercent(item.stock.changeRate)
                  : "데이터 부족";
            const changeNote =
              resolvedPrice.priceKind === "recent_close" ? " · 최근 종가 기준 참고" : "";
            const sourceLine =
              resolvedPrice.priceKind === "kis_current"
                ? `${resolvedPrice.basisKo}${resolvedPrice.updatedAt ? ` · ${resolvedPrice.updatedAt}` : ""}`
                : resolvedPrice.priceKind === "recent_close"
                  ? `${resolvedPrice.basisKo}${resolvedPrice.baseDate ? ` · ${resolvedPrice.baseDate} 기준` : ""}`
                  : resolvedPrice.basisKo;

            return (
            <Link
              key={item.stock.symbol}
              href={`/stocks/${item.stock.symbol}`}
              className="rounded-lg border border-line bg-white p-3 transition hover:border-brand dark:border-dark-line dark:bg-dark-panel"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400">
                    우선순위 {index + 1} · {item.priority}점
                  </p>
                  <p className="mt-1 truncate text-sm font-bold text-ink dark:text-white">
                    {item.stock.koreanName}
                </p>
                <p className="mt-0.5 text-xs font-semibold text-slate-400">
                  {item.stock.symbol}
                </p>
                <p className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-300">
                    <span className="mr-1 text-slate-400">{resolvedPrice.labelKo}</span>
                    {displayPrice}
                    <span
                      className={`ml-2 ${
                        resolvedPrice.priceKind === "unavailable"
                          ? "text-slate-400"
                          : changeColorClass(item.stock.change)
                      }`}
                    >
                      {changeText}
                      {changeNote}
                    </span>
                </p>
                <p className="mt-1 text-[11px] font-bold text-slate-400">{sourceLine}</p>
                {resolvedPrice.warningKo && (
                  <p className="mt-1 text-[11px] font-bold text-amber-600 dark:text-amber-300">
                    {resolvedPrice.warningKo}
                  </p>
                )}
              </div>
              <span
                className={`shrink-0 rounded-md border px-2 py-1 text-[11px] font-bold ${getRiskLabelClass(
                  item.riskLevel
                )}`}
              >
                {item.riskLevel}
              </span>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {item.reasons.join(" · ")}
            </p>
            <p className="mt-1 text-xs font-bold leading-5 text-slate-600 dark:text-slate-300">
              오늘 관찰 포인트: {item.focus}
            </p>
            <p className="mt-2 rounded-md bg-slate-50 px-2 py-2 text-xs font-semibold leading-5 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
              오늘 먼저 확인하는 이유: {item.whyToday}
            </p>
            <p className="mt-2 text-[11px] font-bold text-slate-400">
              데이터 출처: {getDataSource(item)}
            </p>
          </Link>
            );
          })}
        </div>
      )}
      {brief && (
        <div className="mt-3 rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold text-ink dark:text-white">오늘의 관심종목 리포트</p>
          <pre className="mt-2 whitespace-pre-wrap text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {brief}
          </pre>
          {!brief.includes(DISCLAIMER) && (
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">
              {DISCLAIMER}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
