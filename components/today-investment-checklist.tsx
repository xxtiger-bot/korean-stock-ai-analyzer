"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, ClipboardList } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { usePortfolio } from "@/components/portfolio-provider";
import { useWatchlist } from "@/components/watchlist-provider";
import { EmptyState } from "@/components/ui-states";
import { formatKRW, formatPercent } from "@/lib/format";
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

type ChecklistStatusTag = "리스크 상승" | "수익 관찰" | "알림 근접" | "데이터 확인 필요" | "유지 관찰";

type AlertNearDetail = {
  key: string;
  symbol: string;
  name: string;
  holdingId: string;
  conditionLabel: string;
  conditionValue: number | null;
  currentValue: number | null;
  gapRate: number | null;
  message: string;
};

type ChecklistItem = {
  id: string;
  symbol: string;
  name: string;
  holdingId: string;
  returnRate: number | null;
  statusTag: ChecklistStatusTag;
  riskStatus: string;
  aiScore: number | null;
  nearAlertCount: number;
  priceGapRate: number | null;
  reasons: string[];
  oneLineReason: string;
  score: number;
  alertNearDetails: AlertNearDetail[];
  source: "holding" | "watchlist";
};

type RiskSnapshot = {
  id: string;
  snapshotDate: string;
  symbol: string;
  holdingId: string;
  stockName: string;
  riskStatus: string;
  aiScore: number | null;
  returnRate: number | null;
  currentPrice: number | null;
  buyPrice: number | null;
  quantity: number | null;
  alertNearCount: number;
  payload: Record<string, unknown>;
  createdAt: string;
};

type RiskChangeDirection = "상승" | "하락" | "유지" | "비교 불가";

type RiskChangeItem = {
  symbol: string;
  name: string;
  yesterdayStatus: string;
  todayStatus: string;
  direction: RiskChangeDirection;
  reason: string;
};

type ChecklistVariant = "home" | "portfolio";

const ALERT_CONDITIONS_STORAGE_KEY = "krx-insight-portfolio-alert-conditions";
const RISK_SNAPSHOTS_STORAGE_KEY = "krx_risk_snapshots";

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function getKstDateString() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
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
    quoteSource: raw.quoteSource === "KIS" ? "KIS" : "data.go.kr fallback",
    buyPrice: safeNumber(raw.buyPrice) ?? 0,
    quantity: safeNumber(raw.quantity) ?? 0,
    currentPrice: safeNumber(raw.currentPrice) ?? 0,
    recentClosePrice: safeNumber(raw.recentClosePrice) ?? 0,
    valuationAmount: safeNumber(raw.valuationAmount) ?? 0,
    profitLoss: safeNumber(raw.profitLoss) ?? 0,
    returnRate: safeNumber(raw.returnRate) ?? 0,
    holdingHealthScore: safeNumber(raw.holdingHealthScore) ?? 0,
    addObservationScore: safeNumber(raw.addObservationScore) ?? 0,
    riskManagementScore: safeNumber(raw.riskManagementScore) ?? 0,
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
    threshold: safeNumber(raw.threshold),
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

function getConditionLabel(type: AlertConditionType) {
  if (type === "price_lte") return "현재가 하단 조건";
  if (type === "price_gte") return "현재가 상단 조건";
  if (type === "return_lte") return "수익률 하단 조건";
  if (type === "return_gte") return "수익률 상단 조건";
  if (type === "ma20_below") return "MA20 이탈 조건";
  if (type === "rsi_gte_70") return "RSI 70 이상 조건";
  return "RSI 30 이하 조건";
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

function getRiskStatusLabel(diagnosis: PortfolioDiagnosis) {
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

function getStatusTagClass(tag: ChecklistStatusTag) {
  if (tag === "리스크 상승") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  }
  if (tag === "수익 관찰") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (tag === "알림 근접") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100";
  }
  if (tag === "데이터 확인 필요") {
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-200";
  }
  return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200";
}

function evaluateAlertProximity(
  diagnosis: PortfolioDiagnosis,
  conditions: UserAlertCondition[]
) {
  const details: AlertNearDetail[] = [];
  const safeConditions = Array.isArray(conditions) ? conditions : [];
  const currentPrice = safeNumber(diagnosis.currentPrice);
  const returnRate = safeNumber(diagnosis.returnRate);
  const rsi = extractRsiFromDiagnosis(diagnosis);
  const cautionText = (Array.isArray(diagnosis.cautionReasons) ? diagnosis.cautionReasons : []).join(" ");

  for (const condition of safeConditions) {
    if (!condition.enabled) continue;
    const threshold = safeNumber(condition.threshold);
    const conditionLabel = getConditionLabel(condition.type);

    if (condition.type === "price_lte" && currentPrice !== null && threshold !== null && threshold > 0) {
      const diffRate = Math.abs(currentPrice - threshold) / threshold;
      if (currentPrice <= threshold * 1.03) {
        details.push({
          key: `${diagnosis.id}-${condition.id}`,
          symbol: diagnosis.symbol,
          name: diagnosis.stockName || diagnosis.symbol,
          holdingId: diagnosis.id,
          conditionLabel,
          conditionValue: threshold,
          currentValue: currentPrice,
          gapRate: diffRate,
          message: `현재가가 설정 하단 조건(${formatKRW(threshold)})에 근접했습니다.`
        });
      }
      continue;
    }

    if (condition.type === "price_gte" && currentPrice !== null && threshold !== null && threshold > 0) {
      const diffRate = Math.abs(currentPrice - threshold) / threshold;
      if (currentPrice >= threshold * 0.97) {
        details.push({
          key: `${diagnosis.id}-${condition.id}`,
          symbol: diagnosis.symbol,
          name: diagnosis.stockName || diagnosis.symbol,
          holdingId: diagnosis.id,
          conditionLabel,
          conditionValue: threshold,
          currentValue: currentPrice,
          gapRate: diffRate,
          message: `현재가가 설정 상단 조건(${formatKRW(threshold)})에 근접했습니다.`
        });
      }
      continue;
    }

    if (condition.type === "return_lte" && returnRate !== null && threshold !== null) {
      const diffRate = Math.abs(returnRate - threshold) / Math.max(Math.abs(threshold), 1);
      if (returnRate <= threshold + 1) {
        details.push({
          key: `${diagnosis.id}-${condition.id}`,
          symbol: diagnosis.symbol,
          name: diagnosis.stockName || diagnosis.symbol,
          holdingId: diagnosis.id,
          conditionLabel,
          conditionValue: threshold,
          currentValue: returnRate,
          gapRate: diffRate,
          message: `수익률이 하단 조건(${threshold.toFixed(1)}%)에 근접했습니다.`
        });
      }
      continue;
    }

    if (condition.type === "return_gte" && returnRate !== null && threshold !== null) {
      const diffRate = Math.abs(returnRate - threshold) / Math.max(Math.abs(threshold), 1);
      if (returnRate >= threshold - 1) {
        details.push({
          key: `${diagnosis.id}-${condition.id}`,
          symbol: diagnosis.symbol,
          name: diagnosis.stockName || diagnosis.symbol,
          holdingId: diagnosis.id,
          conditionLabel,
          conditionValue: threshold,
          currentValue: returnRate,
          gapRate: diffRate,
          message: `수익률이 상단 조건(${threshold.toFixed(1)}%)에 근접했습니다.`
        });
      }
      continue;
    }

    if (condition.type === "ma20_below" && cautionText.includes("MA20 아래")) {
      details.push({
        key: `${diagnosis.id}-${condition.id}`,
        symbol: diagnosis.symbol,
        name: diagnosis.stockName || diagnosis.symbol,
        holdingId: diagnosis.id,
        conditionLabel,
        conditionValue: null,
        currentValue: null,
        gapRate: null,
        message: "MA20 이탈 확인 신호가 감지되었습니다."
      });
      continue;
    }

    if (condition.type === "rsi_gte_70" && rsi !== null && rsi >= 68) {
      details.push({
        key: `${diagnosis.id}-${condition.id}`,
        symbol: diagnosis.symbol,
        name: diagnosis.stockName || diagnosis.symbol,
        holdingId: diagnosis.id,
        conditionLabel,
        conditionValue: 70,
        currentValue: rsi,
        gapRate: Math.abs(rsi - 70) / 70,
        message: "RSI 과열 조건에 근접했습니다."
      });
      continue;
    }

    if (condition.type === "rsi_lte_30" && rsi !== null && rsi <= 32) {
      details.push({
        key: `${diagnosis.id}-${condition.id}`,
        symbol: diagnosis.symbol,
        name: diagnosis.stockName || diagnosis.symbol,
        holdingId: diagnosis.id,
        conditionLabel,
        conditionValue: 30,
        currentValue: rsi,
        gapRate: Math.abs(rsi - 30) / 30,
        message: "RSI 과매도 조건에 근접했습니다."
      });
    }
  }

  return {
    near: details.length > 0,
    details
  };
}

function buildChecklistItem(diagnosis: PortfolioDiagnosis, conditions: UserAlertCondition[]): ChecklistItem {
  const returnRate = safeNumber(diagnosis.returnRate);
  const riskScore = safeNumber(diagnosis.riskManagementScore);
  const aiScore = safeNumber(diagnosis.holdingHealthScore);
  const currentPrice = safeNumber(diagnosis.currentPrice);
  const recentClose = safeNumber(diagnosis.recentClosePrice);
  const priceGapRate =
    currentPrice !== null && recentClose !== null && recentClose > 0
      ? Math.abs(currentPrice - recentClose) / recentClose
      : null;
  const proximity = evaluateAlertProximity(diagnosis, conditions);

  const reasons: string[] = [];
  let score = 0;

  if (returnRate !== null && Math.abs(returnRate) >= 5) {
    score += 3;
    reasons.push("수익률 변동이 큽니다.");
  } else if (returnRate !== null && Math.abs(returnRate) >= 3) {
    score += 2;
    reasons.push("수익률 변동을 확인할 필요가 있습니다.");
  }

  if (
    (riskScore !== null && riskScore >= 70) ||
    diagnosis.judgement === "리스크 관리 관찰" ||
    diagnosis.judgement === "비중 조절 검토 구간"
  ) {
    score += 3;
    reasons.push("리스크 상태가 상승했습니다.");
  }

  if (proximity.near) {
    score += 3;
    reasons.push("알림 조건에 근접했습니다.");
  }

  if (priceGapRate !== null && priceGapRate >= 0.05) {
    score += 3;
    reasons.push("현재가와 최근 종가 차이가 큽니다.");
  } else if (priceGapRate !== null && priceGapRate >= 0.03) {
    score += 2;
    reasons.push("가격 차이 확인이 필요합니다.");
  }

  if (aiScore !== null && aiScore <= 45) {
    score += 2;
    reasons.push("AI 판단 점수가 낮아 점검이 필요합니다.");
  }

  if (reasons.length === 0) {
    reasons.push("현재는 기본 관찰 구간입니다.");
  }

  let statusTag: ChecklistStatusTag = "유지 관찰";
  if (priceGapRate !== null && priceGapRate >= 0.05) {
    statusTag = "데이터 확인 필요";
  } else if (
    (riskScore !== null && riskScore >= 70) ||
    diagnosis.judgement === "리스크 관리 관찰" ||
    diagnosis.judgement === "비중 조절 검토 구간"
  ) {
    statusTag = "리스크 상승";
  } else if (proximity.near) {
    statusTag = "알림 근접";
  } else if (returnRate !== null && returnRate >= 5) {
    statusTag = "수익 관찰";
  }

  return {
    id: diagnosis.id,
    holdingId: diagnosis.id,
    symbol: diagnosis.symbol,
    name: diagnosis.stockName || diagnosis.symbol,
    returnRate,
    statusTag,
    riskStatus: getRiskStatusLabel(diagnosis),
    aiScore,
    nearAlertCount: proximity.details.length,
    priceGapRate,
    reasons,
    oneLineReason: reasons[0] ?? "현재는 관찰 구간입니다.",
    score,
    alertNearDetails: proximity.details,
    source: "holding"
  };
}

function normalizeRiskSnapshot(value: unknown): RiskSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  const snapshotDate = safeText(raw.snapshot_date ?? raw.snapshotDate);
  const symbol = safeText(raw.symbol);
  if (!id || !snapshotDate || !symbol) return null;
  const payload =
    typeof raw.payload === "object" && raw.payload !== null && !Array.isArray(raw.payload)
      ? (raw.payload as Record<string, unknown>)
      : {};
  return {
    id,
    snapshotDate,
    symbol,
    holdingId: safeText(raw.holding_id ?? raw.holdingId),
    stockName: safeText(raw.stock_name ?? raw.stockName, symbol),
    riskStatus: safeText(raw.risk_status ?? raw.riskStatus, "비교 불가"),
    aiScore: safeNumber(raw.ai_score ?? raw.aiScore),
    returnRate: safeNumber(raw.return_rate ?? raw.returnRate),
    currentPrice: safeNumber(raw.current_price ?? raw.currentPrice),
    buyPrice: safeNumber(raw.buy_price ?? raw.buyPrice),
    quantity: safeNumber(raw.quantity),
    alertNearCount: safeNumber(raw.alert_near_count ?? raw.alertNearCount) ?? 0,
    payload,
    createdAt: safeText(raw.created_at ?? raw.createdAt, new Date().toISOString())
  };
}

function parseLocalRiskSnapshots() {
  if (typeof window === "undefined") return [] as RiskSnapshot[];
  try {
    const raw = window.localStorage.getItem(RISK_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const safeList = Array.isArray(parsed) ? parsed : [];
    return safeList
      .map(normalizeRiskSnapshot)
      .filter((item): item is RiskSnapshot => Boolean(item));
  } catch {
    return [];
  }
}

function saveLocalRiskSnapshots(items: RiskSnapshot[]) {
  if (typeof window === "undefined") return;
  const safeItems = Array.isArray(items) ? items : [];
  try {
    window.localStorage.setItem(RISK_SNAPSHOTS_STORAGE_KEY, JSON.stringify(safeItems));
  } catch {
    // ignore localStorage failures
  }
}

function getStatusRank(status: string) {
  if (status === "리스크 관리 필요") return 5;
  if (status === "확인 필요") return 4;
  if (status === "비중 조절 검토") return 3;
  if (status === "유지 관찰") return 2;
  if (status === "추가 관찰 가능") return 1;
  return 0;
}

function formatCloudError(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message.trim();
  }
  return "알 수 없는 오류";
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
  const [riskSnapshots, setRiskSnapshots] = useState<RiskSnapshot[]>([]);
  const [snapshotNotice, setSnapshotNotice] = useState("");
  const persistSignatureRef = useRef("");

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
          const holdingId = typeof row?.holding_id === "string" ? row.holding_id : "";
          if (!holdingId) continue;
          const condition = normalizeAlertCondition({
            id: row?.id,
            type: row?.rule_type,
            threshold: row?.threshold,
            enabled: row?.enabled,
            createdAt: row?.created_at
          });
          if (!condition) continue;
          if (!Array.isArray(nextMap[holdingId])) nextMap[holdingId] = [];
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

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshots() {
      if (user?.id && isSupabaseReady && supabase) {
        const { data, error } = await supabase
          .from("portfolio_risk_snapshots")
          .select(
            "id,snapshot_date,symbol,holding_id,stock_name,risk_status,ai_score,return_rate,current_price,buy_price,quantity,alert_near_count,payload,created_at"
          )
          .eq("user_id", user.id)
          .order("snapshot_date", { ascending: false })
          .limit(500);
        if (cancelled) return;
        if (error) {
          setSnapshotNotice("리스크 스냅샷 조회 실패로 로컬 기록을 사용합니다.");
          setRiskSnapshots(parseLocalRiskSnapshots());
          return;
        }
        const safeRows = Array.isArray(data) ? data : [];
        const normalized = safeRows
          .map(normalizeRiskSnapshot)
          .filter((item): item is RiskSnapshot => Boolean(item));
        setRiskSnapshots(normalized);
        return;
      }

      setRiskSnapshots(parseLocalRiskSnapshots());
    }

    void loadSnapshots();

    return () => {
      cancelled = true;
    };
  }, [isSupabaseReady, user?.id]);

  const localAlertMap = useMemo(() => parseLocalAlertConditionMap(), [safeEntries.length]);
  const alertMap = useMemo(() => {
    if (user?.id && Object.keys(cloudAlertMap).length > 0) return cloudAlertMap;
    return localAlertMap;
  }, [cloudAlertMap, localAlertMap, user?.id]);

  const hasAnyAlertRules = useMemo(
    () => Object.values(alertMap).some((items) => Array.isArray(items) && items.length > 0),
    [alertMap]
  );

  const diagnosisById = useMemo(() => {
    const map = new Map<string, PortfolioDiagnosis>();
    const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
    for (const item of safeDiagnoses) {
      if (typeof item?.id === "string" && item.id) map.set(item.id, item);
    }
    return map;
  }, [diagnoses]);

  const holdingItems = useMemo(() => {
    const items: ChecklistItem[] = [];
    const safePortfolioEntries = Array.isArray(safeEntries) ? safeEntries : [];
    for (const entry of safePortfolioEntries) {
      const diagnosis = diagnosisById.get(entry.id);
      if (!diagnosis) continue;
      const conditions = Array.isArray(alertMap[entry.id]) ? alertMap[entry.id] : [];
      items.push(buildChecklistItem(diagnosis, conditions));
    }
    return items.sort((a, b) => b.score - a.score || Math.abs((b.returnRate ?? 0)) - Math.abs((a.returnRate ?? 0)));
  }, [alertMap, diagnosisById, safeEntries]);

  const watchlistItems = useMemo(() => {
    if (variant !== "home") return [] as ChecklistItem[];
    const items: ChecklistItem[] = [];
    const holdingSymbols = new Set(holdingItems.map((item) => item.symbol));
    const stockMap = new Map<string, Stock>();
    for (const stock of safeStocks) {
      if (typeof stock.symbol !== "string" || !stock.symbol) continue;
      stockMap.set(stock.symbol, stock);
    }

    for (const symbol of safeWatchlistSymbols) {
      if (holdingSymbols.has(symbol)) continue;
      const stock = stockMap.get(symbol);
      if (!stock) continue;
      const changeRate = safeNumber(stock.changeRate);
      const reasons: string[] = [];
      let score = 0;
      let statusTag: ChecklistStatusTag = "유지 관찰";
      if (stock.priceAnomaly === "critical") {
        score += 3;
        reasons.push("데이터 검증이 필요합니다.");
        statusTag = "데이터 확인 필요";
      } else if (stock.priceAnomaly === "warning") {
        score += 2;
        reasons.push("가격 차이를 확인할 필요가 있습니다.");
        statusTag = "데이터 확인 필요";
      }
      if (changeRate !== null && Math.abs(changeRate) >= 4) {
        score += 2;
        reasons.push("등락률 변동이 큽니다.");
      }
      if (reasons.length === 0) reasons.push("관심종목 기본 관찰 구간입니다.");

      items.push({
        id: `watch-${symbol}`,
        holdingId: "",
        symbol,
        name: stock.koreanName || stock.symbol,
        returnRate: changeRate,
        statusTag,
        riskStatus: statusTag === "데이터 확인 필요" ? "확인 필요" : "유지 관찰",
        aiScore: null,
        nearAlertCount: 0,
        priceGapRate: safeNumber(stock.priceAnomalyGapRate),
        reasons,
        oneLineReason: reasons[0] ?? "기본 관찰 구간입니다.",
        score,
        alertNearDetails: [],
        source: "watchlist"
      });
    }
    return items.sort((a, b) => b.score - a.score || Math.abs((b.returnRate ?? 0)) - Math.abs((a.returnRate ?? 0)));
  }, [holdingItems, safeStocks, safeWatchlistSymbols, variant]);

  const mergedItems = useMemo(() => [...holdingItems, ...watchlistItems], [holdingItems, watchlistItems]);
  const top3 = useMemo(() => mergedItems.slice(0, 3), [mergedItems]);

  const riskUpItems = useMemo(
    () => holdingItems.filter((item) => item.statusTag === "리스크 상승"),
    [holdingItems]
  );

  const profitObservationItems = useMemo(
    () => holdingItems.filter((item) => item.statusTag === "수익 관찰"),
    [holdingItems]
  );

  const alertNearItems = useMemo(() => {
    const nearDetails = holdingItems.flatMap((item) =>
      Array.isArray(item.alertNearDetails) ? item.alertNearDetails : []
    );
    return nearDetails
      .sort((a, b) => {
        const left = a.gapRate ?? Number.MAX_SAFE_INTEGER;
        const right = b.gapRate ?? Number.MAX_SAFE_INTEGER;
        return left - right;
      })
      .slice(0, 5);
  }, [holdingItems]);

  const todayDate = useMemo(() => getKstDateString(), []);

  useEffect(() => {
    if (holdingItems.length === 0) return;

    const todayRows: RiskSnapshot[] = holdingItems.map((item) => ({
      id: `${todayDate}-${item.holdingId || item.symbol}`,
      snapshotDate: todayDate,
      symbol: item.symbol,
      holdingId: item.holdingId,
      stockName: item.name,
      riskStatus: item.riskStatus,
      aiScore: item.aiScore,
      returnRate: item.returnRate,
      currentPrice: null,
      buyPrice: null,
      quantity: null,
      alertNearCount: item.nearAlertCount,
      payload: {
        statusTag: item.statusTag,
        reason: item.oneLineReason,
        score: item.score
      },
      createdAt: new Date().toISOString()
    }));

    const persistSignature = `${user?.id ?? "local"}:${todayDate}:${todayRows
      .map((row) => `${row.id}-${row.riskStatus}-${row.alertNearCount}-${row.returnRate ?? 0}`)
      .join("|")}`;

    if (persistSignatureRef.current === persistSignature) return;
    persistSignatureRef.current = persistSignature;

    const updateLocalSnapshots = () => {
      const previous = parseLocalRiskSnapshots();
      const mergedMap = new Map<string, RiskSnapshot>();
      for (const snapshot of previous) {
        mergedMap.set(snapshot.id, snapshot);
      }
      for (const snapshot of todayRows) {
        mergedMap.set(snapshot.id, snapshot);
      }
      const merged = Array.from(mergedMap.values()).sort((left, right) =>
        `${right.snapshotDate}-${right.createdAt}`.localeCompare(`${left.snapshotDate}-${left.createdAt}`)
      );
      saveLocalRiskSnapshots(merged);
      setRiskSnapshots((current) => {
        const currentMap = new Map<string, RiskSnapshot>();
        for (const snapshot of current) currentMap.set(snapshot.id, snapshot);
        for (const snapshot of todayRows) currentMap.set(snapshot.id, snapshot);
        return Array.from(currentMap.values()).sort((left, right) =>
          `${right.snapshotDate}-${right.createdAt}`.localeCompare(`${left.snapshotDate}-${left.createdAt}`)
        );
      });
    };

    if (user?.id && isSupabaseReady && supabase) {
      void (async () => {
        try {
          const cloudRows = todayRows.map((row) => ({
            user_id: user.id,
            id: row.id,
            snapshot_date: row.snapshotDate,
            symbol: row.symbol,
            holding_id: row.holdingId || null,
            stock_name: row.stockName,
            risk_status: row.riskStatus,
            ai_score: row.aiScore,
            return_rate: row.returnRate,
            current_price: row.currentPrice,
            buy_price: row.buyPrice,
            quantity: row.quantity,
            alert_near_count: row.alertNearCount,
            payload: row.payload
          }));
          const { error } = await supabase
            .from("portfolio_risk_snapshots")
            .upsert(cloudRows, { onConflict: "user_id,id" });
          if (error) {
            setSnapshotNotice(`리스크 스냅샷 저장 실패: ${formatCloudError(error)} (로컬 저장 사용)`);
            updateLocalSnapshots();
            return;
          }
          setRiskSnapshots((current) => {
            const currentMap = new Map<string, RiskSnapshot>();
            for (const snapshot of current) currentMap.set(snapshot.id, snapshot);
            for (const snapshot of todayRows) currentMap.set(snapshot.id, snapshot);
            return Array.from(currentMap.values()).sort((left, right) =>
              `${right.snapshotDate}-${right.createdAt}`.localeCompare(`${left.snapshotDate}-${left.createdAt}`)
            );
          });
        } catch (error) {
          setSnapshotNotice(`리스크 스냅샷 저장 실패: ${formatCloudError(error)} (로컬 저장 사용)`);
          updateLocalSnapshots();
        }
      })();
      return;
    }

    updateLocalSnapshots();
  }, [holdingItems, isSupabaseReady, todayDate, user?.id]);

  const riskChanges = useMemo(() => {
    if (!Array.isArray(holdingItems) || holdingItems.length === 0) return [] as RiskChangeItem[];
    const safeSnapshots = Array.isArray(riskSnapshots) ? riskSnapshots : [];
    const result: RiskChangeItem[] = [];

    for (const item of holdingItems) {
      const previous = safeSnapshots
        .filter((snapshot) => snapshot.symbol === item.symbol && snapshot.snapshotDate < todayDate)
        .sort((a, b) => b.snapshotDate.localeCompare(a.snapshotDate))[0];

      if (!previous) {
        result.push({
          symbol: item.symbol,
          name: item.name,
          yesterdayStatus: "기록 없음",
          todayStatus: item.riskStatus,
          direction: "비교 불가",
          reason: "오늘부터 리스크 변화를 추적합니다."
        });
        continue;
      }

      const prevRank = getStatusRank(previous.riskStatus);
      const nowRank = getStatusRank(item.riskStatus);
      const direction: RiskChangeDirection =
        nowRank > prevRank ? "상승" : nowRank < prevRank ? "하락" : "유지";
      result.push({
        symbol: item.symbol,
        name: item.name,
        yesterdayStatus: previous.riskStatus,
        todayStatus: item.riskStatus,
        direction,
        reason: item.oneLineReason
      });
    }

    return result;
  }, [holdingItems, riskSnapshots, todayDate]);

  const headline = useMemo(() => {
    if (top3.some((item) => item.statusTag === "데이터 확인 필요")) {
      return "데이터 불일치가 있는 종목은 매매 판단 전에 가격을 다시 확인해주세요.";
    }
    if (riskUpItems.length > 0) {
      return "오늘은 공격적인 매수보다 보유 종목 리스크 점검이 더 중요합니다.";
    }
    if (top3.some((item) => item.statusTag === "알림 근접")) {
      return "일부 종목이 알림 조건에 가까워져 우선 확인이 필요합니다.";
    }
    if (profitObservationItems.length > 0) {
      return "현재 포트폴리오는 유지 관찰 구간입니다.";
    }
    return "일별 데이터 기준으로 기본 관찰 구간입니다.";
  }, [profitObservationItems.length, riskUpItems.length, top3]);

  const hasAnyData = top3.length > 0 || riskChanges.length > 0 || alertNearItems.length > 0;
  const showEmpty =
    !hasAnyData &&
    safeEntries.length === 0 &&
    safeWatchlistSymbols.length === 0;

  return (
    <section
      id={sectionId}
      className="scroll-mt-32 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-normal text-brand">Checklist</p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">오늘의 투자 체크리스트</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            KIS 현재가와 data.go.kr 일별 종가를 함께 참고한 체크리스트입니다.
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
            title="보유종목을 추가하면 오늘의 투자 체크리스트를 만들 수 있습니다."
            description={
              user?.id
                ? "클라우드 보유종목 기준으로 체크리스트를 생성합니다."
                : "로컬 보유종목과 관심종목 기준으로 체크리스트를 생성합니다."
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-3">
          <article className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-ink dark:text-white">오늘 먼저 확인할 종목 TOP 3</h3>
            {top3.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">데이터 없음</p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {top3.map((item) => (
                  <li key={item.id} className="rounded-md border border-line bg-white px-3 py-2 dark:border-dark-line dark:bg-dark-panel">
                    <Link href={`/stocks/${item.symbol}`} className="block">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="min-w-0 flex-1 truncate text-sm font-bold text-ink dark:text-white">
                          {item.name} · {item.symbol}
                        </p>
                        <span className={`rounded-md border px-2 py-1 text-[11px] font-bold ${getStatusTagClass(item.statusTag)}`}>
                          {item.statusTag}
                        </span>
                      </div>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                        {item.oneLineReason}
                      </p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-ink dark:text-white">리스크 변화</h3>
            {riskChanges.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                아직 비교할 이전 기록이 없습니다. 오늘부터 변화 추적을 시작합니다.
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {(variant === "home" ? riskChanges.slice(0, 3) : riskChanges).map((item) => (
                  <li key={`${item.symbol}-${item.direction}`} className="rounded-md border border-line bg-white px-3 py-2 dark:border-dark-line dark:bg-dark-panel">
                    <p className="text-sm font-bold text-ink dark:text-white">
                      {item.name} · {item.symbol}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      어제: {item.yesterdayStatus} → 오늘: {item.todayStatus}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                      변화: {item.direction} · {item.reason}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          <article className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
            <h3 className="text-sm font-bold text-ink dark:text-white">알림 조건 근접</h3>
            {!hasAnyAlertRules ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                설정된 알림 조건이 없습니다.
              </p>
            ) : alertNearItems.length === 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                오늘 확인할 알림 조건은 없습니다.
              </p>
            ) : (
              <ul className="mt-2 grid gap-2">
                {(variant === "home" ? alertNearItems.slice(0, 3) : alertNearItems).map((item) => (
                  <li key={item.key} className="rounded-md border border-line bg-white px-3 py-2 dark:border-dark-line dark:bg-dark-panel">
                    <p className="truncate text-sm font-bold text-ink dark:text-white">
                      {item.name} · {item.symbol}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      {item.conditionLabel}: {item.conditionValue !== null ? formatKRW(item.conditionValue) : "데이터 없음"}
                    </p>
                    <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      현재값: {item.currentValue !== null ? formatKRW(item.currentValue) : "확인 불가"}
                    </p>
                    <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      차이율: {item.gapRate !== null && Number.isFinite(item.gapRate) ? formatPercent(item.gapRate * 100) : "데이터 없음"}
                    </p>
                    <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      {item.message}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </article>

          {variant === "home" ? (
            <details className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
              <summary className="cursor-pointer list-none text-xs font-bold text-slate-600 dark:text-slate-300">
                추가 체크리스트 보기
              </summary>
              <div className="mt-2">
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  수익 관찰 종목:{" "}
                  {profitObservationItems.length > 0
                    ? profitObservationItems
                        .slice(0, 3)
                        .map((item) => `${item.name}(${item.symbol})`)
                        .join(", ")
                    : "데이터 없음"}
                </p>
                {snapshotNotice ? (
                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {snapshotNotice}
                  </p>
                ) : null}
              </div>
            </details>
          ) : null}
        </div>
      )}

      {!showEmpty && (
        <div className="mt-4 rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
          <span className="inline-flex items-center gap-1 font-bold text-slate-700 dark:text-slate-200">
            <CheckCircle2 className="h-3.5 w-3.5" />
            오늘의 한 줄 판단
          </span>
          <p className="mt-1">{headline}</p>
        </div>
      )}

      <div className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-5 text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-400">
        <p>KIS 현재가와 data.go.kr 일별 종가를 함께 참고한 체크리스트입니다.</p>
        {!user?.id ? (
          <p className="mt-1">비로그인 상태에서는 localStorage 보유종목/관심종목 기준으로 생성됩니다.</p>
        ) : null}
        {snapshotNotice ? <p className="mt-1">{snapshotNotice}</p> : null}
      </div>
    </section>
  );
}

