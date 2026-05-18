import { AlertTriangle } from "lucide-react";
import { calculateDangerWarningItem, getRiskLabelClass } from "@/lib/insights";
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
    const list = value.map((item) => safeText(item, "")).filter(Boolean).slice(0, 6);
    return list.length > 0 ? list : fallback;
  }
  if (typeof value === "string") return [value];
  return fallback;
}

export function DangerWarningCard({ stock }: { stock: Stock }) {
  const item = calculateDangerWarningItem(stock);
  const score = safeNumber(item.score);
  const level = safeText(item.level, "보통");
  const signals = safeTextList(item.signals, ["두드러진 고위험 신호 없음"]);
  const cautionReason = safeText(
    item.cautionReason,
    "일별 종가 기준 위험 신호를 다시 확인합니다."
  );
  const recheckCriteria = safeText(
    item.recheckCriteria,
    "MA20, RSI, 거래량 변화를 재확인합니다."
  );

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
              {score}
              <span className="text-base text-slate-400">/100</span>
            </p>
          </div>
          <div className="text-left sm:text-right">
            <p className="text-xs font-bold text-slate-400">위험 등급</p>
            <span
              className={`mt-1 inline-flex rounded-md border px-3 py-1.5 text-xs font-bold ${getRiskLabelClass(
                level as ReturnType<typeof calculateDangerWarningItem>["level"]
              )}`}
            >
              {level}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
        <p>
          <span className="font-bold text-slate-800 dark:text-white">최근 종가: </span>
          {formatKRW(safeNumber(stock.price))}
        </p>
        <p>
          <span className="font-bold text-slate-800 dark:text-white">위험 신호: </span>
          {signals.map((signal, index) => (
            <span key={`detail-danger-signal-${index}`}>
              {index > 0 ? " · " : ""}
              {signal}
            </span>
          ))}
        </p>
        <p>
          <span className="font-bold text-slate-800 dark:text-white">주의 이유: </span>
          {cautionReason}
        </p>
        <p>
          <span className="font-bold text-slate-800 dark:text-white">재확인 기준: </span>
          {recheckCriteria}
        </p>
      </div>

      <p className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        이 경고는 일별 종가 기반 참고 정보이며 실시간 거래 신호가 아닙니다. 관찰, 확인 필요, 리스크 관리 관점으로만 활용하세요.
      </p>
    </section>
  );
}
