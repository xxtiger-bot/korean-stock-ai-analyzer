import { Sparkles } from "lucide-react";
import {
  calculatePotentialRadarItem,
  getRiskLabelClass
} from "@/lib/insights";
import { formatKRW } from "@/lib/format";
import type { Stock } from "@/lib/types";

function getPotentialBarClass(score: number) {
  if (score >= 80) return "bg-emerald-500";
  if (score >= 60) return "bg-blue-500";
  if (score >= 40) return "bg-amber-500";
  return "bg-slate-400";
}

export function PotentialScoreCard({ stock }: { stock: Stock }) {
  const item = calculatePotentialRadarItem(stock);

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
              {item.score}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-400">잠재 등급</p>
            <span className="mt-1 inline-flex rounded-md border border-line bg-white px-3 py-1.5 text-xs font-bold text-ink dark:border-dark-line dark:bg-dark-panel dark:text-white">
              {item.level}
            </span>
          </div>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          <div
            className={`h-full rounded-full ${getPotentialBarClass(item.score)}`}
            style={{ width: `${item.score}%` }}
          />
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
        <p>
          <span className="font-bold text-slate-800 dark:text-white">최근 종가: </span>
          {formatKRW(stock.price)}
        </p>
        <p>
          <span className="font-bold text-slate-800 dark:text-white">발굴 이유: </span>
          {item.reasons.join(" · ")}
        </p>
        <p>
          <span className="font-bold text-slate-800 dark:text-white">관찰 포인트: </span>
          {item.observationPoints.join(" · ")}
        </p>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
            item.riskLevel
          )}`}
        >
          위험도 {item.riskLevel}
        </span>
        <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          {item.dataSource} · {item.updatedAt}
        </span>
      </div>
    </section>
  );
}
