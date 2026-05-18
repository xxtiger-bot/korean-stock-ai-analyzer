import { Activity, Gauge, LineChart, WalletCards } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import {
  changeBgClass,
  changeColorClass,
  formatPercent
} from "@/lib/format";
import type { MarketSignal } from "@/lib/types";

function Sparkline({ values, positive }: { values: number[]; positive: boolean }) {
  const safeValues = Array.isArray(values) && values.length > 0 ? values.filter(Number.isFinite) : [0, 0];
  const chartValues = safeValues.length > 0 ? safeValues : [0, 0];
  const min = Math.min(...chartValues);
  const max = Math.max(...chartValues);
  const width = 130;
  const height = 42;
  const range = max - min || 1;
  const pointList = chartValues.map((value, index) => {
      const x = chartValues.length > 1 ? (index / (chartValues.length - 1)) * width : width / 2;
      const y = height - ((value - min) / range) * height;
      return { x, y };
    });
  const points = pointList.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPath = [
    `M ${pointList[0]!.x} ${height}`,
    ...pointList.map((point) => `L ${point.x} ${point.y}`),
    `L ${pointList[pointList.length - 1]!.x} ${height}`,
    "Z"
  ].join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-10 w-28" aria-hidden>
      <path
        d={areaPath}
        fill={positive ? "rgba(226, 59, 59, 0.08)" : "rgba(37, 99, 235, 0.08)"}
      />
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

function formatSignalValue(signal: MarketSignal) {
  const value = Number.isFinite(signal.value) ? signal.value : 0;

  if (signal.code === "KRW/USD") {
    return `${value.toLocaleString("ko-KR", {
      maximumFractionDigits: 1,
      minimumFractionDigits: 1
    })} ${signal.unit}`;
  }

  if (signal.code === "심리 지수") {
    return `${Math.round(value)}${signal.unit}`;
  }

  return value.toLocaleString("ko-KR", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2
  });
}

export function MarketBriefing({ signals }: { signals: MarketSignal[] }) {
  const icons = [LineChart, Activity, WalletCards, Gauge];
  const safeSignals = Array.isArray(signals) ? signals : [];
  const hasRealIndex = safeSignals.some(
    (signal) => (signal.code === "KOSPI" || signal.code === "KOSDAQ") && signal.date
  );

  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            시장 요약
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
            한국 시장 요약
          </h2>
        </div>
        <p className="rounded-md bg-slate-100 px-2.5 py-1.5 text-xs font-bold text-slate-500 dark:bg-slate-900/70 dark:text-slate-300">
          {hasRealIndex ? "data.go.kr 지수 + 보조 지표 · KST" : "모의 시장 데이터 · KST"}
        </p>
      </div>
      {safeSignals.length === 0 ? (
        <div className="mt-5">
          <EmptyState
            compact
            title="시장 요약 데이터 없음"
            description="표시할 시장 요약 데이터가 없습니다."
          />
        </div>
      ) : (
      <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {safeSignals.map((signal, index) => {
          const Icon = icons[index] ?? Activity;
          return (
            <article
              key={signal.code}
              className="relative overflow-hidden rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-normal text-slate-400">
                    <Icon className="h-3.5 w-3.5" />
                    {signal.code}
                  </div>
                  <p className="mt-1 text-sm font-bold text-slate-600 dark:text-slate-300">
                    {signal.koreanName}
                  </p>
                </div>
                <Sparkline values={signal.trend} positive={signal.change >= 0} />
              </div>
              <div className="mt-3">
                <p className="text-xl font-bold text-ink dark:text-white">
                  {formatSignalValue(signal)}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span
                    className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${changeBgClass(
                      signal.change
                    )}`}
                  >
                    {signal.change > 0 ? "+" : ""}
                    {signal.change.toFixed(signal.code === "심리 지수" ? 0 : 2)} ·{" "}
                    {formatPercent(signal.changeRate)}
                  </span>
                  <span className={`text-xs font-bold ${changeColorClass(signal.change)}`}>
                    {signal.meta}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
      )}
    </section>
  );
}
