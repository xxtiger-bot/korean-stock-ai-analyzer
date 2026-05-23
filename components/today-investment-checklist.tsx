"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { usePortfolio } from "@/components/portfolio-provider";
import { useWatchlist } from "@/components/watchlist-provider";
import { EmptyState } from "@/components/ui-states";
import { formatPercent } from "@/lib/format";
import { supabase } from "@/lib/supabase";
import { PORTFOLIO_DIAGNOSIS_STORAGE_KEY } from "@/lib/storage-keys";
import type { PortfolioDiagnosis, Stock } from "@/lib/types";

type AlertConditionType =
  | "price_lte"
  | "price_gte"
  | "return_lte"
  | "return_gte"
  | "ma20_below"
  | "rsi_gte_70"
  | "rsi_lte_30";

type UserAlertCondition = {
  id: string;
  type: AlertConditionType;
  threshold: number | null;
  enabled: boolean;
  createdAt: string;
};

type ChecklistItem = {
  id: string;
  symbol: string;
  name: string;
  returnRate: number | null;
  riskState: string;
  nearAlert: boolean;
  priceGapRate: number | null;
  reasons: string[];
  score: number;
};

type ChecklistVariant = "home" | "portfolio";

const ALERT_CONDITIONS_STORAGE_KEY = "krx-insight-portfolio-alert-conditions";

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function normalizeDiagnosis(value: unknown): PortfolioDiagnosis | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  const symbol = safeText(raw.symbol);
  if (!id || !symbol) return null;

  return {
    id,
    symbol,
    stockName: safeText(raw.stockName, symbol),
    market: safeText(raw.market, "시장 확인 필요"),
    quoteSource:
      raw.quoteSource === "KIS" ? "KIS" : "data.go.kr fallback",
    buyPrice: safeNumber(raw.buyPrice),
    quantity: safeNumber(raw.quantity),
    currentPrice: safeNumber(raw.currentPrice),
    recentClosePrice: safeNumber(raw.recentClosePrice),
    valuationAmount: safeNumber(raw.valuationAmount),
    profitLoss: safeNumber(raw.profitLoss),
    returnRate: safeNumber(raw.returnRate),
    holdingHealthScore: safeNumber(raw.holdingHealthScore),
    addObservationScore: safeNumber(raw.addObservationScore),
    riskManagementScore: safeNumber(raw.riskManagementScore),
    judgement: safeText(raw.judgement, "대기 / 확인 필요") as PortfolioDiagnosis["judgement"],
    why: safeText(raw.why),
    addReasons: Array.isArray(raw.addReasons)
      ? raw.addReasons.map((item) => safeText(item)).filter(Boolean)
      : [],
    cautionReasons: Array.isArray(raw.cautionReasons)
      ? raw.cautionReasons.map((item) => safeText(item)).filter(Boolean)
      : [],
    riskManagementReasons: Array.isArray(raw.riskManagementReasons)
      ? raw.riskManagementReasons.map((item) => safeText(item)).filter(Boolean)
      : [],
    nextChecks: Array.isArray(raw.nextChecks)
      ? raw.nextChecks.map((item) => safeText(item)).filter(Boolean)
      : [],
    disclaimer: safeText(raw.disclaimer),
    hasRealtimePrice: Boolean(raw.hasRealtimePrice),
    dataSource: safeText(raw.dataSource, "data.go.kr"),
    updatedAt: safeText(raw.updatedAt)
  };
}

function parseStoredDiagnoses() {
  if (typeof window === "undefined") return [] as PortfolioDiagnosis[];
  try {
    const raw = window.localStorage.getItem(PORTFOLIO_DIAGNOSIS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as { items?: unknown } | null;
    const items = parsed && Array.isArray(parsed.items) ? parsed.items : [];
    return items
      .map(normalizeDiagnosis)
      .filter((item): item is PortfolioDiagnosis => Boolean(item));
  } catch {
    return [];
  }
}

function isAlertConditionType(value: unknown): value is AlertConditionType {
  return (
    value === "price_lte" ||
    value === "price_gte" ||
    value === "return_lte" ||
    value === "return_gte" ||
    value === "ma20_below" ||
    value === "rsi_gte_70" ||
    value === "rsi_lte_30"
  );
}

function normalizeAlertCondition(value: unknown): UserAlertCondition | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  const type = raw.type;
  if (!id || !isAlertConditionType(type)) return null;

  return {
    id,
    type,
    threshold:
      typeof raw.threshold === "number" && Number.isFinite(raw.threshold)
        ? raw.threshold
        : null,
    enabled: raw.enabled === false ? false : true,
    createdAt: safeText(raw.createdAt, new Date().toISOString())
  };
}

function parseLocalAlertConditionMap() {
  if (typeof window === "undefined") return {} as Record<string, UserAlertCondition[]>;
  try {
    const raw = window.localStorage.getItem(ALERT_CONDITIONS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    const normalized: Record<string, UserAlertCondition[]> = {};
    const entries = parsed && typeof parsed === "object" ? Object.entries(parsed) : [];
    for (const [holdingId, conditions] of entries) {
      normalized[holdingId] = Array.isArray(conditions)
        ? conditions
            .map(normalizeAlertCondition)
            .filter((item): item is UserAlertCondition => Boolean(item))
        : [];
    }
    return normalized;
  } catch {
    return {};
  }
}

function extractRsiFromDiagnosis(diagnosis: PortfolioDiagnosis) {
  const allText = [
    diagnosis.why,
    ...(Array.isArray(diagnosis.nextChecks) ? diagnosis.nextChecks : []),
    ...(Array.isArray(diagnosis.cautionReasons) ? diagnosis.cautionReasons : [])
  ]
    .filter((item) => typeof item === "string")
    .join(" ");

  const match = allText.match(/RSI\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;
  const value = Number(match[1]);
  return Number.isFinite(value) ? value : null;
}

function evaluateAlertProximity(
  diagnosis: PortfolioDiagnosis,
  conditions: UserAlertCondition[]
) {
  const safeConditions = Array.isArray(conditions) ? conditions : [];
  const messages: string[] = [];

  for (const condition of safeConditions) {
    if (!condition.enabled) continue;
    const threshold =
      typeof condition.threshold === "number" && Number.isFinite(condition.threshold)
        ? condition.threshold
        : null;
    const currentPrice = safeNumber(diagnosis.currentPrice);
    const returnRate = safeNumber(diagnosis.returnRate);
    const rsi = extractRsiFromDiagnosis(diagnosis);
    const cautionText = (Array.isArray(diagnosis.cautionReasons)
      ? diagnosis.cautionReasons
      : []
    ).join(" ");

    if (condition.type === "price_lte" && threshold !== null && threshold > 0) {
      if (currentPrice <= threshold * 1.03) {
        messages.push(`현재가가 하단 조건(${Math.round(threshold).toLocaleString("ko-KR")}원)에 근접`);
      }
    } else if (condition.type === "price_gte" && threshold !== null && threshold > 0) {
      if (currentPrice >= threshold * 0.97) {
        messages.push(`현재가가 상단 조건(${Math.round(threshold).toLocaleString("ko-KR")}원)에 근접`);
      }
    } else if (condition.type === "return_lte" && threshold !== null) {
      if (returnRate <= threshold + 1) {
        messages.push(`수익률이 하단 조건(${threshold.toFixed(1)}%)에 근접`);
      }
    } else if (condition.type === "return_gte" && threshold !== null) {
      if (returnRate >= threshold - 1) {
        messages.push(`수익률이 상단 조건(${threshold.toFixed(1)}%)에 근접`);
      }
    } else if (condition.type === "ma20_below") {
      if (cautionText.includes("MA20 아래")) {
        messages.push("MA20 이탈 확인 필요 신호");
      }
    } else if (condition.type === "rsi_gte_70") {
      if (typeof rsi === "number" && Number.isFinite(rsi) && rsi >= 68) {
        messages.push("RSI 과열 조건에 근접");
      }
    } else if (condition.type === "rsi_lte_30") {
      if (typeof rsi === "number" && Number.isFinite(rsi) && rsi <= 32) {
        messages.push("RSI 과매도 조건에 근접");
      }
    }
  }

  return {
    near: messages.length > 0,
    messages
  };
}

function getRiskLabel(diagnosis: PortfolioDiagnosis) {
  if (
    diagnosis.judgement === "리스크 관리 관찰" ||
    diagnosis.judgement === "비중 조절 검토 구간"
  ) {
    return "리스크 관리 필요";
  }
  if (diagnosis.judgement === "대기 / 확인 필요") return "확인 필요";
  if (diagnosis.judgement === "추가 관찰 가능") return "추가 관찰 가능";
  return "유지 관찰";
}

function buildChecklistItem(
  diagnosis: PortfolioDiagnosis,
  conditions: UserAlertCondition[]
): ChecklistItem {
  const returnRate = safeNumber(diagnosis.returnRate);
  const priceGapRate =
    diagnosis.currentPrice > 0 && diagnosis.recentClosePrice > 0
      ? Math.abs(diagnosis.currentPrice - diagnosis.recentClosePrice) /
        diagnosis.recentClosePrice
      : null;

  const reasons: string[] = [];
  let score = 0;

  if (Math.abs(returnRate) >= 5) {
    score += 3;
    reasons.push("수익률 변동 확대");
  } else if (Math.abs(returnRate) >= 3) {
    score += 2;
    reasons.push("수익률 변동 관찰");
  }

  const riskScore = safeNumber(diagnosis.riskManagementScore);
  if (
    riskScore >= 70 ||
    diagnosis.judgement === "리스크 관리 관찰" ||
    diagnosis.judgement === "비중 조절 검토 구간"
  ) {
    score += 3;
    reasons.push("리스크 상태 상승");
  }

  const proximity = evaluateAlertProximity(diagnosis, conditions);
  if (proximity.near) {
    score += 3;
    reasons.push("알림 조건 근접");
  }

  if (typeof priceGapRate === "number" && Number.isFinite(priceGapRate)) {
    if (priceGapRate >= 0.05) {
      score += 3;
      reasons.push("현재가-종가 차이 확대");
    } else if (priceGapRate >= 0.03) {
      score += 2;
      reasons.push("가격 차이 확인 필요");
    }
  }

  if (score === 0) {
    reasons.push("기본 관찰");
  }

  return {
    id: diagnosis.id,
    symbol: diagnosis.symbol,
    name: diagnosis.stockName || diagnosis.symbol,
    returnRate: Number.isFinite(returnRate) ? returnRate : null,
    riskState: getRiskLabel(diagnosis),
    nearAlert: proximity.near,
    priceGapRate,
    reasons,
    score
  };
}

export function TodayInvestmentChecklist({
  stocks,
  variant = "home",
  sectionId
}: {
  stocks?: Stock[];
  variant?: ChecklistVariant;
  sectionId?: string;
}) {
  const { user, isSupabaseReady } = useAuth();
  const { entries } = usePortfolio();
  const { symbols: watchlistSymbols } = useWatchlist();
  const [diagnoses, setDiagnoses] = useState<PortfolioDiagnosis[]>([]);
  const [cloudAlertMap, setCloudAlertMap] = useState<Record<string, UserAlertCondition[]>>({});
  const [isAlertLoading, setIsAlertLoading] = useState(false);

  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
  const safeEntries = useMemo(() => (Array.isArray(entries) ? entries : []), [entries]);
  const safeWatchlistSymbols = useMemo(
    () =>
      (Array.isArray(watchlistSymbols) ? watchlistSymbols : []).filter(
        (item): item is string => typeof item === "string" && Boolean(item)
      ),
    [watchlistSymbols]
  );

  useEffect(() => {
    setDiagnoses(parseStoredDiagnoses());
  }, [safeEntries.length]);

  useEffect(() => {
    if (!user?.id || !isSupabaseReady || !supabase) {
      setCloudAlertMap({});
      return;
    }

    let cancelled = false;
    setIsAlertLoading(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_alert_rules")
          .select("id, holding_id, rule_type, threshold, enabled, created_at")
          .eq("user_id", user.id);
        if (cancelled) return;
        if (error) {
          setCloudAlertMap({});
          return;
        }
        const safeRows = Array.isArray(data) ? data : [];
        const nextMap: Record<string, UserAlertCondition[]> = {};
        for (const row of safeRows) {
          const holdingId =
            typeof row?.holding_id === "string" ? row.holding_id : "";
          if (!holdingId) continue;
          const condition = normalizeAlertCondition({
            id: row?.id,
            type: row?.rule_type,
            threshold: row?.threshold,
            enabled: row?.enabled,
            createdAt: row?.created_at
          });
          if (!condition) continue;
          if (!Array.isArray(nextMap[holdingId])) {
            nextMap[holdingId] = [];
          }
          nextMap[holdingId].push(condition);
        }
        setCloudAlertMap(nextMap);
      } finally {
        if (!cancelled) setIsAlertLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSupabaseReady, user?.id]);

  const localAlertMap = useMemo(() => parseLocalAlertConditionMap(), [safeEntries.length]);
  const alertMap = useMemo(() => {
    if (user?.id && Object.keys(cloudAlertMap).length > 0) {
      return cloudAlertMap;
    }
    return localAlertMap;
  }, [cloudAlertMap, localAlertMap, user?.id]);

  const diagnosisById = useMemo(() => {
    const map = new Map<string, PortfolioDiagnosis>();
    const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
    for (const item of safeDiagnoses) {
      if (typeof item?.id === "string" && item.id) map.set(item.id, item);
    }
    return map;
  }, [diagnoses]);

  const portfolioChecklistItems = useMemo(() => {
    const items: ChecklistItem[] = [];
    const safe = Array.isArray(safeEntries) ? safeEntries : [];
    for (const entry of safe) {
      const diagnosis = diagnosisById.get(entry.id);
      if (!diagnosis) continue;
      const conditions = Array.isArray(alertMap[entry.id]) ? alertMap[entry.id] : [];
      items.push(buildChecklistItem(diagnosis, conditions));
    }
    return items.sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(safeNumber(b.returnRate)) - Math.abs(safeNumber(a.returnRate))
    );
  }, [alertMap, diagnosisById, safeEntries]);

  const watchlistOnlyItems = useMemo(() => {
    if (variant !== "home") return [] as ChecklistItem[];
    const items: ChecklistItem[] = [];
    const holdingSymbols = new Set(
      portfolioChecklistItems.map((item) => item.symbol).filter(Boolean)
    );
    const stockEntries = safeStocks.reduce<Array<[string, Stock]>>((acc, stock) => {
      if (typeof stock?.symbol !== "string" || !stock.symbol) return acc;
      acc.push([stock.symbol, stock]);
      return acc;
    }, []);
    const stockMap = new Map<string, Stock>(stockEntries);
    for (const symbol of safeWatchlistSymbols) {
      if (holdingSymbols.has(symbol)) continue;
      const stock = stockMap.get(symbol);
      if (!stock) continue;
      const reasons: string[] = [];
      let score = 0;
      const changeRate = safeNumber(stock.changeRate);
      if (Math.abs(changeRate) >= 4) {
        score += 2;
        reasons.push("등락률 변동 관찰");
      }
      if (stock.priceAnomaly === "critical") {
        score += 3;
        reasons.push("데이터 검증 필요");
      } else if (stock.priceAnomaly === "warning") {
        score += 2;
        reasons.push("가격 확인 필요");
      }
      if (score === 0) reasons.push("관심종목 기본 관찰");
      items.push({
        id: `watch-${symbol}`,
        symbol,
        name: stock.koreanName || stock.symbol,
        returnRate: changeRate,
        riskState:
          stock.priceAnomaly === "critical"
            ? "리스크 관리 필요"
            : stock.priceAnomaly === "warning"
              ? "확인 필요"
              : "유지 관찰",
        nearAlert: false,
        priceGapRate:
          typeof stock.priceAnomalyGapRate === "number" &&
          Number.isFinite(stock.priceAnomalyGapRate)
            ? stock.priceAnomalyGapRate
            : null,
        reasons,
        score
      });
    }
    return items.sort(
      (a, b) =>
        b.score - a.score ||
        Math.abs(safeNumber(b.returnRate)) - Math.abs(safeNumber(a.returnRate))
    );
  }, [portfolioChecklistItems, safeStocks, safeWatchlistSymbols, variant]);

  const mergedItems = useMemo(
    () => [...portfolioChecklistItems, ...watchlistOnlyItems],
    [portfolioChecklistItems, watchlistOnlyItems]
  );

  const top3 = useMemo(() => mergedItems.slice(0, 3), [mergedItems]);

  const riskUpItems = useMemo(
    () =>
      portfolioChecklistItems.filter(
        (item) =>
          item.riskState === "리스크 관리 필요" || item.riskState === "확인 필요"
      ),
    [portfolioChecklistItems]
  );

  const profitObservationItems = useMemo(
    () =>
      portfolioChecklistItems.filter(
        (item) =>
          typeof item.returnRate === "number" &&
          Number.isFinite(item.returnRate) &&
          item.returnRate >= 5 &&
          (item.riskState === "유지 관찰" || item.riskState === "비중 조절 검토")
      ),
    [portfolioChecklistItems]
  );

  const alertNearItems = useMemo(
    () => portfolioChecklistItems.filter((item) => item.nearAlert),
    [portfolioChecklistItems]
  );

  const headline = useMemo(() => {
    if (riskUpItems.length > 0) {
      return "오늘은 공격적인 매수보다 보유 종목 리스크 점검이 더 중요합니다.";
    }
    if (top3.length > 0) {
      return "현재 포트폴리오는 유지 관찰 구간입니다.";
    }
    return "보유종목을 추가하면 오늘의 체크리스트를 만들 수 있습니다.";
  }, [riskUpItems.length, top3.length]);

  const hasAnyData =
    top3.length > 0 ||
    riskUpItems.length > 0 ||
    profitObservationItems.length > 0 ||
    alertNearItems.length > 0;

  const showEmpty = !hasAnyData && safeEntries.length === 0 && safeWatchlistSymbols.length === 0;
  const title = "오늘의 투자 체크리스트";
  const sourceText =
    "KIS 현재가와 data.go.kr 일별 종가를 함께 참고한 체크리스트입니다.";

  return (
    <section
      id={sectionId}
      className="scroll-mt-32 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-normal text-brand">Checklist</p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">{title}</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            {sourceText}
          </p>
        </div>
        <span className="inline-flex items-center gap-1 rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          <ClipboardList className="h-3.5 w-3.5" />
          {isAlertLoading ? "체크 중..." : `TOP ${top3.length}`}
        </span>
      </div>

      <div className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
        {headline}
      </div>

      {showEmpty ? (
        <div className="mt-3">
          <EmptyState
            compact
            title="보유종목을 추가하면 오늘의 체크리스트를 만들 수 있습니다."
            description={user?.id ? "클라우드 보유종목 기준으로 체크리스트를 생성합니다." : "로컬 보유종목과 관심종목 기준으로 체크리스트를 생성합니다."}
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <article className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-ink dark:text-white">오늘 먼저 볼 TOP 3</h3>
            {top3.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                데이터 없음
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {top3.map((item) => (
                  <li key={item.id} className="rounded-md border border-line bg-white px-3 py-2 dark:border-dark-line dark:bg-dark-panel">
                    <Link href={`/stocks/${item.symbol}`} className="block">
                      <p className="truncate text-sm font-bold text-ink dark:text-white">
                        {item.name} · {item.symbol}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                        {item.reasons.slice(0, 2).join(" · ") || "관찰 필요"}
                      </p>
                      <p className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {typeof item.returnRate === "number" && Number.isFinite(item.returnRate)
                          ? `수익률 ${formatPercent(item.returnRate)}`
                          : "수익률 데이터 없음"}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-ink dark:text-white">리스크 상승 종목</h3>
            {riskUpItems.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                현재 리스크가 크게 상승한 종목은 없습니다.
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {riskUpItems.slice(0, 3).map((item) => (
                  <li key={`risk-${item.id}`} className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                    {item.name} · {item.symbol} · {item.riskState}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-ink dark:text-white">수익 관찰 종목</h3>
            {profitObservationItems.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                데이터 없음
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {profitObservationItems.slice(0, 3).map((item) => (
                  <li key={`profit-${item.id}`} className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                    {item.name} · {item.symbol} · {typeof item.returnRate === "number" ? formatPercent(item.returnRate) : "데이터 없음"}
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-ink dark:text-white">알림 조건 확인</h3>
            {alertNearItems.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                오늘 확인할 알림 조건은 없습니다.
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {alertNearItems.slice(0, 3).map((item) => (
                  <li key={`alert-${item.id}`} className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-dark-line dark:bg-dark-panel dark:text-slate-200">
                    <p className="truncate font-bold">
                      {item.name} · {item.symbol}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                      알림 조건에 근접했습니다.
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>
        </div>
      )}

      {!showEmpty && (
        <div className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
          <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            오늘 한 줄 판단
          </span>
          <p className="mt-1">{headline}</p>
        </div>
      )}

      <div className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-5 text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-400">
        <p>{sourceText}</p>
        {!user?.id ? (
          <p className="mt-1">비로그인 상태에서는 localStorage 보유종목/관심종목 기준으로 생성됩니다.</p>
        ) : null}
      </div>
    </section>
  );
}
