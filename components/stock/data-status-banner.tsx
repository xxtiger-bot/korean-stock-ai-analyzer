"use client";

import type { ResolvedStockDisplayPrice } from "@/lib/market/price-resolver";

function getBannerCopy(resolvedPrice: ResolvedStockDisplayPrice) {
  if (resolvedPrice.priceKind === "kis_current") {
    return {
      primary: `현재가 · KIS 기준 · 업데이트 ${resolvedPrice.updatedAt ?? "확인 필요"}`,
      secondary: ""
    };
  }

  if (resolvedPrice.priceKind === "recent_close") {
    return {
      primary: `최근 종가 · data.go.kr 기준 · 기준일 ${
        resolvedPrice.baseDate ?? "확인 필요"
      }`,
      secondary: "실시간 시세가 아닙니다."
    };
  }

  return {
    primary: "가격 데이터 확인 필요",
    secondary: "데이터 출처 또는 가격 범위를 확인해야 합니다."
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

  return (
    <div className={`mt-4 rounded-lg border px-3 py-3 ${toneClass}`}>
      <p className="text-[11px] font-bold uppercase tracking-normal text-slate-500 dark:text-slate-400">
        데이터 기준
      </p>
      <p className="mt-1 text-sm font-bold leading-6">{copy.primary}</p>
      {copy.secondary ? (
        <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
          {copy.secondary}
        </p>
      ) : null}
    </div>
  );
}
