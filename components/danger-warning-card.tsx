import { AlertTriangle } from "lucide-react";
import { calculateDangerWarningItem, getRiskLabelClass } from "@/lib/insights";
import { formatKRW } from "@/lib/format";
import type { Stock } from "@/lib/types";

export function DangerWarningCard({ stock }: { stock: Stock }) {
  const item = calculateDangerWarningItem(stock);

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-danger dark:text-red-300">
            위험 경고
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
            위험 경고 카드
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            data.go.kr 일별 종가 기준 위험 관찰 정보입니다.
          </p>
        </div>
        <AlertTriangle className="h-5 w-5 text-danger dark:text-red-300" />
      </div>

      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-bold text-slate-400">위험 점수</p>
            <p className="mt-1 text-3xl font-bold text-ink dark:text-white">
              {item.score}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-400">위험 등급</p>
            <span
              className={`mt-1 inline-flex rounded-md border px-3 py-1.5 text-xs font-bold ${getRiskLabelClass(
                item.level
              )}`}
            >
              {item.level}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
        <p>
          <span className="font-bold text-slate-800 dark:text-white">최근 종가: </span>
          {formatKRW(stock.price)}
        </p>
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

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        이 경고는 일별 종가 기반 참고 정보이며 실시간 거래 신호가 아닙니다. 관찰, 확인 필요, 리스크 관리 관점으로만 활용하세요.
      </p>
    </section>
  );
}
