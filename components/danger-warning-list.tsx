import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui-states";

export function DangerWarningList() {
  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-danger dark:text-red-300">
            위험 경고
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
            위험 경고 종목
          </h2>
        </div>
        <AlertTriangle className="h-5 w-5 text-danger dark:text-red-300" />
      </div>

      <div className="mt-3">
        <EmptyState
          compact
          title="아직 표시할 위험 경고 종목이 없습니다."
          description="위험 경고 모듈은 현재 안전 점검 모드입니다."
          icon={AlertTriangle}
        />
      </div>
    </section>
  );
}
