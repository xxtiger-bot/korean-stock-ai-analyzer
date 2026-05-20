import { Globe2 } from "lucide-react";
import { formatNumber } from "@/lib/format";
import type { ForeignOwnershipData } from "@/lib/types";

function formatRatio(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return `${value.toFixed(2)}%`;
}

function formatQty(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "확인 필요";
  }
  return `${formatNumber(value)}주`;
}

function formatLimitQty(value: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "외국인 한도수량 데이터 없음";
  }
  return `${formatNumber(value)}주`;
}

export function ForeignOwnershipCard({
  data
}: {
  data?: ForeignOwnershipData | null;
}) {
  const ratio = formatRatio(data?.foreignOwnershipRatio ?? null);
  const exhaustionRate = formatRatio(data?.foreignExhaustionRate ?? null);
  const mainValue = exhaustionRate ?? ratio;
  const mainLabel = exhaustionRate ? "외국인 소진율" : "외국인 보유율";
  const hasHoldingQty =
    typeof data?.foreignHoldingQty === "number" &&
    Number.isFinite(data.foreignHoldingQty) &&
    data.foreignHoldingQty > 0;
  const hasLimitQty =
    typeof data?.foreignLimitQty === "number" &&
    Number.isFinite(data.foreignLimitQty) &&
    data.foreignLimitQty > 0;
  const hasAnyValue =
    mainValue !== null || hasHoldingQty || hasLimitQty;

  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">
          외국인 보유율 / 소진율
        </p>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300">
          <Globe2 className="h-4 w-4" />
        </span>
      </div>

      {!hasAnyValue ? (
        <p className="mt-4 break-words text-sm font-semibold text-slate-500 dark:text-slate-400">
          외국인 보유율 데이터를 확인할 수 없습니다.
        </p>
      ) : (
        <>
          <p className="mt-3 text-xs font-bold text-slate-400">{mainLabel}</p>
          <p className="mt-4 break-words text-lg font-bold text-ink dark:text-white sm:text-xl">
            {mainValue ?? "데이터 없음"}
          </p>
          <div className="mt-2 grid gap-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <p className="break-words">외국인 보유수량 {formatQty(data?.foreignHoldingQty ?? null)}</p>
            <p className="break-words">외국인 한도수량 {formatLimitQty(data?.foreignLimitQty ?? null)}</p>
            <p className="break-words">외국인 소진율 {exhaustionRate ?? "확인 필요"}</p>
            <p className="break-words">기준 KIS</p>
          </div>
        </>
      )}
    </article>
  );
}
