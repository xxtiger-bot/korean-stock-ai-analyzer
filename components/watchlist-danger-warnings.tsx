"use client";

import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { DangerWarningList } from "@/components/danger-warning-list";
import { getDangerWarnings } from "@/lib/insights";
import type { Stock } from "@/lib/types";

export function WatchlistDangerWarnings({ stocks }: { stocks: Stock[] }) {
  const safeStocks = Array.isArray(stocks) ? stocks : [];
  const warnings = getDangerWarnings(safeStocks);

  if (safeStocks.length === 0) {
    return (
      <section className="mt-4 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
        <EmptyState
          compact
          title="내 관심종목 위험 경고"
          description="관심종목을 추가하면 일별 종가 기준 위험 관찰 항목을 정리해드립니다."
          icon={AlertTriangle}
        />
      </section>
    );
  }

  return (
    <div className="mt-4">
      <DangerWarningList items={warnings} title="내 관심종목 위험 경고" compact />
    </div>
  );
}
