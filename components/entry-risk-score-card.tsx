import { AlertTriangle, Gauge, Info } from "lucide-react";
import {
  DISCLAIMER,
  calculateEntryRiskScore,
  getRiskLabelClass,
  getSignalLabelClass
} from "@/lib/insights";
import type { Stock } from "@/lib/types";

function toSimpleRiskLevel(score: number) {
  if (score >= 82) return "매우 높음";
  if (score >= 62) return "높음";
  if (score >= 38) return "보통";
  return "낮음";
}

function componentPercent(score: number, maxScore: number) {
  return Math.round((score / maxScore) * 100);
}

function formatComponentValue(value: string) {
  return value
    .replace("bullish", "강세")
    .replace("bearish", "약세")
    .replace("neutral", "중립")
    .replace("golden cross", "골든크로스")
    .replace("dead cross", "데드크로스");
}

export function EntryRiskScoreCard({ stock }: { stock: Stock }) {
  const risk = calculateEntryRiskScore(stock);
  const highlightedComponents = risk.components.filter((component) =>
    ["rsi", "macd", "recent_change"].includes(component.id)
  );

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            진입 위험도
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
            진입 위험도
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            데이터 업데이트 {risk.updatedAt}
          </p>
        </div>
        <Gauge className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-5 rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400">총점</p>
            <p className="mt-1 text-3xl font-bold text-ink dark:text-white">
              {risk.score}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-400">위험 등급</p>
            <span
              className={`mt-1 inline-flex rounded-md border px-3 py-1.5 text-xs font-bold ${getRiskLabelClass(
                risk.level
              )}`}
            >
              {toSimpleRiskLevel(risk.score)}
            </span>
          </div>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${
              risk.score >= 82
                ? "bg-red-500"
                : risk.score >= 62
                  ? "bg-orange-500"
                  : risk.score >= 38
                    ? "bg-amber-500"
                    : "bg-emerald-500"
            }`}
            style={{ width: `${risk.score}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-[11px] font-bold text-slate-400">
          <span>낮음</span>
          <span>보통</span>
          <span>높음</span>
          <span>매우 높음</span>
        </div>
      </div>

      <p className="mt-4 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
        {risk.summary}
      </p>

      <div className="mt-5 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
        <div className="flex items-start gap-2">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div>
            <p className="text-xs font-bold text-ink dark:text-white">점수 산정 기준</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {risk.methodology}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {highlightedComponents.map((component) => {
          const percent = componentPercent(component.score, component.maxScore);

          return (
            <div
              key={component.id}
              className="max-w-full rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-bold text-slate-400">{component.label}</p>
                  <p className="mt-1 truncate text-sm font-bold text-ink dark:text-white">
                    {formatComponentValue(component.value)}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-md border px-2 py-1 text-xs font-bold ${getSignalLabelClass(
                    component.tone
                  )}`}
                >
                  위험 {percent}%
                </span>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className={`h-full rounded-full ${
                    component.tone === "extreme"
                      ? "bg-red-500"
                      : component.tone === "high"
                        ? "bg-orange-500"
                        : component.tone === "medium"
                          ? "bg-blue-500"
                          : "bg-emerald-500"
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                {component.explanation}
              </p>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        이 점수는 관찰, 기다림, 신중함이 필요한 정도를 보여주는 참고 지표입니다. {DISCLAIMER}
      </div>
    </section>
  );
}
