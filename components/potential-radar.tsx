import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { WatchlistButton } from "@/components/watchlist-button";
import { getRiskLabelClass, type PotentialRadarItem } from "@/lib/insights";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";

function getPotentialLabelClass(score: number) {
  if (score >= 80) {
    return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200";
  }
  if (score >= 60) {
    return "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";
  }
  if (score >= 40) {
    return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200";
  }
  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300";
}

export function PotentialRadar({ items }: { items: PotentialRadarItem[] }) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item?.stock) : [];

  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            AI 잠재주 레이더
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
            잠재 관찰 후보
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            data.go.kr 일별 종가 기준 참고 분석이며 실시간 거래 신호가 아닙니다.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-brand" />
      </div>

      {safeItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            title="잠재 후보 없음"
            description="일별 종가 기준 잠재 신호가 충분한 종목이 아직 없습니다."
            icon={Sparkles}
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
                <WatchlistButton symbol={item.stock.symbol} compact />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getPotentialLabelClass(
                    item.score
                  )}`}
                >
                  잠재 점수 {item.score}/100
                </span>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getPotentialLabelClass(
                    item.score
                  )}`}
                >
                  {item.level}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
                    item.riskLevel
                  )}`}
                >
                  위험도 {item.riskLevel}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">발굴 이유: </span>
                  {item.reasons.join(" · ")}
                </p>
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">관찰 포인트: </span>
                  {item.observationPoints.join(" · ")}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
