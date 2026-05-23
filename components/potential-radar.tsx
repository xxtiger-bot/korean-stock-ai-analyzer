import Link from "next/link";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { WatchlistButton } from "@/components/watchlist-button";
import { getRiskLabelClass, type PotentialRadarItem } from "@/lib/insights";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeText(value: unknown, fallback = "-"): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "확인됨" : "미확인";
  if (Array.isArray(value)) {
    const text: string = value.map((item) => safeText(item, "")).filter(Boolean).join(" · ");
    return text || fallback;
  }
  if (isRecord(value)) {
    const text: string = Object.values(value).map((item) => safeText(item, "")).filter(Boolean).join(" · ");
    return text || fallback;
  }
  return fallback;
}

function safeNumber(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeTextList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const list = value.map((item) => safeText(item, "")).filter(Boolean).slice(0, 5);
    return list.length > 0 ? list : fallback;
  }
  if (typeof value === "string") return [value];
  return fallback;
}

function getPotentialLabelClass(score: number) {
  if (score >= 80) {
    return "border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200";
  }
  if (score >= 60) {
    return "border-blue-200 bg-blue-100 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";
  }
  if (score >= 40) {
    return "border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200";
  }
  return "border-slate-200 bg-slate-100 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300";
}

export function PotentialRadar({ items }: { items: PotentialRadarItem[] }) {
  const safeItems = Array.isArray(items)
    ? items
        .filter((item) => item && isRecord(item) && isRecord(item.stock))
        .map((item) => {
          const stock = item.stock as Record<string, unknown>;
          return {
            code: safeText(stock.symbol, ""),
            name: safeText(stock.koreanName ?? stock.name ?? stock.symbol, "종목명 확인 필요"),
            price: safeNumber(stock.price),
            change: safeNumber(stock.change),
            changeRate: safeNumber(stock.changeRate),
            score: safeNumber(item.score),
            level: safeText(item.level, "중립 관찰"),
            riskLevel: safeText(item.riskLevel, "보통"),
            reasons: safeTextList(item.reasons, ["잠재 신호를 확인할 일별 데이터가 부족합니다."]),
            observationPoints: safeTextList(item.observationPoints, [
              "MA20, 거래량, RSI 흐름을 다시 확인합니다."
            ]),
            dataSource: safeText(item.dataSource, "data.go.kr 일별 종가"),
            updatedAt: safeText(item.updatedAt, "일별 종가 기준")
          };
        })
        .filter((item) => item.code)
    : [];

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
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            data.go.kr 일별 종가 기준 참고 분석이며 실시간 거래 신호가 아닙니다.
          </p>
        </div>
        <Sparkles className="h-5 w-5 text-brand" />
      </div>

      {safeItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            title="아직 표시할 잠재 후보가 없습니다."
            description="일별 종가 기준 잠재 신호가 충분한 종목이 아직 없습니다."
            icon={Sparkles}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {safeItems.map((item) => (
            <article
              key={item.code}
              className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={`/stocks/${item.code}`}
                    className="truncate text-base font-bold text-ink hover:text-brand dark:text-white"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {item.code} · 최근 종가 {formatKRW(item.price)}
                    <span className={`ml-2 ${changeColorClass(item.change)}`}>
                      {formatPercent(item.changeRate)}
                    </span>
                  </p>
                  <p className="mt-1 text-[11px] font-bold text-slate-400">
                    데이터 출처: {item.dataSource} · {item.updatedAt}
                  </p>
                </div>
                <WatchlistButton symbol={item.code} stockName={item.name} compact />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getPotentialLabelClass(
                    item.score
                  )}`}
                >
                  잠재 점수 {item.score}/100
                </span>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getPotentialLabelClass(
                    item.score
                  )}`}
                >
                  {item.level}
                </span>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
                    item.riskLevel as PotentialRadarItem["riskLevel"]
                  )}`}
                >
                  위험도 {item.riskLevel}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">발굴 이유: </span>
                  {item.reasons.map((reason, index) => (
                    <span key={`${item.code}-reason-${index}`}>
                      {index > 0 ? " · " : ""}
                      {reason}
                    </span>
                  ))}
                </p>
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">관찰 포인트: </span>
                  {item.observationPoints.map((point, index) => (
                    <span key={`${item.code}-watch-${index}`}>
                      {index > 0 ? " · " : ""}
                      {point}
                    </span>
                  ))}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
