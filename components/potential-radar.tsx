import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui-states";

export function PotentialRadar() {
  return (
    <section className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            AI 잠재주 레이더
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
            잠재 관찰 후보
          </h2>
        </div>
        <Sparkles className="h-5 w-5 text-brand" />
      </div>

      <div className="mt-3">
        <EmptyState
          compact
          title="아직 표시할 잠재 후보가 없습니다."
          description="잠재 신호 모듈은 현재 안전 점검 모드입니다."
          icon={Sparkles}
        />
      </div>
    </section>
  );
}
