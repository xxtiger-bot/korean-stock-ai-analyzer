import { Activity } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { changeBgClass, changeColorClass, formatCompactKRW, formatPercent } from "@/lib/format";
import type { MarketIndex } from "@/lib/types";

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const safeValues = Array.isArray(values) && values.length > 0 ? values.filter(Number.isFinite) : [0, 0];
  const chartValues = safeValues.length > 0 ? safeValues : [0, 0];
  const min = Math.min(...chartValues);
  const max = Math.max(...chartValues);
  const width = 116;
  const height = 36;
  const range = max - min || 1;
  const points = chartValues
    .map((value, index) => {
      const x = chartValues.length > 1 ? (index / (chartValues.length - 1)) * width : width / 2;
      const y = height - ((value - min) / range) * height;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-9 w-28" aria-hidden>
      <polyline
        fill="none"
        points={points}
        stroke={positive ? "#e23b3b" : "#2563eb"}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

export function MarketOverview({ indices }: { indices: MarketIndex[] }) {
  const safeIndices = Array.isArray(indices) ? indices : [];

  if (safeIndices.length === 0) {
    return (
      <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <EmptyState
          compact
          title="시장 지수 데이터 없음"
          description="표시할 KOSPI/KOSDAQ 데이터가 없습니다."
        />
      </section>
    );
  }

  return (
    <section className="grid gap-3 md:grid-cols-3">
      {safeIndices.map((index) => (
        <article
          key={index.code}
          className="rounded-lg border border-line bg-white p-5 shadow-soft"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-slate-400">
                <Activity className="h-3.5 w-3.5" />
                {index.code}
              </div>
              <h2 className="mt-2 text-xl font-bold text-ink">{index.koreanName}</h2>
            </div>
            <Sparkline values={index.trend} positive={index.change >= 0} />
          </div>
          <div className="mt-5 flex items-end justify-between gap-4">
            <div>
              <p className="text-2xl font-bold text-ink">
                {(Number.isFinite(index.price) ? index.price : 0).toLocaleString("ko-KR", {
                  maximumFractionDigits: 2,
                  minimumFractionDigits: 2
                })}
              </p>
              <span
                className={`mt-2 inline-flex rounded-md border px-2 py-1 text-sm font-bold ${changeBgClass(
                  index.change
                )}`}
              >
                {index.change > 0 ? "+" : ""}
                {(Number.isFinite(index.change) ? index.change : 0).toFixed(2)} · {formatPercent(index.changeRate)}
              </span>
            </div>
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400">거래대금</p>
              <p className={`mt-1 text-sm font-bold ${changeColorClass(index.change)}`}>
                {formatCompactKRW(index.turnover)}
              </p>
            </div>
          </div>
        </article>
      ))}
    </section>
  );
}
