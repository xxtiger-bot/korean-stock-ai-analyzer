"use client";

import { useState } from "react";
import { FileText, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui-states";
import { DATA_UPDATED_AT, DISCLAIMER } from "@/lib/insights";
import { formatKRW } from "@/lib/format";
import type {
  AiReport,
  ForeignOwnershipData,
  PriceGuard,
  RealtimeQuote,
  Stock
} from "@/lib/types";

type AnalysisResponse = {
  source: "openai" | "local";
  generatedAt: string;
  report: AiReport;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "확인됨" : "미확인";
  if (Array.isArray(value)) {
    const text = value.map((item) => toText(item, "")).filter(Boolean).join("\n");
    return text || fallback;
  }
  if (isRecord(value)) {
    const text = Object.values(value).map((item) => toText(item, "")).filter(Boolean).join("\n");
    return text || fallback;
  }
  return fallback;
}

function toTextList(value: unknown, fallback: string[]): string[] {
  if (Array.isArray(value)) {
    const list = value.map((item) => toText(item, "")).filter(Boolean).slice(0, 6);
    return list.length > 0 ? list : fallback;
  }

  if (typeof value === "string") return [value];
  if (isRecord(value)) {
    const list = Object.values(value).map((item) => toText(item, "")).filter(Boolean).slice(0, 6);
    return list.length > 0 ? list : fallback;
  }

  return fallback;
}

function normalizeReport(report: unknown): AiReport {
  const source = isRecord(report) ? report : {};
  const fallbackRisks = ["리스크 정보를 표시할 데이터가 부족합니다."];
  const risks = toTextList(source.risks ?? source.risk, fallbackRisks);

  return {
    trend: toText(source.trend, "분석 데이터가 부족합니다."),
    technical: toText(source.technical, "기술적 근거를 표시할 데이터가 부족합니다."),
    risk: toText(source.risk ?? source.risks, risks.join("\n")),
    risks,
    watchPoints: toTextList(source.watchPoints, ["관찰 포인트를 표시할 데이터가 부족합니다."]),
    shortTermCheckPoints: toTextList(source.shortTermCheckPoints, [
      "단기 체크 포인트를 표시할 데이터가 부족합니다."
    ])
  };
}

function normalizeAnalysisResponse(payload: unknown): AnalysisResponse {
  const source = isRecord(payload) ? payload : {};

  return {
    source: source.source === "openai" ? "openai" : "local",
    generatedAt:
      typeof source.generatedAt === "string" ? source.generatedAt : new Date().toISOString(),
    report: normalizeReport(source.report)
  };
}

function formatGeneratedAt(value: unknown) {
  if (typeof value !== "string") return "생성 시간 확인 필요";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "생성 시간 확인 필요" : date.toLocaleString("ko-KR");
}

function formatForeignOwnershipRatio(data?: ForeignOwnershipData | null) {
  const ratio = data?.foreignOwnershipRatio;
  if (typeof ratio === "number" && Number.isFinite(ratio)) {
    return `${ratio.toFixed(2)}%`;
  }
  return "확인 필요";
}

export function AiReportCard({
  stock,
  foreignOwnership,
  realtimeQuote,
  priceGuard
}: {
  stock: Stock;
  foreignOwnership?: ForeignOwnershipData | null;
  realtimeQuote?: RealtimeQuote | null;
  priceGuard?: PriceGuard | null;
}) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const hasRealtimePrice = Boolean(
    realtimeQuote && Number.isFinite(realtimeQuote.price) && realtimeQuote.price > 0
  );
  const currentPrice = hasRealtimePrice ? realtimeQuote!.price : stock.price;
  const reportSourceText = hasRealtimePrice
    ? "본 분석의 현재가는 KIS 기준이며, K선과 기술지표는 data.go.kr 일별 종가 데이터를 기준으로 생성되었습니다."
    : "현재가 대신 data.go.kr 최근 종가를 기준으로 표시합니다. K선과 기술지표는 data.go.kr 일별 종가 데이터를 기준으로 생성되었습니다.";
  const hasPriceAnomaly =
    priceGuard?.status === "warning" || priceGuard?.status === "critical";
  const priceAnomalyNote = hasPriceAnomaly
    ? "현재가 데이터 차이가 커서 보수적으로 해석해야 합니다."
    : "";

  async function generateReport() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/analysis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol: stock.symbol })
      });

      if (!response.ok) {
        throw new Error("report failed");
      }

      const payload = await response.json().catch(() => null);
      setData(normalizeAnalysisResponse(payload));
    } catch {
      setError("리포트 생성 실패");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            증권 분석
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
            AI 분석 리포트
          </h2>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            추세 · 기술적 근거 · 위험 · 관찰 포인트
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            데이터 업데이트 {DATA_UPDATED_AT}
          </p>
          {stock.date && (
            <p className="mt-1 text-xs font-semibold text-slate-400">
              데이터 기준일 {stock.date} 기준
            </p>
          )}
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
            {reportSourceText}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
            현재가 {formatKRW(currentPrice)} · {hasRealtimePrice ? "KIS 기준" : "data.go.kr 최근 종가 기준"}
          </p>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
            수급 참고: 외국인 보유율 {formatForeignOwnershipRatio(foreignOwnership)} (KIS 기준)
          </p>
          {hasPriceAnomaly && (
            <p className="mt-1 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-200">
              {priceAnomalyNote}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={generateReport}
          disabled={isLoading}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300 dark:hover:bg-blue-500"
        >
          {isLoading ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          리포트 생성
        </button>
      </div>
      {error && (
        <div className="mt-4">
          <ErrorState
            title={error}
            description="네트워크 또는 분석 API 상태를 확인한 뒤 다시 시도해 주세요."
          />
        </div>
      )}
      {isLoading ? (
        <div className="mt-5">
          <LoadingState
            title="리포트 작성 중"
            description="가격, 이동평균, 모멘텀 지표를 종합하고 있습니다."
          />
        </div>
      ) : data ? (
        <div className="mt-5 max-w-full overflow-hidden rounded-lg border border-line dark:border-dark-line">
          <div className="border-b border-line bg-slate-50 px-4 py-3 dark:border-dark-line dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink dark:text-white">
                  {stock.koreanName} 기술 분석 메모
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {data.source === "openai" ? "OpenAI 생성" : "실데이터 자동 생성"} ·{" "}
                  {formatGeneratedAt(data.generatedAt)}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                  {reportSourceText}
                </p>
                {hasPriceAnomaly && (
                  <p className="mt-1 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-200">
                    {priceAnomalyNote}
                  </p>
                )}
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                투자 유의
              </span>
            </div>
          </div>
          <div className="grid divide-y divide-line dark:divide-dark-line">
            {[
              ["01", "추세 요약", data.report.trend],
              ["02", "기술적 근거", data.report.technical],
              ["03", "리스크", data.report.risk]
            ].map(([index, title, content]) => (
              <article key={title} className="bg-white p-4 dark:bg-dark-panel">
                <div className="flex gap-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-ink text-xs font-bold text-white dark:bg-white dark:text-ink">
                    {index}
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-ink dark:text-white">{title}</h3>
                    <p className="mt-2 break-words text-sm leading-6 text-slate-600 dark:text-slate-300">
                      {toText(content, "표시할 내용이 없습니다.")}
                    </p>
                  </div>
                </div>
              </article>
            ))}
            <article className="bg-white p-4 dark:bg-dark-panel">
              <h3 className="text-sm font-bold text-ink dark:text-white">관찰 포인트</h3>
              <div className="mt-3 grid gap-2">
                {toTextList(data.report.watchPoints, []).map((point, index) => (
                  <p
                    key={`${index}-${point}`}
                    className="flex max-w-full items-start gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300"
                  >
                    <span className="shrink-0 text-xs font-bold text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 break-words">{point}</span>
                  </p>
                ))}
              </div>
            </article>
            <article className="bg-white p-4 dark:bg-dark-panel">
              <h3 className="text-sm font-bold text-ink dark:text-white">단기 체크 포인트</h3>
              <div className="mt-3 grid gap-2">
                {toTextList(data.report.shortTermCheckPoints, []).map((point, index) => (
                  <p
                    key={`${index}-${point}`}
                    className="flex max-w-full items-start gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300"
                  >
                    <span className="shrink-0 text-xs font-bold text-brand">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="min-w-0 break-words">{point}</span>
                  </p>
                ))}
              </div>
            </article>
            <article className="bg-slate-50 p-4 dark:bg-slate-900/60">
              <h3 className="text-xs font-bold text-ink dark:text-white">면책 문구</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                {DISCLAIMER}
              </p>
            </article>
          </div>
        </div>
      ) : (
        <div className="mt-5">
          <EmptyState
            title={`${stock.koreanName} 분석 대기`}
            description="리포트 생성 버튼을 눌러 기술 지표 기반 요약을 확인하세요."
            icon={FileText}
          />
        </div>
      )}
    </section>
  );
}
