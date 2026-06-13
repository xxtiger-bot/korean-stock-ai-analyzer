"use client";

import { RefreshCw } from "lucide-react";
import type { ResolvedStockDisplayPrice } from "@/lib/market/price-resolver";

function formatKstLabel(value: string | null | undefined, prefix: string) {
  if (!value) return `${prefix} 확인 중`;
  return value.includes("KST") ? `${prefix} ${value}` : `${prefix} ${value} KST`;
}

function getBannerCopy(resolvedPrice: ResolvedStockDisplayPrice) {
  if (resolvedPrice.priceKind === "kis_current") {
    return {
      heading: "현재가 기준",
      primary: "KIS 기준",
      secondary: formatKstLabel(resolvedPrice.updatedAt, "업데이트"),
      helper: ""
    };
  }

  if (resolvedPrice.priceKind === "recent_close") {
    return {
      heading: "최근 종가 기준",
      primary: "최근 종가 기준",
      secondary: `data.go.kr 기준 · 기준일 ${resolvedPrice.baseDate ?? "확인 중"}`,
      helper: "실시간 현재가는 잠시 후 다시 확인됩니다.",
      tertiary: "차트와 기술지표도 같은 기준일 데이터를 사용합니다."
    };
  }

  if (resolvedPrice.priceKind === "external_reference") {
    return {
      heading: "참고 현재가",
      primary: "외부 참고 기준",
      secondary: formatKstLabel(resolvedPrice.updatedAt, "업데이트"),
      helper: "현재 사용 가능한 참고 가격 데이터입니다.",
      subHelper: "공식 KIS 실시간 시세가 아닙니다."
    };
  }

  return {
    heading: "가격 데이터 대기 중",
    primary: "잠시 후 다시 확인됩니다.",
    secondary: "데이터 대기 중",
    helper: "현재가와 최근 종가 데이터를 다시 확인하고 있습니다."
  };
}

export function DataStatusBanner({
  resolvedPrice
}: {
  resolvedPrice: ResolvedStockDisplayPrice;
}) {
  const copy = getBannerCopy(resolvedPrice);
  const toneClass =
    resolvedPrice.priceKind === "kis_current"
      ? "border-brand/20 bg-blue-50/80 text-slate-700 dark:border-brand/30 dark:bg-blue-950/20 dark:text-slate-200"
      : resolvedPrice.priceKind === "recent_close"
        ? "border-amber-200 bg-amber-50/80 text-slate-700 dark:border-amber-500/30 dark:bg-amber-950/20 dark:text-slate-200"
        : "border-slate-200 bg-slate-50 text-slate-700 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-200";
  const buttonLabel =
    resolvedPrice.priceKind === "unavailable" ? "다시 확인하기" : "데이터 새로고침";

  return (
    <div className={`mt-4 rounded-lg border px-3 py-3 ${toneClass}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">
            데이터 상태
          </p>
          <p className="mt-1 text-sm font-bold leading-6">{copy.heading}</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {copy.primary}
          </p>
          {copy.secondary ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {copy.secondary}
            </p>
          ) : null}
          {"subHelper" in copy && copy.subHelper ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {copy.subHelper}
            </p>
          ) : null}
          {copy.helper ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {copy.helper}
            </p>
          ) : null}
          {"tertiary" in copy && copy.tertiary ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {copy.tertiary}
            </p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-xs font-bold text-slate-600 transition hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          {buttonLabel}
        </button>
      </div>
    </div>
  );
}
