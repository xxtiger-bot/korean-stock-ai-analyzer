"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui-states";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";
import type { Stock } from "@/lib/types";

function filterStocks(stocks: Stock[], query: string) {
  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const normalized = query.trim().toLowerCase();
  if (!normalized) return safeStocks;

  return safeStocks.filter((stock) =>
    [stock.symbol, stock.name, stock.koreanName, stock.sector, stock.market]
      .join(" ")
      .toLowerCase()
      .includes(normalized)
  );
}

export function StockSearch({ stocks }: { stocks: Stock[] }) {
  const [query, setQuery] = useState("");
  const [remoteResults, setRemoteResults] = useState<Stock[] | null>(null);
  const router = useRouter();
  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
  const normalizedQuery = query.trim();
  const resultLimit = normalizedQuery ? 6 : 3;
  const localResults = useMemo(
    () => filterStocks(safeStocks, query).slice(0, resultLimit),
    [query, resultLimit, safeStocks]
  );
  const results = remoteResults ?? localResults;

  useEffect(() => {
    if (!normalizedQuery) {
      setRemoteResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/stocks/search?keyword=${encodeURIComponent(normalizedQuery)}`,
          { signal: controller.signal }
        );

        if (!response.ok) return;

        const payload = (await response.json()) as { results?: Stock[] };
        if (Array.isArray(payload.results)) {
          setRemoteResults(payload.results.slice(0, 6));
        }
      } catch {
        setRemoteResults(null);
      }
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [normalizedQuery]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const firstResult = results[0];
    if (firstResult?.symbol) {
      router.push(`/stocks/${firstResult.symbol}`);
    }
  }

  function getQuoteMeta(stock: Stock) {
    if (stock.quoteSource === "KIS") {
      return {
        label: "현재가",
        sourceText: "현재가: KIS",
        hasPrice: Number.isFinite(stock.price) && stock.price > 0
      };
    }

    if (stock.quoteSource === "data.go.kr") {
      return {
        label: "현재가 확인 불가",
        sourceText: "최근 종가: data.go.kr",
        hasPrice: Number.isFinite(stock.price) && stock.price > 0
      };
    }

    if (stock.quoteSource === "none") {
      return {
        label: "현재가 데이터 없음",
        sourceText: "최근 종가 참고",
        hasPrice: false
      };
    }

    const tags = Array.isArray(stock.tags) ? stock.tags : [];
    const isDataGo = tags.some((tag) => tag.toLowerCase() === "data.go.kr");
    return {
      label: isDataGo ? "현재가 확인 불가" : "현재가 데이터 없음",
      sourceText: isDataGo ? "최근 종가: data.go.kr" : "최근 종가 참고",
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
    <section className="rounded-lg border border-brand/20 bg-white p-3 shadow-soft dark:border-brand/30 dark:bg-dark-panel sm:p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-brand">종목 검색</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">종목 검색</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-10 w-full rounded-md border border-line bg-slate-50 pl-10 pr-3 text-sm font-semibold text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-blue-50 dark:border-dark-line dark:bg-slate-900/70 dark:text-white dark:focus:bg-slate-900 dark:focus:ring-blue-950"
            placeholder="005930, 삼성전자, NAVER"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-ink px-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500 sm:px-4"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">검색</span>
        </button>
      </form>
      {results.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            title="검색 결과 없음"
            description="종목 코드, 한글명, 영문명 또는 업종으로 다시 검색해 주세요."
            icon={Search}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {results.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/stocks/${stock.symbol}`}
              className="rounded-md border border-line bg-slate-50 p-2.5 transition hover:border-brand hover:bg-white dark:border-dark-line dark:bg-slate-900/50 dark:hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  {(() => {
                    const quote = getQuoteMeta(stock);
                    return (
                      <>
                        <p className="truncate text-sm font-bold text-ink dark:text-white">
                          {stock.koreanName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {stock.symbol} · {stock.market}
                          {stock.date ? ` · ${stock.date} 기준` : ""}
                        </p>
                        <p className="mt-1 text-[11px] font-bold text-slate-400">
                          {quote.sourceText}
                        </p>
                        {getPriceAnomalyText(stock) ? (
                          <p className="mt-1 text-[11px] font-bold text-amber-700 dark:text-amber-200">
                            {getPriceAnomalyText(stock)}
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
                <div className="shrink-0 text-right">
                  {(() => {
                    const quote = getQuoteMeta(stock);
                    return (
                      <>
                        <p className="mb-1 text-[11px] font-bold text-slate-400">{quote.label}</p>
                        <p className="text-sm font-bold text-ink dark:text-white">
                          {quote.hasPrice
                            ? quote.label === "현재가"
                              ? formatKRW(stock.price)
                              : `최근 종가 ${formatKRW(stock.price)}`
                            : "최근 종가 참고"}
                        </p>
                        {quote.hasPrice ? (
                          <p className={`mt-1 text-xs font-bold ${changeColorClass(stock.change)}`}>
                            {formatPercent(stock.changeRate)}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs font-bold text-slate-400">확인 필요</p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
