import { Sparkles } from "lucide-react";
import {
  calculatePotentialRadarItem,
  getRiskLabelClass
} from "@/lib/insights";
import { formatKRW } from "@/lib/format";
import type { Stock } from "@/lib/types";

function safeText(value: unknown, fallback = "-"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (Array.isArray(value)) return value.map((item) => safeText(item, "")).filter(Boolean).join(" · ") || fallback;
  if (typeof value === "object" && value !== null) {
    return Object.values(value).map((item) => safeText(item, "")).filter(Boolean).join(" · ") || fallback;
  }
  return fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeTextList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const list = value.map((item) => safeText(item, "")).filter(Boolean).slice(0, 5);
    return list.length > 0 ? list : fallback;
  }
  if (typeof value === "string") return [value];
  return fallback;
}

function getPotentialBarClass(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-slate-400";
}

export function PotentialScoreCard({ stock }: { stock: Stock }) {
  const item = calculatePotentialRadarItem(stock);
  const score = safeNumber(item.score);
  const reasons = safeTextList(item.reasons, ["잠재 신호를 확인할 일별 데이터가 부족합니다."]);
  const observationPoints = safeTextList(item.observationPoints, [
    "MA20, 거래량, RSI 흐름을 다시 확인합니다."
  ]);
  const level = safeText(item.level, "중립 관찰");
  const riskLevel = safeText(item.riskLevel, "보통");
  const dataSource = safeText(item.dataSource, "data.go.kr 일별 종가");
  const updatedAt = safeText(item.updatedAt, "일별 종가 기준");

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            잠재 점수
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
            잠재 점수 카드
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            data.go.kr 일별 종가 기준 참고 정보입니다.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-brand" />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400">잠재 점수</p>
            <p className="mt-1 text-3xl font-bold text-ink dark:text-white">
              {score}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-400">잠재 등급</p>
            <span className="mt-1 inline-flex rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink dark:border-dark-line dark:bg-dark-panel dark:text-white">
              {level}
            </span>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${getPotentialBarClass(score)}`}
            style={{ width: `${score}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
        <p>
          <span className="font-bold text-slate-800 dark:text-white">최근 종가: </span>
          {formatKRW(safeNumber(stock.price))}
        </p>
        <p>
          <span className="font-bold text-slate-800 dark:text-white">발굴 이유: </span>
          {reasons.map((reason, index) => (
            <span key={`detail-potential-reason-${index}`}>
              {index > 0 ? " · " : ""}
              {reason}
            </span>
          ))}
        </p>
        <p>
          <span className="font-bold text-slate-800 dark:text-white">관찰 포인트: </span>
          {observationPoints.map((point, index) => (
            <span key={`detail-potential-watch-${index}`}>
              {index > 0 ? " · " : ""}
              {point}
            </span>
          ))}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
            riskLevel as ReturnType<typeof calculatePotentialRadarItem>["riskLevel"]
          )}`}
        >
          위험도 {riskLevel}
        </span>
        <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          {dataSource} · {updatedAt}
        </span>
      </div>
    </section>
  );
}
