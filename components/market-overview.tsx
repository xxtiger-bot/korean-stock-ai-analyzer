import { Activity } from "lucide-react";
import { changeBgClass, changeColorClass, formatCompactKRW, formatPercent } from "@/lib/format";
import type { MarketIndex } from "@/lib/types";

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const width = 116;
  const height = 36;
  const range = max - min || 1;
  const points = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
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
  return (
    <section className="grid gap-3 md:grid-cols-3">
      {indices.map((index) => (
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
                {index.price.toLocaleString("ko-KR", {
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
                {index.change.toFixed(2)} · {formatPercent(index.changeRate)}
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
