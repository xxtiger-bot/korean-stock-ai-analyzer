"use client";

import { Newspaper } from "lucide-react";

import { EmptyState } from "@/components/ui-states";
import { getMockStockNews } from "@/lib/news/mock-stock-news";
import type { Stock } from "@/lib/types";

function sentimentMeta(sentiment: "positive" | "neutral" | "negative") {
  if (sentiment === "positive") {
    return {
      label: "긍정",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"
    };
  }

  if (sentiment === "negative") {
    return {
      label: "부정",
      className:
        "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
    };
  }

  return {
    label: "중립",
    className:
      "border-slate-200 bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
  };
}

export function RelatedNewsCard({ stock }: { stock: Stock }) {
  const news = getMockStockNews(stock.symbol);

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-brand">News</p>
          <h2 className="mt-2 text-lg font-bold text-ink dark:text-white">관련 뉴스</h2>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            샘플 뉴스 · 실시간 뉴스 연동은 준비 중입니다.
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          <Newspaper className="h-3.5 w-3.5" />
          sample
        </span>
      </div>

      {news.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            compact
            title="관련 뉴스 데이터 없음"
            description="실시간 뉴스 연동은 준비 중입니다."
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          {news.map((item) => {
            const sentiment = sentimentMeta(item.sentiment);
            return (
              <article
                key={item.id}
                className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold leading-6 text-ink dark:text-white">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-xs font-semibold text-slate-400">
                      {item.source} · {item.publishedAt}
                    </p>
                  </div>
                  <span
                    className={`inline-flex items-center rounded-md border px-2 py-1 text-xs font-bold ${sentiment.className}`}
                  >
                    {sentiment.label}
                  </span>
                </div>
                <div className="mt-3 rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                  <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
                    AI 영향 요약
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {item.impactSummary}
                  </p>
                </div>
                {item.relatedTags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.relatedTags.map((tag) => (
                      <span
                        key={`${item.id}-${tag}`}
                        className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                ) : null}
              </article>
            );
          })}
        </div>
      )}

      <p className="mt-4 text-xs font-semibold text-slate-400">
        뉴스와 AI 요약은 참고용이며 투자 조언이 아닙니다.
      </p>
    </section>
  );
}
