import type { ForeignOwnershipData, RealtimeQuote } from "@/lib/types";

function formatAsOf(value: string | undefined) {
  if (!value) return null;
  if (/^\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}$/.test(value)) return value;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;

  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(parsed);
}

export function DataAsOfNote({
  stockDate,
  realtimeQuote,
  foreignOwnership,
  className
}: {
  stockDate?: string;
  realtimeQuote?: RealtimeQuote | null;
  foreignOwnership?: ForeignOwnershipData | null;
  className?: string;
}) {
  const hasRealtimeQuote = Boolean(
    realtimeQuote && Number.isFinite(realtimeQuote.price) && realtimeQuote.price > 0
  );
  const realtimeAsOf = formatAsOf(realtimeQuote?.asOf);
  const foreignAsOf = formatAsOf(foreignOwnership?.updatedAt);

  return (
    <div
      className={`rounded-md border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-semibold leading-5 text-indigo-900 dark:border-indigo-900/60 dark:bg-indigo-950/40 dark:text-indigo-100 ${className ?? ""}`}
    >
      <p>기술지표 기준: {stockDate ? `${stockDate} 일별 종가` : "data.go.kr 일별 종가"}</p>
      <p>
        현재가 기준:{" "}
        {hasRealtimeQuote
          ? `KIS${realtimeAsOf ? ` (${realtimeAsOf})` : ""}`
          : "KIS 확인 불가 · data.go.kr 최근 종가 참고"}
      </p>
      {foreignOwnership ? (
        <p>외국인 수급 기준: KIS{foreignAsOf ? ` (${foreignAsOf})` : ""}</p>
      ) : null}
    </div>
  );
}
