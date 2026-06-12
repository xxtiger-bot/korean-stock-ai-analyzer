"use client";

import { useState } from "react";
import { FileText, RefreshCw, ShieldCheck, Sparkles } from "lucide-react";
import { ProUpgradePrompt } from "@/components/subscription/pro-upgrade-prompt";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui-states";
import { DISCLAIMER } from "@/lib/insights";
import type { ResolvedStockDisplayPrice } from "@/lib/market/price-resolver";
import type { AiReport, Stock } from "@/lib/types";

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

function buildTemplateAnalysisResponse(
  stock: Stock,
  resolvedPrice: ResolvedStockDisplayPrice | null | undefined
): AnalysisResponse {
  const priceKind = resolvedPrice?.priceKind ?? "unavailable";
  const maSignals = [
    Number.isFinite(stock.ma5) ? `MA5 ${stock.ma5.toLocaleString("ko-KR")}` : null,
    Number.isFinite(stock.ma20) ? `MA20 ${stock.ma20.toLocaleString("ko-KR")}` : null,
    Number.isFinite(stock.ma60) ? `MA60 ${stock.ma60.toLocaleString("ko-KR")}` : null
  ].filter(Boolean) as string[];

  if (priceKind === "unavailable") {
    return {
      source: "local",
      generatedAt: new Date().toISOString(),
      report: {
        trend: "가격 데이터 확인이 필요하여 확정적인 분석은 제공하지 않습니다.",
        technical: "가격 기준이 안정적으로 확인되지 않아 기술 지표 해석은 현재 보수적으로 제한합니다.",
        risk: "가격 데이터가 비정상 범위를 벗어나거나 일시적으로 부족해 리스크 판단은 참고용으로만 확인해 주세요.",
        risks: [
          "가격 데이터 확인이 필요합니다.",
          "실시간 기준 매매 판단은 현재 보류합니다."
        ],
        watchPoints: [
          "가격 데이터가 정상화된 뒤 다시 확인해 주세요.",
          "기업 공시와 거래량 흐름을 함께 점검해 주세요."
        ],
        shortTermCheckPoints: [
          "KIS 현재가 또는 일별 종가 기준이 정상인지 다시 확인합니다.",
          "확정적인 매매 판단은 데이터 안정화 후 진행합니다."
        ]
      }
    };
  }

  if (priceKind === "recent_close") {
    return {
      source: "local",
      generatedAt: new Date().toISOString(),
      report: {
        trend: "최근 종가 기준 참고 분석입니다. 현재 흐름은 일별 종가 기준으로 보수적으로 해석합니다.",
        technical: maSignals.length
          ? `${maSignals.join(" · ")} 기준으로 추세를 참고합니다. 다만 실시간 시세가 아니므로 단기 판단은 보수적으로 확인해 주세요.`
          : "최근 종가 기준 참고 분석입니다. 실시간 시세가 아니므로 기술적 판단은 보수적으로 확인해 주세요.",
        risk: "실시간 가격이 아닌 최근 종가 기준이므로 변동성 판단은 참고용으로만 확인해 주세요.",
        risks: [
          "실시간 시세가 아닙니다.",
          "장중 변동은 별도로 확인이 필요합니다."
        ],
        watchPoints: [
          "최근 종가 기준으로 추세가 유지되는지 확인합니다.",
          "거래량과 보조 지표가 같은 방향인지 점검합니다."
        ],
        shortTermCheckPoints: [
          "실시간 시세 복구 여부를 다시 확인합니다.",
          "가격 변동 폭이 확대되는지 관찰합니다."
        ]
      }
    };
  }

  return {
    source: "local",
    generatedAt: new Date().toISOString(),
    report: {
      trend: "KIS 현재가 기준 참고 분석입니다. 현재 가격 흐름과 보조 지표를 함께 확인해 주세요.",
      technical: maSignals.length
        ? `${maSignals.join(" · ")} 기준으로 가격 흐름을 참고합니다.`
        : "KIS 현재가 기준 참고 분석입니다. 가격 흐름과 기술 지표를 함께 확인해 주세요.",
      risk: "현재 가격 기준으로도 확정적인 수익을 보장하지 않으며, 리스크 관리는 계속 필요합니다.",
      risks: [
        "단기 변동성 확대 가능성을 함께 확인해 주세요.",
        "지지선과 저항선 근처 반응을 관찰해 주세요."
      ],
      watchPoints: [
        "현재 가격이 이동평균 위에서 유지되는지 확인합니다.",
        "거래량이 가격 흐름을 지지하는지 함께 봅니다."
      ],
      shortTermCheckPoints: [
        "장중 변동성과 거래량 확대 여부를 확인합니다.",
        "리스크가 커질 경우 비중 조절 가능성을 점검합니다."
      ]
    }
  };
}

export function AiReportCard({
  stock,
  resolvedPrice
}: {
  stock: Stock;
  resolvedPrice?: ResolvedStockDisplayPrice | null;
}) {
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const priceKind = resolvedPrice?.priceKind ?? "unavailable";
  const isKisCurrent = priceKind === "kis_current";
  const isAbnormalPrice = resolvedPrice?.basisKo === "비정상 가격 감지";
  const effectiveAiConfidence =
    priceKind === "unavailable"
      ? "low"
      : resolvedPrice?.aiConfidence ?? (isKisCurrent ? "high" : "low");
  const analysisBasisText =
    isKisCurrent
      ? "KIS 기준 참고 분석"
      : priceKind === "external_reference"
        ? "외부 참고 기준 분석"
      : priceKind === "recent_close"
        ? "최근 종가 기준 참고 분석"
        : isAbnormalPrice
          ? "비정상 가격 감지"
          : "가격 데이터 일시 불가";
  const analysisNotice =
    isKisCurrent
      ? "현재가는 KIS 기준으로 확인되었습니다."
      : priceKind === "external_reference"
        ? resolvedPrice?.warningKo ?? "공식 KIS 실시간 시세가 아닙니다."
      : priceKind === "recent_close"
        ? "현재가 기준 분석이 아닙니다."
        : isAbnormalPrice
          ? resolvedPrice?.warningKo ??
            "현재 가격 데이터가 비정상 범위를 벗어나 확정적인 매매 판단을 제공하지 않습니다."
          : resolvedPrice?.warningKo ?? "가격 데이터를 일시적으로 불러올 수 없습니다.";
  const isAiUsable = resolvedPrice?.isUsableForAi ?? false;
  const dataBasisLabel = resolvedPrice?.basisKo ?? "데이터 기준 확인 필요";
  const dataTimestampLabel =
    priceKind === "kis_current"
      ? resolvedPrice?.updatedAt
        ? `업데이트 ${resolvedPrice.updatedAt}`
        : "데이터 기준 확인 필요"
      : priceKind === "recent_close"
        ? resolvedPrice?.baseDate
          ? `기준일 ${resolvedPrice.baseDate}`
          : stock.date
            ? `기준일 ${stock.date}`
            : "데이터 기준 확인 필요"
        : "데이터 기준 확인 필요";
  const generatedAtLabel = data ? formatGeneratedAt(data.generatedAt) : null;
  const aiConfidenceLabel =
    effectiveAiConfidence === "high"
      ? "높음"
      : effectiveAiConfidence === "medium"
        ? "보통"
        : "낮음";
  const trendSummary =
    !resolvedPrice || isAiUsable
      ? data?.report.trend ?? "분석 데이터가 부족합니다."
      : isAbnormalPrice
        ? "현재 가격 데이터가 비정상 범위를 벗어나 확정적인 매매 판단을 제공하지 않습니다."
        : "현재 가격 데이터가 불안정하여 확정적인 매매 판단을 제공하지 않습니다.";
  const technicalSummary =
    priceKind === "recent_close"
      ? "최근 종가 기준 참고 분석입니다. 현재가 기준 분석이 아닙니다."
      : priceKind === "external_reference"
        ? "외부 참고 가격 기준 분석입니다. 공식 KIS 실시간 시세는 아닙니다."
      : isAbnormalPrice
        ? "가격 데이터가 비정상 범위를 벗어나 기술적 판단은 현재 보류합니다."
        : priceKind === "unavailable"
        ? "가격 데이터가 불안정하여 기술적 판단은 보수적으로 참고해 주세요."
        : data?.report.technical ?? "기술적 근거를 표시할 데이터가 부족합니다.";
  const riskSummary =
    isAbnormalPrice
      ? "가격 데이터가 비정상 범위를 벗어나 리스크 판단은 참고용으로만 확인해 주세요."
      : priceKind === "unavailable"
      ? "가격 데이터가 불안정하여 리스크 판단은 참고용으로만 확인해 주세요."
      : data?.report.risk ?? "리스크 정보를 표시할 데이터가 부족합니다.";
  const generationBasisText =
    priceKind === "kis_current"
      ? "KIS 현재가 기준 참고 분석입니다."
      : priceKind === "external_reference"
        ? "외부 참고 가격 기준 참고 분석입니다."
      : priceKind === "recent_close"
        ? "최근 종가 기준 참고 분석입니다."
        : "가격 데이터 확인이 필요하여 확정적인 분석은 제공하지 않습니다.";

  async function generateReport() {
    setIsLoading(true);
    setError("");
    setIsExpanded(false);

    try {
      setData(buildTemplateAnalysisResponse(stock, resolvedPrice));
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
            데이터 기준: {dataBasisLabel}
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">{dataTimestampLabel}</p>
          <div className="mt-3 rounded-lg border border-line bg-slate-50 px-3 py-3 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300">
            <p>AI 분석 요약</p>
            <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              {analysisBasisText}
            </p>
            <p className="mt-1">
              {priceKind === "kis_current"
                ? "현재가와 보조 지표를 함께 참고해 리포트를 구성했습니다."
                : priceKind === "external_reference"
                  ? "외부 참고 가격을 기준으로 보조 분석을 구성했습니다. 공식 KIS 실시간 시세는 아닙니다."
                : priceKind === "recent_close"
                  ? "최근 종가를 기준으로 참고 분석합니다. 현재가 기준 분석이 아닙니다."
                  : isAbnormalPrice
                    ? "현재 가격 데이터가 비정상 범위를 벗어나 분석에서 제외했습니다."
                    : "가격 데이터를 일시적으로 불러올 수 없어 매매 판단은 보류했습니다."}
            </p>
            <p className="mt-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
              AI 신뢰도: {aiConfidenceLabel}
            </p>
          </div>
          {priceKind === "unavailable" ? (
            <p className="mt-3 text-xs font-semibold leading-5 text-slate-400">{analysisNotice}</p>
          ) : null}
          <div className="mt-3">
            <ProUpgradePrompt
              compact
              featureName="Pro"
              title="전체 매매 근거"
              description="AI의 전체 매매 근거는 Pro에서 확인할 수 있습니다."
            />
          </div>
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
                  생성 완료 · 보고서 생성: {generatedAtLabel ?? "생성 시간 확인 필요"}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                  데이터 기준: {dataBasisLabel}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                  {dataTimestampLabel}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-400">
                  템플릿 기반 AI 보조 분석
                </p>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                <ShieldCheck className="h-3.5 w-3.5 text-mint" />
                투자 유의
              </span>
            </div>
          </div>
          <div className="grid divide-y divide-line dark:divide-dark-line">
            {[
              ["01", "추세 요약", trendSummary],
              ["02", "기술적 근거", technicalSummary],
              ["03", "리스크", riskSummary]
            ]
              .slice(0, isExpanded ? 3 : 1)
              .map(([index, title, content]) => (
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
            {!isExpanded ? (
              <article className="bg-white px-4 py-3 dark:bg-dark-panel">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  요약만 표시 중입니다. 전체 내용을 열어 기술적 근거, 리스크, 관찰 포인트를 확인하세요.
                </p>
              </article>
            ) : null}
            <article className="bg-white p-4 dark:bg-dark-panel">
              <h3 className="text-sm font-bold text-ink dark:text-white">관찰 포인트</h3>
              <div className="mt-3 grid gap-2">
                {toTextList(data.report.watchPoints, [])
                  .slice(0, isExpanded ? 6 : 2)
                  .map((point, index) => (
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
            {isExpanded ? (
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
            ) : null}
            <article className="bg-white p-4 dark:bg-dark-panel">
              <button
                type="button"
                onClick={() => setIsExpanded((prev) => !prev)}
                className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-600 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
              >
                {isExpanded ? "요약으로 보기" : "전체 보기"}
              </button>
            </article>
            <article className="bg-slate-50 p-4 dark:bg-slate-900/60">
              <p className="text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                {generationBasisText}
              </p>
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
