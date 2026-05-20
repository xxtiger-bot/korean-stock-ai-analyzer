"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui-states";
import { usePortfolio } from "@/components/portfolio-provider";
import { changeColorClass, formatKRW, formatNumber, formatPercent } from "@/lib/format";
import { PORTFOLIO_DIAGNOSIS_STORAGE_KEY } from "@/lib/storage-keys";
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

type StockLookupResult = {
  symbol?: string;
  koreanName?: string;
  market?: string;
  tags?: unknown;
};

type StockLookupResponse = {
  results?: StockLookupResult[];
};

type DraftState = {
  symbol: string;
  buyPrice: string;
  quantity: string;
  investmentHorizon: InvestmentHorizon;
  riskProfile: RiskProfile;
  memo: string;
};

type PortfolioRiskAlert = {
  key: string;
  id: string;
  symbol: string;
  stockName: string;
  riskType: string;
  reason: string;
  nextCheck: string;
  priority: number;
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
  if (judgement === "리스크 관리 관찰") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/50 dark:text-red-200";
  }
  if (judgement === "비중 조절 검토 구간") {
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

function getCoreJudgementReason(diagnosis: PortfolioDiagnosis | undefined) {
  if (!diagnosis) {
    return "일별 데이터와 현재가를 확인한 뒤 핵심 판단 이유를 제공합니다.";
  }

  if (diagnosis.judgement === "추가 관찰 가능") {
    return "지지 확인과 거래량 조건이 동반될 때 추가 관찰이 가능합니다.";
  }

  if (diagnosis.judgement === "유지 관찰") {
    const isProfitable = safeNumber(diagnosis.returnRate) >= 0;
    const isAddHigh = safeNumber(diagnosis.addObservationScore) >= 65;
    const cautionReasons = Array.isArray(diagnosis.cautionReasons)
      ? diagnosis.cautionReasons
      : [];
    const isFarFromMa20 = cautionReasons.some((reason) => reason.includes("MA20"));

    if (isProfitable && isAddHigh && isFarFromMa20) {
      return "현재 수익 구간이며 보유 추세는 유지되지만 MA20 이격이 커 추가는 신중한 재평가가 필요합니다.";
    }

    return "현재 수익 구간이고 단기 추세가 유지되어 보유 상태를 관찰할 수 있습니다.";
  }

  if (diagnosis.judgement === "대기 / 확인 필요") {
    return "데이터 재확인 또는 추세 확인이 필요해 대기 관찰이 적절한 구간입니다.";
  }

  if (
    diagnosis.judgement === "비중 조절 검토 구간" ||
    diagnosis.judgement === "리스크 관리 관찰"
  ) {
    return "추세 약화 또는 손실 확대 가능성이 있어 리스크 관리가 필요합니다.";
  }

  return "데이터 확인 후 보유 상태를 재평가할 필요가 있습니다.";
}

function hasKeyword(items: string[], keyword: string) {
  const safeItems = Array.isArray(items) ? items : [];
  return safeItems.some((item) => typeof item === "string" && item.includes(keyword));
}

function buildPortfolioRiskAlerts(
  entries: PortfolioPositionInput[],
  diagnoses: PortfolioDiagnosis[]
) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
  const diagnosisMap = new Map<string, PortfolioDiagnosis>();

  for (const item of safeDiagnoses) {
    if (typeof item?.id === "string") {
      diagnosisMap.set(item.id, item);
    }
  }

  const alerts: PortfolioRiskAlert[] = [];

  for (const entry of safeEntries) {
    const diagnosis = diagnosisMap.get(entry.id);
    if (!diagnosis) continue;

    const stockName = safeText(diagnosis.stockName, safeText(entry.stockName, entry.symbol));
    const symbol = safeText(diagnosis.symbol, entry.symbol);
    const cautionReasons = Array.isArray(diagnosis.cautionReasons) ? diagnosis.cautionReasons : [];
    const riskReasons = Array.isArray(diagnosis.riskManagementReasons)
      ? diagnosis.riskManagementReasons
      : [];
    const nextChecks = Array.isArray(diagnosis.nextChecks) ? diagnosis.nextChecks : [];
    const firstNextCheck = nextChecks[0] ?? "다음 종가와 거래량 변화를 확인 필요";
    const currentPrice = safeNumber(diagnosis.currentPrice, safeNumber(entry.buyPrice));
    const buyPrice = safeNumber(entry.buyPrice);
    const returnRate = safeNumber(diagnosis.returnRate, 0);

    const isMa20Below = hasKeyword(cautionReasons, "MA20 아래");
    const isNearOrBelowBuyPrice =
      (Number.isFinite(currentPrice) && Number.isFinite(buyPrice) && currentPrice <= buyPrice) ||
      (Number.isFinite(currentPrice) &&
        Number.isFinite(buyPrice) &&
        buyPrice > 0 &&
        Math.abs(((currentPrice - buyPrice) / buyPrice) * 100) <= 1.2);
    const isLossExpanded = returnRate <= -5;
    const isRsiOverheat = hasKeyword(cautionReasons, "RSI") && hasKeyword(cautionReasons, "과열");
    const isNearLow20 = hasKeyword(riskReasons, "20일 저점") || hasKeyword(nextChecks, "20일 저점");
    const isRiskManagementJudgement = diagnosis.judgement === "리스크 관리 관찰";
    const isKisUnavailable = diagnosis.quoteSource !== "KIS";

    const pushAlert = (riskType: string, reason: string, priority: number, nextCheck: string) => {
      alerts.push({
        key: `${entry.id}-${riskType}`,
        id: entry.id,
        symbol,
        stockName,
        riskType,
        reason,
        nextCheck,
        priority
      });
    };

    if (isRiskManagementJudgement) {
      pushAlert(
        "리스크 관리 필요",
        "AI 판단 결과가 리스크 관리 관찰 구간으로 분류되어 재평가가 필요합니다.",
        100,
        firstNextCheck
      );
    }

    if (isLossExpanded) {
      pushAlert(
        "손실 확대 리스크",
        `수익률이 ${formatPercent(returnRate)}로 손실 확대 구간 진입 여부를 신중하게 확인해야 합니다.`,
        96,
        "손실 폭 확대 여부와 종가 회복 가능성을 우선 확인 필요"
      );
    }

    if (isMa20Below) {
      pushAlert(
        "MA20 이탈 확인 필요",
        "현재가가 MA20 아래 구간에 있어 추세 약화 지속 여부를 관찰해야 합니다.",
        92,
        firstNextCheck
      );
    }

    if (isNearLow20) {
      pushAlert(
        "20일 저점 이탈 확인 필요",
        "20일 저점 부근 접근 신호가 있어 지지선 반응 재확인이 필요합니다.",
        88,
        "20일 저점 지지 유지 여부와 거래량 변화를 확인 필요"
      );
    }

    if (isNearOrBelowBuyPrice) {
      pushAlert(
        "손익 전환 리스크 확인",
        "현재가가 매입가 부근 또는 하회 구간이라 손익 전환 가능성을 신중히 관찰해야 합니다.",
        82,
        "매입가 재돌파 여부와 종가 유지 흐름을 확인 필요"
      );
    }

    if (isRsiOverheat) {
      pushAlert(
        "단기 과열 주의",
        "RSI 과열 신호가 확인되어 단기 변동성 확대 가능성에 대한 재평가가 필요합니다.",
        76,
        "RSI 과열 완화 여부와 고점권 거래량을 확인 필요"
      );
    }

    if (isKisUnavailable) {
      pushAlert(
        "시세 기준 참고 정보",
        "현재가는 data.go.kr 최근 종가 기준입니다. 실시간 시세 확인은 참고 정보로 보완이 필요합니다.",
        55,
        "KIS 현재가 확인 가능 시점에 가격 괴리 여부를 재확인"
      );
    }
  }

  return alerts.sort((left, right) => right.priority - left.priority);
}

export function PortfolioPageClient() {
  const { entries, addEntry, removeEntry } = usePortfolio();
  const [diagnoses, setDiagnoses] = useState<PortfolioDiagnosis[]>([]);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [symbolLookup, setSymbolLookup] = useState<{
    symbol: string;
    name: string;
    market: string;
    dataSource: string;
  } | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [draft, setDraft] = useState<DraftState>({
    symbol: "",
    buyPrice: "",
    quantity: "",
    investmentHorizon: "중기",
    riskProfile: "일반형",
    memo: ""
  });

  const normalizedDraftSymbol = useMemo(
    () => draft.symbol.trim().toUpperCase(),
    [draft.symbol]
  );

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
          try {
            window.localStorage.setItem(
              PORTFOLIO_DIAGNOSIS_STORAGE_KEY,
              JSON.stringify({
                savedAt: new Date().toISOString(),
                items
              })
            );
          } catch {
            // localStorage may be blocked in restricted contexts.
          }
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

  useEffect(() => {
    if (!normalizedDraftSymbol) {
      setSymbolLookup(null);
      setIsLookupLoading(false);
      setLookupFailed(false);
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      setIsLookupLoading(true);
      setLookupFailed(false);

      try {
        const response = await fetch(
          `/api/stocks/search?keyword=${encodeURIComponent(normalizedDraftSymbol)}`,
          { cache: "no-store" }
        );

        if (!response.ok) {
          throw new Error("lookup failed");
        }

        const payload = (await response.json().catch(() => null)) as StockLookupResponse | null;
        const list = Array.isArray(payload?.results) ? payload.results : [];
        const exact = list.find(
          (item) => safeText(item?.symbol).toUpperCase() === normalizedDraftSymbol
        );
        const candidate = exact ?? list[0];
        const symbol = safeText(candidate?.symbol).toUpperCase();
        const name = safeText(candidate?.koreanName);
        const market = safeText(candidate?.market);
        const tags = Array.isArray(candidate?.tags)
          ? candidate.tags.filter((tag): tag is string => typeof tag === "string")
          : [];
        const dataSource =
          tags.find((tag) => tag.toLowerCase() === "data.go.kr") ?? "mock";

        if (!cancelled) {
          if (symbol && name && market) {
            setSymbolLookup({ symbol, name, market, dataSource });
            setLookupFailed(false);
          } else {
            setSymbolLookup(null);
            setLookupFailed(true);
          }
        }
      } catch {
        if (!cancelled) {
          setSymbolLookup(null);
          setLookupFailed(true);
        }
      } finally {
        if (!cancelled) {
          setIsLookupLoading(false);
        }
      }
    }, 260);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [normalizedDraftSymbol]);

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
  const riskAlerts = useMemo(
    () => buildPortfolioRiskAlerts(safeEntries, diagnoses),
    [safeEntries, diagnoses]
  );
  const topRiskAlerts = useMemo(
    () => (Array.isArray(riskAlerts) ? riskAlerts.slice(0, 3) : []),
    [riskAlerts]
  );

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
      stockName: symbolLookup?.symbol === symbol ? symbolLookup.name : "",
      market: symbolLookup?.symbol === symbol ? symbolLookup.market : "",
      dataSource: symbolLookup?.symbol === symbol ? symbolLookup.dataSource : "",
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

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-brand">Risk Alert</p>
            <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
              보유종목 리스크 알림
            </h2>
          </div>
          <span className="inline-flex items-center gap-1 rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
            <ShieldAlert className="h-3.5 w-3.5" />
            오늘 리스크 알림 {Array.isArray(riskAlerts) ? riskAlerts.length : 0}건
          </span>
        </div>

        {topRiskAlerts.length === 0 ? (
          <div className="mt-3">
            <EmptyState
              compact
              icon={AlertTriangle}
              title="현재 특별한 리스크 알림이 없습니다."
              description="보유종목은 유지 관찰 구간입니다."
            />
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {topRiskAlerts.map((alert) => (
              <article
                key={alert.key}
                className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink dark:text-white">
                      {alert.stockName}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {alert.symbol}
                    </p>
                  </div>
                  <span className="rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    {alert.riskType}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  이유: {alert.reason}
                </p>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  다음 확인 조건: {alert.nextCheck}
                </p>
              </article>
            ))}
          </div>
        )}
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
              {isLookupLoading ? (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  종목 정보를 확인하고 있습니다.
                </p>
              ) : symbolLookup ? (
                <div className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300">
                  <p>
                    선택된 종목: {symbolLookup.name} · {symbolLookup.symbol} · {symbolLookup.market}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    데이터 출처: {symbolLookup.dataSource}
                  </p>
                </div>
              ) : lookupFailed && normalizedDraftSymbol ? (
                <p className="text-xs font-semibold text-red-600 dark:text-red-300">
                  종목 정보를 확인할 수 없습니다. 코드를 다시 확인해주세요.
                </p>
              ) : (
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  예: 005930 입력 시 종목명과 시장을 자동으로 확인합니다.
                </p>
              )}
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
                title="아직 등록된 보유종목이 없습니다."
                description="종목코드, 매수가, 보유수량을 입력하면 AI가 보유 상태를 진단해드립니다."
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
                const displayName = safeText(diagnosis?.stockName, safeText(entry.stockName, entry.symbol));
                const displayMarket = safeText(diagnosis?.market, safeText(entry.market, "시장 확인 필요"));
                const coreReason = getCoreJudgementReason(diagnosis);
                return (
                  <article
                    key={entry.id}
                    className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink dark:text-white">
                          {displayName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {entry.symbol} · {displayMarket}
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
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      핵심 판단 이유: {coreReason}
                    </p>

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
                              title="리스크 관리가 필요한 이유"
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
