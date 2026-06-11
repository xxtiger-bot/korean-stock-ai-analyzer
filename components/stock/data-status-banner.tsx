"use client";

import { RefreshCw } from "lucide-react";
import type { ResolvedStockDisplayPrice } from "@/lib/market/price-resolver";

function getBannerCopy(resolvedPrice: ResolvedStockDisplayPrice) {
  if (resolvedPrice.priceKind === "kis_current") {
    return {
      heading: "현재가 기준",
      primary: "KIS 기준",
      secondary: `마지막 업데이트: ${resolvedPrice.updatedAt ?? "확인 필요"}`,
      helper: ""
    };
  }

  if (resolvedPrice.priceKind === "recent_close") {
    return {
      heading: "최근 종가 기준",
      primary: "data.go.kr 기준",
      secondary: `기준일: ${resolvedPrice.baseDate ?? "확인 필요"}`,
      helper: "KIS 현재가 연결 시 자동으로 현재가 기준으로 전환됩니다."
    };
  }

  return {
    heading: "가격 데이터 확인 필요",
    primary: "데이터 출처 또는 가격 범위를 확인해야 합니다.",
    secondary: "",
    helper: ""
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
            데이터 기준
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
          {resolvedPrice.warningKo && resolvedPrice.priceKind === "recent_close" ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {resolvedPrice.warningKo}
            </p>
          ) : null}
          {copy.helper ? (
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              {copy.helper}
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
