import Link from "next/link";
import { Newspaper } from "lucide-react";

import { getMockMarketImpactNews } from "@/lib/news/mock-market-impact-news";

const sentimentToneClass = {
  positive:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
  neutral: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200",
  negative: "bg-rose-100 text-rose-700 dark:bg-rose-900/35 dark:text-rose-200"
} as const;

const sentimentLabel = {
  positive: "긍정",
  neutral: "중립",
  negative: "부정"
} as const;

export function MarketImpactNews() {
  const items = getMockMarketImpactNews();

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              샘플 뉴스
            </span>
            <span className="rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand dark:bg-brand/15 dark:text-blue-200">
              실시간 뉴스 연동 준비 중
            </span>
          </div>
          <h2 className="mt-2 text-lg font-bold tracking-tight text-ink dark:text-white">
            오늘 시장에 영향을 줄 뉴스
          </h2>
          <p className="mt-1.5 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            AI가 주요 뉴스가 어떤 종목에 영향을 줄 수 있는지 정리합니다.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {items.map((item) => (
          <article
            key={item.id}
            className="min-w-0 rounded-lg border border-line bg-slate-50/90 p-4 dark:border-dark-line dark:bg-slate-900/55"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-dark-panel dark:text-slate-300">
                    {item.category}
                  </span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sentimentToneClass[item.sentiment]}`}
                  >
                    {sentimentLabel[item.sentiment]}
                  </span>
                </div>
                <h3 className="mt-2 whitespace-normal break-keep text-base font-bold leading-6 text-ink [word-break:keep-all] dark:text-white">
                  {item.title}
                </h3>
                <p className="mt-1 text-xs font-semibold text-slate-400">
                  {item.source} · {item.publishedAt}
                </p>
              </div>
              <div className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 dark:bg-dark-panel dark:text-slate-300">
                <Newspaper className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3 rounded-lg border border-line bg-white px-3 py-3 dark:border-dark-line dark:bg-dark-panel">
              <p className="text-[11px] font-bold uppercase tracking-normal text-brand">
                AI 영향 요약
              </p>
              <p className="mt-2 whitespace-normal break-keep text-sm font-semibold leading-6 text-slate-600 [word-break:keep-all] dark:text-slate-300">
                {item.summary}
              </p>
            </div>

            <div className="mt-3">
              <p className="text-[11px] font-bold uppercase tracking-normal text-slate-400">
                영향을 받을 수 있는 종목
              </p>
              <div className="mt-2 grid gap-2">
                {item.affectedStocks.map((stock) => (
                  <div
                    key={`${item.id}-${stock.symbol}-${stock.stockName}`}
                    className="min-w-0 rounded-lg border border-line bg-white px-3 py-3 dark:border-dark-line dark:bg-dark-panel"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <Link
                          href={`/stocks/${stock.symbol}`}
                          className="whitespace-normal break-keep text-sm font-bold text-ink [word-break:keep-all] hover:text-brand dark:text-white"
                        >
                          {stock.stockName}
                        </Link>
                        <p className="mt-1 text-xs font-semibold text-slate-400">{stock.symbol}</p>
                      </div>
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${sentimentToneClass[stock.impact]}`}
                      >
                        영향: {sentimentLabel[stock.impact]}
                      </span>
                    </div>
                    <p className="mt-2 whitespace-normal break-keep text-xs font-semibold leading-5 text-slate-500 [word-break:keep-all] dark:text-slate-400">
                      {stock.reason}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {item.tags.map((tag) => (
                <span
                  key={`${item.id}-${tag}`}
                  className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-slate-500 dark:bg-dark-panel dark:text-slate-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>

      <p className="mt-4 text-xs font-semibold text-slate-400">
        뉴스와 AI 영향 요약은 참고용이며 투자 조언이 아닙니다.
      </p>
    </section>
  );
}
