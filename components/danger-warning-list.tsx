import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState } from "@/components/ui-states";
import { WatchlistButton } from "@/components/watchlist-button";
import { getRiskLabelClass, type DangerWarningItem } from "@/lib/insights";
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
    const list = value.map((item) => safeText(item, "")).filter(Boolean).slice(0, 6);
    return list.length > 0 ? list : fallback;
  }
  if (typeof value === "string") return [value];
  return fallback;
}

export function DangerWarningList({
  items,
  title = "위험 경고 종목",
  compact = false
}: {
  items: DangerWarningItem[];
  title?: string;
  compact?: boolean;
}) {
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
            level: safeText(item.level, "보통"),
            signals: safeTextList(item.signals, ["두드러진 고위험 신호 없음"]),
            cautionReason: safeText(
              item.cautionReason,
              "일별 종가 기준 위험 신호를 다시 확인합니다."
            ),
            recheckCriteria: safeText(
              item.recheckCriteria,
              "MA20, RSI, 거래량 변화를 재확인합니다."
            ),
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
          <p className="text-xs font-bold uppercase tracking-normal text-danger dark:text-red-300">
            위험 경고
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{title}</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            data.go.kr 일별 종가 기준 위험 관찰 정보이며 실시간 거래 신호가 아닙니다.
          </p>
        </div>
        <AlertTriangle className="h-5 w-5 text-danger dark:text-red-300" />
      </div>

      {safeItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            title="아직 표시할 위험 경고 종목이 없습니다."
            description="현재 표시할 고위험 관찰 항목이 없습니다."
            icon={AlertTriangle}
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
                {!compact && <WatchlistButton symbol={item.code} stockName={item.name} compact />}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
                    item.level as DangerWarningItem["level"]
                  )}`}
                >
                  위험 점수 {item.score}/100
                </span>
                <span
                  className={`rounded-md border px-2 py-1 text-xs font-bold ${getRiskLabelClass(
                    item.level as DangerWarningItem["level"]
                  )}`}
                >
                  {item.level}
                </span>
              </div>

              <div className="mt-3 grid gap-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">위험 신호: </span>
                  {item.signals.map((signal, index) => (
                    <span key={`${item.code}-signal-${index}`}>
                      {index > 0 ? " · " : ""}
                      {signal}
                    </span>
                  ))}
                </p>
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">주의 이유: </span>
                  {item.cautionReason}
                </p>
                <p>
                  <span className="font-bold text-slate-800 dark:text-white">재확인 기준: </span>
                  {item.recheckCriteria}
                </p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
