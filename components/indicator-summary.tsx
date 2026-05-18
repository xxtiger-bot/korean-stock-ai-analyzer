"use client";

import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { EmptyState } from "@/components/ui-states";
import { getIndicatorBias } from "@/lib/indicators";
import { formatKRW } from "@/lib/format";
import type { TechnicalPoint } from "@/lib/types";

function translateStatus(value: string) {
  return value
    .replace("bullish", "강세")
    .replace("bearish", "약세")
    .replace("neutral", "중립");
}

export function IndicatorSummary({ series }: { series: TechnicalPoint[] }) {
  const safeSeries = Array.isArray(series) ? series : [];
  const latest = safeSeries[safeSeries.length - 1];

  if (!latest) {
    return (
      <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <EmptyState
          compact
          title="기술 지표 없음"
          description="표시할 MA, RSI, MACD 데이터가 없습니다."
        />
      </section>
    );
  }

  const bias = getIndicatorBias(latest);
  const visible = safeSeries.slice(-64);

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">
            기술 지표
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">기술 지표</h2>
        </div>
        <div className="grid grid-cols-3 gap-2 text-center text-xs font-bold">
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
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-5">
        {[
          ["MA5", latest.ma5],
          ["MA20", latest.ma20],
          ["MA60", latest.ma60],
          ["RSI", latest.rsi],
          ["MACD", latest.macd]
        ].map(([label, value]) => (
          <div
            key={label as string}
            className="max-w-full rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
          >
            <p className="text-xs font-bold text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-bold text-ink dark:text-white">
              {typeof value === "number"
                ? label === "RSI" || label === "MACD"
                  ? value.toFixed(2)
                  : formatKRW(value)
                : "-"}
            </p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid max-w-full gap-5 lg:grid-cols-2">
        <div className="h-56 max-w-full rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
          <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">RSI 14</p>
          <ResponsiveContainer width="100%" height="86%">
            <ComposedChart data={visible}>
              <CartesianGrid stroke="#dfe6ee" strokeDasharray="4 6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value) => String(value).slice(5)} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={34} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #dfe6ee",
                  fontSize: 12
                }}
                formatter={(value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "-")}
              />
              <ReferenceLine y={70} stroke="#e23b3b" strokeDasharray="4 5" />
              <ReferenceLine y={30} stroke="#2563eb" strokeDasharray="4 5" />
              <Line
                dataKey="rsi"
                dot={false}
                stroke="#1769ff"
                strokeWidth={2}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <div className="h-56 max-w-full rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
          <p className="mb-2 text-xs font-bold text-slate-500 dark:text-slate-400">MACD</p>
          <ResponsiveContainer width="100%" height="86%">
            <ComposedChart data={visible}>
              <CartesianGrid stroke="#dfe6ee" strokeDasharray="4 6" />
              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(value) => String(value).slice(5)} />
              <YAxis tick={{ fontSize: 10 }} width={42} />
              <Tooltip
                contentStyle={{
                  borderRadius: 8,
                  border: "1px solid #dfe6ee",
                  fontSize: 12
                }}
                formatter={(value) => (Number.isFinite(Number(value)) ? Number(value).toFixed(2) : "-")}
              />
              <Bar dataKey="macdHistogram" fill="#94a3b8" radius={[2, 2, 0, 0]} />
              <Line dataKey="macd" dot={false} stroke="#e23b3b" strokeWidth={2} type="monotone" />
              <Line
                dataKey="macdSignal"
                dot={false}
                stroke="#1769ff"
                strokeWidth={2}
                type="monotone"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
