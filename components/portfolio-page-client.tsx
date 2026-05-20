"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui-states";
import { usePortfolio } from "@/components/portfolio-provider";
import { changeColorClass, formatKRW, formatNumber, formatPercent } from "@/lib/format";
import type {
  InvestmentHorizon,
  PortfolioDiagnosis,
  PortfolioPositionInput,
  RiskProfile
} from "@/lib/types";

type DiagnoseResponse = {
  generatedAt?: string;
  items?: PortfolioDiagnosis[];
  failures?: Array<{
    id?: string;
    symbol?: string;
    reason?: string;
  }>;
};

type DraftState = {
  symbol: string;
  buyPrice: string;
  quantity: string;
  investmentHorizon: InvestmentHorizon;
  riskProfile: RiskProfile;
  memo: string;
};

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function toRiskCount(items: PortfolioDiagnosis[]) {
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.filter((item) => safeNumber(item.riskManagementScore) >= 65).length;
}

function summarize(items: PortfolioDiagnosis[]) {
  const safeItems = Array.isArray(items) ? items : [];
  const totalValue = safeItems.reduce((sum, item) => sum + safeNumber(item.valuationAmount), 0);
  const totalPnL = safeItems.reduce((sum, item) => sum + safeNumber(item.profitLoss), 0);
  const avgReturn =
    safeItems.length > 0
      ? safeItems.reduce((sum, item) => sum + safeNumber(item.returnRate), 0) / safeItems.length
      : 0;
  return {
    totalValue,
    totalPnL,
    avgReturn
  };
}

function judgementClass(judgement: string) {
  if (judgement === "리스크 관리 필요") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200";
  }
  if (judgement === "비중 축소 관찰") {
    return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/50 dark:text-orange-200";
  }
  if (judgement === "대기 / 확인 필요") {
    return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/50 dark:text-amber-200";
  }
  if (judgement === "추가 관찰 가능") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-200";
  }
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/50 dark:text-blue-200";
}

function ListBlock({ title, items }: { title: string; items: string[] }) {
  const safeItems = Array.isArray(items) ? items : [];
  return (
    <article>
      <h4 className="text-sm font-bold text-ink dark:text-white">{title}</h4>
      <ul className="mt-2 grid gap-2">
        {safeItems.map((item, index) => (
          <li
            key={`${title}-${index}-${item}`}
            className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300"
          >
            {item}
          </li>
        ))}
      </ul>
    </article>
  );
}

export function PortfolioPageClient() {
  const { entries, addEntry, removeEntry } = usePortfolio();
  const [diagnoses, setDiagnoses] = useState<PortfolioDiagnosis[]>([]);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<DraftState>({
    symbol: "",
    buyPrice: "",
    quantity: "",
    investmentHorizon: "중기",
    riskProfile: "일반형",
    memo: ""
  });

  const safeEntries = useMemo(
    () => (Array.isArray(entries) ? entries : []),
    [entries]
  );
  const entryKey = useMemo(
    () =>
      safeEntries
        .map((entry) => `${entry.id}:${entry.symbol}:${entry.buyPrice}:${entry.quantity}`)
        .join("|"),
    [safeEntries]
  );

  useEffect(() => {
    if (safeEntries.length === 0) {
      setDiagnoses([]);
      setFailures({});
      return;
    }

    let cancelled = false;

    async function fetchDiagnoses() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/portfolio/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions: safeEntries }),
          cache: "no-store"
        });
        if (!response.ok) {
          throw new Error("진단 요청 실패");
        }

        const payload = (await response.json().catch(() => null)) as DiagnoseResponse | null;
        const items = Array.isArray(payload?.items) ? payload.items : [];
        const failureItems = Array.isArray(payload?.failures) ? payload.failures : [];
        const failureMap: Record<string, string> = {};
        for (const failure of failureItems) {
          const id = typeof failure?.id === "string" ? failure.id : "";
          const reason = safeText(failure?.reason, "일별 데이터가 부족해 진단을 표시할 수 없습니다.");
          if (id) {
            failureMap[id] = reason;
          }
        }

        if (!cancelled) {
          setDiagnoses(items);
          setFailures(failureMap);
        }
      } catch {
        if (!cancelled) {
          setDiagnoses([]);
          setFailures({});
          setError("보유종목 AI 진단을 불러오지 못했습니다. 잠시 후 다시 확인해 주세요.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    void fetchDiagnoses();
    return () => {
      cancelled = true;
    };
  }, [entryKey, safeEntries]);

  const diagnosisMap = useMemo(() => {
    const map = new Map<string, PortfolioDiagnosis>();
    const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
    for (const item of safeDiagnoses) {
      if (typeof item?.id === "string") {
        map.set(item.id, item);
      }
    }
    return map;
  }, [diagnoses]);

  const summary = useMemo(() => summarize(diagnoses), [diagnoses]);
  const riskUpCount = useMemo(() => toRiskCount(diagnoses), [diagnoses]);

  function onDraftChange<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addPortfolioEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbol = draft.symbol.trim().toUpperCase();
    const buyPrice = parseNumber(draft.buyPrice);
    const quantity = parseNumber(draft.quantity);
    if (!symbol || buyPrice <= 0 || quantity <= 0) return;

    addEntry({
      symbol,
      buyPrice,
      quantity,
      investmentHorizon: draft.investmentHorizon,
      riskProfile: draft.riskProfile,
      memo: draft.memo
    });

    setDraft((current) => ({
      ...current,
      symbol: "",
      buyPrice: "",
      quantity: "",
      memo: ""
    }));
  }

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <p className="text-xs font-bold uppercase tracking-normal text-brand">Portfolio</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          내 보유종목 AI 진단
        </h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
          KIS 현재가와 data.go.kr 일별 종가 데이터를 기반으로 보유 상태를 관찰하고, 확인 필요 구간을 정리하는 참고 정보입니다.
        </p>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <article className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold text-slate-400">총 보유 종목 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{safeEntries.length}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold text-slate-400">총 평가금액</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">
            {formatKRW(summary.totalValue)}
          </p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold text-slate-400">총 평가손익</p>
          <p className={`mt-1 text-xl font-bold ${changeColorClass(summary.totalPnL)}`}>
            {formatKRW(summary.totalPnL)}
          </p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold text-slate-400">평균 수익률</p>
          <p className={`mt-1 text-xl font-bold ${changeColorClass(summary.avgReturn)}`}>
            {formatPercent(summary.avgReturn)}
          </p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold text-slate-400">오늘 리스크 상승 종목 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{riskUpCount}</p>
        </article>
      </section>

      <section className="mt-4 grid min-w-0 gap-4 xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]">
        <form
          onSubmit={addPortfolioEntry}
          className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5"
        >
          <h2 className="text-base font-bold text-ink dark:text-white">보유종목 추가</h2>
          <div className="mt-4 grid gap-3">
            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">종목코드</span>
              <input
                value={draft.symbol}
                onChange={(event) => onDraftChange("symbol", event.target.value)}
                placeholder="예: 005930"
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">매수가</span>
              <input
                value={draft.buyPrice}
                onChange={(event) => onDraftChange("buyPrice", event.target.value)}
                inputMode="decimal"
                placeholder="예: 82100"
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">보유수량</span>
              <input
                value={draft.quantity}
                onChange={(event) => onDraftChange("quantity", event.target.value)}
                inputMode="numeric"
                placeholder="예: 15"
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              />
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">투자기간</span>
              <select
                value={draft.investmentHorizon}
                onChange={(event) =>
                  onDraftChange("investmentHorizon", event.target.value as InvestmentHorizon)
                }
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              >
                <option value="단기">단기</option>
                <option value="중기">중기</option>
                <option value="장기">장기</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">위험성향</span>
              <select
                value={draft.riskProfile}
                onChange={(event) =>
                  onDraftChange("riskProfile", event.target.value as RiskProfile)
                }
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              >
                <option value="보수형">보수형</option>
                <option value="일반형">일반형</option>
                <option value="공격형">공격형</option>
              </select>
            </label>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">메모 (매수 이유)</span>
              <textarea
                value={draft.memo}
                onChange={(event) => onDraftChange("memo", event.target.value)}
                placeholder="매수 이유를 기록하면 재평가에 도움이 됩니다."
                className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              />
            </label>
            <button
              type="submit"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700"
            >
              <Plus className="h-4 w-4" />
              보유종목 추가
            </button>
          </div>
        </form>

        <section className="min-w-0 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">보유종목 리스트</h2>

          {error && (
            <div className="mt-4">
              <ErrorState title="진단 불러오기 실패" description={error} />
            </div>
          )}

          {isLoading && (
            <div className="mt-4">
              <LoadingState
                title="보유종목 AI 진단 계산 중"
                description="일별 종가 데이터와 현재가를 확인해 리스크를 정리하고 있습니다."
              />
            </div>
          )}

          {!isLoading && safeEntries.length === 0 && (
            <div className="mt-4">
              <EmptyState
                title="보유종목 없음"
                description="종목코드, 매수가, 수량을 입력해 내 보유종목 AI 진단을 시작해보세요."
              />
            </div>
          )}

          {!isLoading && safeEntries.length > 0 && (
            <div className="mt-4 grid gap-3">
              {safeEntries.map((entry: PortfolioPositionInput) => {
                const diagnosis = diagnosisMap.get(entry.id);
                const isExpanded = expandedId === entry.id;
                const failureReason = failures[entry.id];
                const judgement = diagnosis?.judgement ?? "대기 / 확인 필요";
                const quoteSource = diagnosis?.quoteSource === "KIS" ? "KIS" : "data.go.kr 최근 종가";
                const quoteLabel = diagnosis?.quoteSource === "KIS" ? "현재가" : "최근 종가";
                return (
                  <article
                    key={entry.id}
                    className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink dark:text-white">
                          {diagnosis?.stockName ?? entry.symbol}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {entry.symbol} · {diagnosis?.market ?? "시장 확인 필요"}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          매수가 {formatKRW(entry.buyPrice)} · 수량 {formatNumber(entry.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => removeEntry(entry.id)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-white text-slate-400 hover:text-slate-700 dark:border-dark-line dark:bg-dark-panel dark:hover:text-white"
                          aria-label="보유종목 삭제"
                          title="보유종목 삭제"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="inline-flex h-8 items-center gap-1 rounded-md border border-line bg-white px-2 text-xs font-bold text-slate-600 hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
                        >
                          상세
                          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {quoteLabel}{" "}
                        <span className="font-bold text-ink dark:text-white">
                          {formatKRW(safeNumber(diagnosis?.currentPrice, 0))}
                        </span>
                      </p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        평가손익{" "}
                        <span className={`font-bold ${changeColorClass(safeNumber(diagnosis?.profitLoss, 0))}`}>
                          {formatKRW(safeNumber(diagnosis?.profitLoss, 0))}
                        </span>
                      </p>
                      <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                        수익률{" "}
                        <span className={`font-bold ${changeColorClass(safeNumber(diagnosis?.returnRate, 0))}`}>
                          {formatPercent(safeNumber(diagnosis?.returnRate, 0))}
                        </span>
                      </p>
                      <span
                        className={`inline-flex w-fit rounded-md border px-2 py-1 text-xs font-bold ${judgementClass(
                          judgement
                        )}`}
                      >
                        {judgement}
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 border-t border-line pt-3 dark:border-dark-line">
                        {!diagnosis ? (
                          <EmptyState
                            compact
                            title="일별 데이터 부족"
                            description={failureReason || "data.go.kr 일별 종가 데이터 확인이 필요합니다."}
                          />
                        ) : (
                          <div className="grid gap-4">
                            <div className="grid gap-2 rounded-md border border-line bg-white p-3 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                              <p>
                                현재 평가금액{" "}
                                <span className="font-bold text-ink dark:text-white">
                                  {formatKRW(safeNumber(diagnosis.valuationAmount))}
                                </span>
                              </p>
                              <p>
                                보유 건강 점수{" "}
                                <span className="font-bold text-ink dark:text-white">
                                  {safeNumber(diagnosis.holdingHealthScore)}/100
                                </span>
                              </p>
                              <p>
                                추가 관찰 점수{" "}
                                <span className="font-bold text-ink dark:text-white">
                                  {safeNumber(diagnosis.addObservationScore)}/100
                                </span>
                              </p>
                              <p>
                                리스크 관리 점수{" "}
                                <span className="font-bold text-ink dark:text-white">
                                  {safeNumber(diagnosis.riskManagementScore)}/100
                                </span>
                              </p>
                              <p>
                                시세 출처{" "}
                                <span className="font-bold text-ink dark:text-white">
                                  {quoteSource}
                                </span>
                              </p>
                              <p>
                                데이터 출처{" "}
                                <span className="font-bold text-ink dark:text-white">
                                  {safeText(diagnosis.dataSource, "data.go.kr 일별 종가")}
                                </span>
                              </p>
                              {diagnosis.quoteSource !== "KIS" && (
                                <p className="rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
                                  현재가는 data.go.kr 최근 종가 기준입니다.
                                </p>
                              )}
                            </div>
                            <article className="rounded-md border border-line bg-white p-3 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                              <p className="font-bold text-ink dark:text-white">왜 이런 판단인가?</p>
                              <p className="mt-1">{safeText(diagnosis.why)}</p>
                            </article>
                            <ListBlock title="추가 관찰이 가능한 이유" items={Array.isArray(diagnosis.addReasons) ? diagnosis.addReasons : []} />
                            <ListBlock title="신중해야 하는 이유" items={Array.isArray(diagnosis.cautionReasons) ? diagnosis.cautionReasons : []} />
                            <ListBlock
                              title="비중 축소 / 리스크 관리 관찰 이유"
                              items={Array.isArray(diagnosis.riskManagementReasons) ? diagnosis.riskManagementReasons : []}
                            />
                            <ListBlock title="다음 확인 조건" items={Array.isArray(diagnosis.nextChecks) ? diagnosis.nextChecks : []} />
                            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold leading-5 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                              {safeText(diagnosis.disclaimer)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
