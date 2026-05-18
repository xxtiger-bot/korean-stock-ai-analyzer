import { Activity, BarChart3, Gauge, TrendingUp } from "lucide-react";
import { getIndicatorBias } from "@/lib/indicators";
import {
  changeBgClass,
  changeColorClass,
  formatKRW,
  formatNumber,
  formatPercent
} from "@/lib/format";
import type { Stock, TechnicalPoint } from "@/lib/types";

function formatIndicator(value: number | null, currency = false) {
  if (value === null || !Number.isFinite(value)) return "-";
  return currency ? formatKRW(value) : value.toFixed(2);
}

function translateStatus(value: string) {
  return value
    .replace("bullish", "강세")
    .replace("bearish", "약세")
    .replace("neutral", "중립")
    .replace("golden_cross", "골든크로스")
    .replace("dead_cross", "데드크로스");
}

export function KeyIndicatorsPanel({
  stock,
  latest,
  previous
}: {
  stock: Stock;
  latest: TechnicalPoint;
  previous: TechnicalPoint;
}) {
  const bias = getIndicatorBias(latest);
  const ma20Gap =
    latest.ma20 === null || !Number.isFinite(latest.ma20) || latest.ma20 === 0
      ? 0
      : ((latest.close - latest.ma20) / latest.ma20) * 100;
  const metrics = [
    { label: "전일 종가", value: formatKRW(previous.close), icon: Activity },
    { label: "거래량", value: formatNumber(latest.volume), icon: BarChart3 },
    { label: "RSI 14", value: formatIndicator(latest.rsi), icon: Gauge },
    { label: "MACD", value: formatIndicator(latest.macd), icon: TrendingUp }
  ];

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            핵심 지표
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">핵심 지표</h2>
        </div>
        <span className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${changeBgClass(stock.change)}`}>
          {formatPercent(stock.changeRate)}
        </span>
      </div>

      <div className="mt-4 grid gap-2">
        {metrics.map(({ label, value, icon: Icon }) => (
          <div
            key={label}
            className="flex max-w-full items-center justify-between gap-3 rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50"
          >
            <span className="flex min-w-0 items-center gap-2 text-sm font-semibold text-slate-500 dark:text-slate-400">
              <Icon className="h-4 w-4" />
              {label}
            </span>
            <span className="shrink-0 text-sm font-bold text-ink dark:text-white">{value}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-bold text-slate-400">20일선 이격도</span>
          <span className={`text-sm font-bold ${changeColorClass(ma20Gap)}`}>
            {formatPercent(ma20Gap)}
          </span>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${ma20Gap >= 0 ? "bg-danger" : "bg-down"}`}
            style={{ width: `${Math.max(8, Math.min(100, Math.abs(ma20Gap) * 12))}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs font-bold">
        <span className="rounded-md bg-slate-100 px-2 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {translateStatus(bias.trend)}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {translateStatus(bias.momentum)}
        </span>
        <span className="rounded-md bg-slate-100 px-2 py-2 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          {translateStatus(bias.macd)}
        </span>
      </div>
    </section>
  );
}
