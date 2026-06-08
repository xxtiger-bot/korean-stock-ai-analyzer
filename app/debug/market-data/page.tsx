import type { Metadata } from "next";
<<<<<<< HEAD
import { MarketDataDebugClient } from "@/components/market-data-debug-client";
import { getMarketDataDebugSnapshot } from "@/lib/market-data-debug";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
=======
import { resolveStockDisplayPrice } from "@/lib/market/price-resolver";
import { formatKRW } from "@/lib/format";
import {
  getKoreaStockApiSource,
  getRealtimeQuote,
  getStockDataProviderMode,
  getStockDetail
} from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Debug Market Data | KRX Insight",
  description: "가격 결정 결과와 KIS / data.go.kr 기준을 점검하는 내부 진단 페이지",
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
  robots: {
    index: false,
    follow: false
  }
};

<<<<<<< HEAD
export default async function MarketDataDebugPage() {
  const snapshot = await getMarketDataDebugSnapshot();
  return <MarketDataDebugClient initialSnapshot={snapshot} />;
=======
type DebugStockSeed = {
  symbol: string;
  koreanName: string;
};

type DebugStockRecord = DebugStockSeed & {
  rawStock: Awaited<ReturnType<typeof getStockDetail>> | null;
  rawQuote: Awaited<ReturnType<typeof getRealtimeQuote>> | null;
  resolved: ReturnType<typeof resolveStockDisplayPrice>;
};

const testStocks: DebugStockSeed[] = [
  { symbol: "005930", koreanName: "삼성전자" },
  { symbol: "000660", koreanName: "SK하이닉스" },
  { symbol: "035420", koreanName: "NAVER" }
];

function normalizePriceText(value: number | null | undefined) {
  return Number.isFinite(value ?? NaN) && (value ?? 0) > 0 ? formatKRW(value as number) : "가격 데이터 없음";
}

function formatOptionalText(value: string | null | undefined) {
  const text = typeof value === "string" ? value.trim() : "";
  return text.length > 0 ? text : "-";
}

function formatProviderMode(value: string) {
  if (value === "real") return "real";
  if (value === "mock") return "mock";
  return value || "-";
}

function getStatusBadge(resolvedPriceKind: ReturnType<typeof resolveStockDisplayPrice>["priceKind"]) {
  if (resolvedPriceKind === "kis_current") {
    return {
      label: "PASS",
      className:
        "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
    };
  }

  if (resolvedPriceKind === "recent_close") {
    return {
      label: "FALLBACK",
      className:
        "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
    };
  }

  return {
    label: "UNAVAILABLE",
    className:
      "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
  };
}

async function loadDebugStock(seed: DebugStockSeed): Promise<DebugStockRecord> {
  const [rawStock, rawQuote] = await Promise.all([
    getStockDetail(seed.symbol),
    getRealtimeQuote(seed.symbol)
  ]);

  const resolved = resolveStockDisplayPrice({
    symbol: seed.symbol,
    kisQuote: rawQuote
      ? {
          price: rawQuote.price,
          updatedAt: rawQuote.asOf,
          asOf: rawQuote.asOf,
          change: rawQuote.change,
          changeRate: rawQuote.changeRate,
          volume: rawQuote.volume
        }
      : null,
    dailyClose: rawStock
      ? {
          price: rawStock.price,
          baseDate: rawStock.date,
          updatedAt: rawStock.date,
          asOf: rawStock.date
        }
      : null,
    cachedPrice: rawStock?.price ?? null,
    market: rawStock?.market ?? null
  });

  return {
    ...seed,
    rawStock: rawStock ?? null,
    rawQuote: rawQuote ?? null,
    resolved
  };
}

function KeyValueRow({
  label,
  value,
  valueClassName = ""
}: {
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm dark:border-slate-700/80 dark:bg-slate-900/70">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className={`mt-1 text-sm font-semibold text-slate-900 dark:text-white ${valueClassName}`}>
        {value}
      </div>
    </div>
  );
}

function SectionHeading({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
        Debug market-data
      </div>
      <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-4xl">
        {title}
      </h1>
      <p className="max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
        {description}
      </p>
    </div>
  );
}

function DebugStockCard({ record }: { record: DebugStockRecord }) {
  const badge = getStatusBadge(record.resolved.priceKind);
  const stockName = record.rawStock?.koreanName || record.rawStock?.name || record.koreanName;
  const rawKisStatus = record.rawQuote ? "ok" : "unavailable";
  const rawKisPrice = record.rawQuote?.price ?? null;
  const rawKisUpdatedAt = record.rawQuote?.asOf ?? null;
  const rawRecentClose = record.rawStock?.price ?? null;
  const rawBaseDate = record.rawStock?.date ?? null;
  const cachedPrice = record.rawStock?.price ?? null;

  return (
    <article className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_24px_60px_rgba(15,23,42,0.12)] dark:border-slate-700/80 dark:bg-slate-900/70">
      <div className="flex flex-col gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-700/70 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
            {stockName}
          </div>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
            {record.symbol}
          </h2>
        </div>
        <span
          className={`inline-flex w-fit items-center rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${badge.className}`}
        >
          {badge.label}
        </span>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-4 shadow-sm dark:border-slate-700/80 dark:bg-slate-950/40">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">원본 입력</h3>
          <div className="mt-3 grid gap-3">
            <KeyValueRow label="symbol" value={record.symbol} />
            <KeyValueRow label="stock name" value={stockName} />
            <KeyValueRow label="KIS quote status" value={rawKisStatus} />
            <KeyValueRow
              label="KIS raw price"
              value={rawKisPrice !== null ? formatKRW(rawKisPrice) : "-"}
            />
            <KeyValueRow label="KIS updatedAt" value={formatOptionalText(rawKisUpdatedAt)} />
            <KeyValueRow
              label="data.go.kr recent close"
              value={rawRecentClose !== null ? formatKRW(rawRecentClose) : "-"}
            />
            <KeyValueRow label="data.go.kr baseDate" value={formatOptionalText(rawBaseDate)} />
            <KeyValueRow
              label="cached price"
              value={cachedPrice !== null ? formatKRW(cachedPrice) : "-"}
            />
          </div>
        </section>

        <section className="rounded-3xl border border-sky-200/70 bg-sky-50/60 p-4 shadow-sm dark:border-sky-500/20 dark:bg-sky-500/10">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">resolvedPrice</h3>
          <div className="mt-3 grid gap-3">
            <KeyValueRow
              label="displayPrice"
              value={normalizePriceText(record.resolved.displayPrice)}
              valueClassName={record.resolved.displayPrice !== null ? "text-slate-950 dark:text-white" : "text-rose-600 dark:text-rose-300"}
            />
            <KeyValueRow label="priceKind" value={record.resolved.priceKind} />
            <KeyValueRow label="source" value={record.resolved.source} />
            <KeyValueRow label="labelKo" value={record.resolved.labelKo} />
            <KeyValueRow label="basisKo" value={record.resolved.basisKo} />
            <KeyValueRow label="isRealtime" value={record.resolved.isRealtime ? "true" : "false"} />
            <KeyValueRow label="isFallback" value={record.resolved.isFallback ? "true" : "false"} />
            <KeyValueRow
              label="isUsableForAi"
              value={record.resolved.isUsableForAi ? "true" : "false"}
            />
            <KeyValueRow label="aiConfidence" value={record.resolved.aiConfidence} />
            <KeyValueRow label="warningKo" value={formatOptionalText(record.resolved.warningKo)} />
            <KeyValueRow label="reason" value={record.resolved.reason} />
          </div>
        </section>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <KeyValueRow
          label="display summary"
          value={
            record.resolved.priceKind === "kis_current"
              ? "PASS · KIS 기준"
              : record.resolved.priceKind === "recent_close"
                ? "FALLBACK · 최근 종가 참고"
                : "UNAVAILABLE · 데이터 일시 불가"
          }
        />
        <KeyValueRow
          label="ai safety"
          value={
            record.resolved.isUsableForAi
              ? "AI 사용 가능"
              : "AI 참고만 가능 / 확정 판단 금지"
          }
        />
        <KeyValueRow
          label="basis"
          value={
            record.resolved.priceKind === "kis_current"
              ? "KIS 기준"
              : record.resolved.priceKind === "recent_close"
                ? "최근 종가 기준"
                : "데이터 없음"
          }
        />
      </div>

      {record.resolved.warningKo ? (
        <div className="mt-4 rounded-3xl border border-amber-200/80 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 shadow-sm dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200">
          {record.resolved.warningKo}
        </div>
      ) : null}
    </article>
  );
}

export default async function DebugMarketDataPage() {
  const stockProviderMode = getStockDataProviderMode();
  const apiSource = getKoreaStockApiSource();
  const realtimeProvider = process.env.REALTIME_STOCK_PROVIDER?.trim() === "kis" ? "kis" : "none";
  const records = await Promise.all(testStocks.map((stock) => loadDebugStock(stock)));

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-100 px-4 py-6 text-slate-900 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 dark:text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <SectionHeading
          title="가격 진단"
          description="KIS 현재가와 data.go.kr 최근 종가를 함께 비교해, 실제로 어떤 기준이 화면에 표시되는지 확인하는 내부 점검용 페이지입니다."
        />

        <section className="rounded-[28px] border border-slate-200/80 bg-white p-5 shadow-soft dark:border-slate-700/80 dark:bg-slate-900/70">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <KeyValueRow label="test symbols" value="005930 · 000660 · 035420" />
            <KeyValueRow label="resolver" value="resolveStockDisplayPrice()" />
            <KeyValueRow label="stock data provider" value={formatProviderMode(stockProviderMode)} />
            <KeyValueRow label="api source" value={apiSource} />
            <KeyValueRow label="realtime provider" value={realtimeProvider} />
            <KeyValueRow label="purpose" value="가격 원본 / fallback / AI 사용 가능 여부 점검" />
          </div>
        </section>

        <div className="grid gap-5">
          {records.map((record) => (
            <DebugStockCard key={record.symbol} record={record} />
          ))}
        </div>
      </div>
    </main>
  );
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
}
