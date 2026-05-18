import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { WatchlistButton } from "@/components/watchlist-button";
import { getRiskLabelClass, type DangerWarningItem } from "@/lib/insights";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";

export function DangerWarningList({
  items,
  title = "위험 경고 종목",
  compact = false
}: {
  items: DangerWarningItem[];
  title?: string;
  compact?: boolean;
}) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.stock) : [];

  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-danger dark:text-red-300">
            위험 경고
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{title}</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            data.go.kr 일별 종가 기준 위험 관찰 정보이며 실시간 거래 신호가 아닙니다.
          </p>
        </div>
        <AlertTriangle className="h-5 w-5 text-danger dark:text-red-300" />
      </div>

      {safeItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            title="위험 경고 없음"
            description="현재 표시할 고위험 관찰 항목이 없습니다."
            icon={AlertTriangle}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {safeItems.map((item) => (
            <article
              key={item.stock.symbol}
              className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/stocks/${item.stock.symbol}`}
                    className="truncate text-base font-bold text-ink hover:text-brand dark:text-white"
                  >
                    {item.stock.koreanName}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {item.stock.symbol} · 최근 종가 {formatKRW(item.stock.price)}
                    <span className={`ml-2 ${changeColorClass(item.stock.change)}`}>
                      {formatPercent(item.stock.changeRate)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    데이터 출처: {item.dataSource} · {item.updatedAt}
                  </p>
                </div>
                {!compact && <WatchlistButton symbol={item.stock.symbol} compact />}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
                    item.level
                  )}`}
                >
                  위험 점수 {item.score}/100
                </span>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
                    item.level
                  )}`}
                >
                  {item.level}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">위험 신호: </span>
                  {item.signals.join(" · ")}
                </p>
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">주의 이유: </span>
                  {item.cautionReason}
                </p>
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">재확인 기준: </span>
                  {item.recheckCriteria}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
