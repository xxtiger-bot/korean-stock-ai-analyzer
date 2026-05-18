"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui-states";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";
import type { Stock } from "@/lib/types";

function filterStocks(stocks: Stock[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return stocks;

  return stocks.filter((stock) =>
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
  const localResults = useMemo(() => filterStocks(stocks, query).slice(0, 6), [query, stocks]);
  const results = remoteResults ?? localResults;

  useEffect(() => {
    const normalized = query.trim();

    if (!normalized) {
      setRemoteResults(null);
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(
          `/api/stocks/search?keyword=${encodeURIComponent(normalized)}`,
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
  }, [query]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (results[0]) {
      router.push(`/stocks/${results[0].symbol}`);
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-brand">종목 검색</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">종목 검색</h2>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 w-full rounded-md border border-line bg-slate-50 pl-10 pr-3 text-sm font-semibold text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white focus:ring-4 focus:ring-blue-50 dark:border-dark-line dark:bg-slate-900/70 dark:text-white dark:focus:bg-slate-900 dark:focus:ring-blue-950"
            placeholder="005930, 삼성전자, NAVER"
          />
        </div>
        <button
          type="submit"
          className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
        >
          <Search className="h-4 w-4" />
          <span className="hidden sm:inline">검색</span>
        </button>
      </form>
      {results.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            compact
            title="검색 결과 없음"
            description="종목 코드, 한글명, 영문명 또는 업종으로 다시 검색해 주세요."
            icon={Search}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {results.map((stock) => (
            <Link
              key={stock.symbol}
              href={`/stocks/${stock.symbol}`}
              className="rounded-lg border border-line bg-slate-50 p-3 transition hover:border-brand hover:bg-white dark:border-dark-line dark:bg-slate-900/50 dark:hover:bg-slate-900"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink dark:text-white">
                    {stock.koreanName}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {stock.symbol} · {stock.market}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-ink dark:text-white">
                    {formatKRW(stock.price)}
                  </p>
                  <p className={`mt-1 text-xs font-bold ${changeColorClass(stock.change)}`}>
                    {formatPercent(stock.changeRate)}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
