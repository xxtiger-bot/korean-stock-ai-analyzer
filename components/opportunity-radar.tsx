import Link from "next/link";
import { Clock3, Radar, ShieldAlert, Star } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { WatchlistButton } from "@/components/watchlist-button";
import {
  DATA_UPDATED_AT,
  getOpportunityCategoryCounts,
  getRiskLabelClass,
  getSignalLabelClass
} from "@/lib/insights";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";
import type { OpportunityRadarItem } from "@/lib/insights";

function getDataSource(item: OpportunityRadarItem) {
  const tags = Array.isArray(item.stock?.tags) ? item.stock.tags : [];
  return tags.some((tag) => tag.toLowerCase() === "data.go.kr") ? "data.go.kr" : "mock";
}

export function OpportunityRadar({ items }: { items: OpportunityRadarItem[] }) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.stock) : [];
  const topFive = safeItems.slice(0, 5);
  const categoryCounts = getOpportunityCategoryCounts(safeItems);

  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            오늘의 기회 레이더
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
            오늘의 기회 레이더
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
            거래량, 이동평균 돌파, RSI, MACD, 단기 과열 신호를 함께 스캔합니다.
          </p>
        </div>
        <div className="grid gap-2 text-right">
          <span className="inline-flex items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
            <Clock3 className="h-4 w-4 text-brand" />
            {DATA_UPDATED_AT}
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {categoryCounts.map((item) => (
          <span
            key={item.category}
            className="rounded-md border border-line bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
          >
            {item.category} · {item.count}
          </span>
        ))}
      </div>

      {safeItems.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            compact
            title="오늘 감지된 강한 신호가 없습니다"
            description="시장 변동성이 낮을 때는 무리한 추격보다 관찰 리스트를 정리하는 편이 좋습니다."
            icon={Radar}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-3">
          <div className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-brand">
                  핵심 관심 종목
                </p>
                <h3 className="mt-1 text-base font-bold text-ink dark:text-white">
                  오늘 가장 먼저 볼 종목 상위 5
                </h3>
              </div>
              <Star className="h-5 w-5 text-amber-400" />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              {topFive.map((item, index) => (
                <Link
                  key={item.stock.symbol}
                  href={`/stocks/${item.stock.symbol}`}
                  className="rounded-md border border-line bg-white p-2.5 transition hover:border-brand dark:border-dark-line dark:bg-dark-panel"
                >
                  <p className="text-xs font-bold text-slate-400">#{index + 1}</p>
                  <p className="mt-1 truncate text-sm font-bold text-ink dark:text-white">
                    {item.stock.koreanName}
                  </p>
                  <p className="mt-1 text-xs font-bold text-brand">{item.priorityScore}점</p>
                  <p className="mt-2 line-clamp-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                    {(Array.isArray(item.signals) ? item.signals[0]?.category : undefined) ?? "관찰"} · {item.observationFocus}
                  </p>
                </Link>
              ))}
            </div>
          </div>

          <div className="grid gap-2 lg:grid-cols-2">
          {safeItems.map((item) => {
            const dataSource = getDataSource(item);
            const groupName = item.stock.sector === "미분류" ? item.stock.market : item.stock.sector;
            const signals = Array.isArray(item.signals) ? item.signals : [];

            return (
            <article
              key={item.stock.symbol}
              className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link
                      href={`/stocks/${item.stock.symbol}`}
                      className="truncate text-base font-bold text-ink hover:text-brand dark:text-white"
                    >
                      {item.stock.koreanName}
                    </Link>
                    <span className="rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:bg-dark-panel dark:text-slate-300">
                      {item.stock.symbol}
                    </span>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {groupName} · 최근 종가 {formatKRW(item.stock.price)} · 데이터: {dataSource}
                    {item.stock.date ? ` · ${item.stock.date} 기준` : ""}
                    <span className={`ml-2 ${changeColorClass(item.stock.change)}`}>
                      {formatPercent(item.stock.changeRate)}
                    </span>
                  </p>
                </div>
                <div className="grid justify-items-end gap-2">
                  <WatchlistButton
                    symbol={item.stock.symbol}
                    stockName={item.stock.koreanName}
                    market={item.stock.market}
                    compact
                  />
                  <span className="text-xs font-bold text-brand">{item.priorityScore}점</span>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {signals.slice(0, 4).map((signal) => (
                  <span
                    key={signal.id}
                    className={`rounded-md border px-2 py-1 text-xs font-bold ${getSignalLabelClass(
                      signal.severity
                    )}`}
                    title={signal.reason}
                  >
                    {signal.category}
                  </span>
                ))}
              </div>

              <div className="mt-3 rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
                      item.riskLevel
                    )}`}
                  >
                    {item.riskLevel}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-bold text-slate-400">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    위험도
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-xs font-semibold leading-5">
                  <p className="text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      신호 발생 이유:
                    </span>{" "}
                    {signals[0]?.reason ?? "신호 확인 중"}
                  </p>
                  <p className="text-slate-500 dark:text-slate-400">
                    <span className="font-bold text-slate-700 dark:text-slate-200">
                      관찰 포인트:
                    </span>{" "}
                    {item.observationFocus}
                  </p>
                  <p className="text-slate-400">
                    업데이트: {item.updatedAt}
                  </p>
                </div>
                <p className="mt-3 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300 sm:text-sm sm:leading-6">
                  {item.aiSummary}
                </p>
              </div>
            </article>
            );
          })}
          </div>
          <p className="rounded-lg border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-500 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-400">
            본 내용은 정보 제공용이며 투자 조언이 아닙니다. 주식 투자는 위험이 있으며, 최종 결정과 책임은 사용자에게 있습니다.
          </p>
        </div>
      )}
    </section>
  );
}
