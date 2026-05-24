import type { MarketSignal } from "@/lib/types";

export type MorningMarketDirection = "강세" | "약세" | "혼조" | "관망" | "데이터 확인 필요";

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export function resolveMarketDirection(signals: MarketSignal[]) {
  const safeSignals = Array.isArray(signals) ? signals : [];
  const kospi = safeSignals.find((item) => item.code === "KOSPI");
  const kosdaq = safeSignals.find((item) => item.code === "KOSDAQ");
  const kospiChange = safeNumber(kospi?.changeRate);
  const kosdaqChange = safeNumber(kosdaq?.changeRate);

  if (kospiChange === null || kosdaqChange === null) {
    return "데이터 확인 필요" as MorningMarketDirection;
  }

  if (Math.abs(kospiChange) <= 0.1 && Math.abs(kosdaqChange) <= 0.1) {
    return "관망" as MorningMarketDirection;
  }

  if (kospiChange > 0 && kosdaqChange > 0) {
    return "강세" as MorningMarketDirection;
  }

  if (kospiChange < 0 && kosdaqChange < 0) {
    return "약세" as MorningMarketDirection;
  }

  return "혼조" as MorningMarketDirection;
}

export function marketDirectionBadgeClass(direction: MorningMarketDirection) {
  if (direction === "강세") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (direction === "약세") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  }
  if (direction === "혼조") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  }
  if (direction === "관망") {
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-200";
  }
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200";
}
