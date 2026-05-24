"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, TrendingUp } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { usePortfolio } from "@/components/portfolio-provider";
import { useWatchlist } from "@/components/watchlist-provider";
import { EmptyState } from "@/components/ui-states";
import { formatPercent } from "@/lib/format";
import { marketDirectionBadgeClass, resolveMarketDirection, type MorningMarketDirection } from "@/lib/morning-brief";
import { supabase } from "@/lib/supabase";
import { PORTFOLIO_DIAGNOSIS_STORAGE_KEY } from "@/lib/storage-keys";
import type { MarketSignal, PortfolioDiagnosis, Stock } from "@/lib/types";

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

type RiskSnapshot = {
  id: string;
  snapshotDate: string;
  symbol: string;
  riskStatus: string;
  returnRate: number | null;
  createdAt: string;
};

type FocusTag = "리스크" | "알림" | "수익" | "데이터";
type BriefVariant = "home" | "portfolio";

type FocusItem = {
  key: string;
  symbol: string;
  name: string;
  tag: FocusTag;
  reason: string;
  href: string;
  score: number;
};

const ALERT_CONDITIONS_STORAGE_KEY = "krx-insight-portfolio-alert-conditions";
const RISK_SNAPSHOTS_STORAGE_KEY = "krx_risk_snapshots";

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function localDateKey() {
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
    const source = parsed && Array.isArray(parsed.items) ? parsed.items : [];
    return source
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
    const result: Record<string, UserAlertCondition[]> = {};
    const entries = parsed && typeof parsed === "object" ? Object.entries(parsed) : [];
    for (const [holdingId, rules] of entries) {
      result[holdingId] = Array.isArray(rules)
        ? rules.map(normalizeAlertCondition).filter((item): item is UserAlertCondition => Boolean(item))
        : [];
    }
    return result;
  } catch {
    return {};
  }
}

function normalizeRiskSnapshot(value: unknown): RiskSnapshot | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  const symbol = safeText(raw.symbol);
  const snapshotDate = safeText(raw.snapshotDate || raw.snapshot_date);
  if (!id || !symbol || !snapshotDate) return null;
  return {
    id,
    symbol,
    snapshotDate,
    riskStatus: safeText(raw.riskStatus || raw.risk_status, "비교 불가"),
    returnRate: safeNumber(raw.returnRate || raw.return_rate),
    createdAt: safeText(raw.createdAt || raw.created_at, new Date().toISOString())
  };
}

function parseLocalRiskSnapshots() {
  if (typeof window === "undefined") return [] as RiskSnapshot[];
  try {
    const raw = window.localStorage.getItem(RISK_SNAPSHOTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    const source = Array.isArray(parsed) ? parsed : [];
    return source.map(normalizeRiskSnapshot).filter((item): item is RiskSnapshot => Boolean(item));
  } catch {
    return [];
  }
}

function riskRank(status: string) {
  if (status === "리스크 관리 필요") return 5;
  if (status === "확인 필요") return 4;
  if (status === "비중 조절 검토") return 3;
  if (status === "유지 관찰") return 2;
  if (status === "추가 관찰 가능") return 1;
  return 0;
}

function toRiskStatusFromJudgement(diagnosis: PortfolioDiagnosis) {
  if (diagnosis.judgement === "리스크 관리 관찰") return "리스크 관리 필요";
  if (diagnosis.judgement === "비중 조절 검토 구간") return "비중 조절 검토";
  if (diagnosis.judgement === "대기 / 확인 필요") return "확인 필요";
  if (diagnosis.judgement === "추가 관찰 가능") return "추가 관찰 가능";
  return "유지 관찰";
}

function nearAlertCount(
  diagnosis: PortfolioDiagnosis,
  conditions: UserAlertCondition[]
) {
  const safeConditions = Array.isArray(conditions) ? conditions : [];
  let count = 0;
  for (const condition of safeConditions) {
    if (!condition.enabled) continue;
    if (condition.type === "ma20_below") {
      const ma20 = safeNumber(diagnosis.recentClosePrice);
      const current = safeNumber(diagnosis.currentPrice);
      if (ma20 !== null && ma20 > 0 && current !== null && current < ma20) count += 1;
      continue;
    }
    if (condition.type === "rsi_gte_70") {
      const rsiSignal = diagnosis.cautionReasons.some((reason) => reason.includes("RSI"));
      if (rsiSignal) count += 1;
      continue;
    }
    if (condition.type === "rsi_lte_30") {
      const hasRecovery = diagnosis.addReasons.some((reason) => reason.includes("RSI"));
      if (hasRecovery) count += 1;
      continue;
    }
    const threshold = safeNumber(condition.threshold);
    if (threshold === null || threshold <= 0) continue;
    if (condition.type === "price_lte" || condition.type === "price_gte") {
      const current = safeNumber(diagnosis.currentPrice);
      if (current === null || current <= 0) continue;
      const gapRate = Math.abs(current - threshold) / threshold;
      if (gapRate <= 0.03) count += 1;
      continue;
    }
    if (condition.type === "return_lte" || condition.type === "return_gte") {
      const rate = safeNumber(diagnosis.returnRate);
      if (rate === null) continue;
      const gapRate = Math.abs(rate - threshold) / Math.max(Math.abs(threshold), 1);
      if (gapRate <= 0.03) count += 1;
    }
  }
  return count;
}

function directionText(direction: MorningMarketDirection) {
  if (direction === "강세") return "강세";
  if (direction === "약세") return "약세";
  if (direction === "혼조") return "혼조";
  if (direction === "관망") return "관망";
  return "데이터 확인 필요";
}

function tagClass(tag: FocusTag) {
  if (tag === "리스크") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  }
  if (tag === "알림") {
    return "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200";
  }
  if (tag === "수익") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300";
}

function marketBriefLine(direction: MorningMarketDirection, focusTags: FocusTag[]) {
  const hasRisk = focusTags.includes("리스크");
  const hasAlert = focusTags.includes("알림");
  const hasData = focusTags.includes("데이터");

  if (direction === "강세") {
    if (hasRisk) {
      return "오늘은 시장 전반이 강세 흐름이지만 리스크 상승 종목을 먼저 확인할 필요가 있습니다.";
    }
    return "오늘은 시장 전반이 강세 흐름을 보여 관심종목 추세 확인이 중요합니다.";
  }
  if (direction === "약세") {
    return "오늘은 지수 흐름이 약해 보유종목 리스크 점검이 우선입니다.";
  }
  if (direction === "혼조") {
    return "시장 방향이 엇갈리고 있어 공격적인 대응보다 관찰과 확인이 필요합니다.";
  }
  if (direction === "관망") {
    if (hasAlert) {
      return "지수 변동은 제한적이지만 알림 조건 근접 종목을 우선 확인할 필요가 있습니다.";
    }
    return "현재 시장은 관망 구간으로 핵심 종목의 변화 신호를 차분히 관찰하는 흐름입니다.";
  }
  if (hasData) {
    return "일부 데이터 확인이 필요하므로 판단 전에 가격 출처를 다시 확인해주세요.";
  }
  return "시장 지수 데이터가 일부 부족해 개별 종목 기준으로 브리핑을 제공합니다.";
}

function marketDirectionDetail(direction: MorningMarketDirection, signals: MarketSignal[]) {
  const safeSignals = Array.isArray(signals) ? signals : [];
  const kospi = safeSignals.find((item) => item.code === "KOSPI");
  const kosdaq = safeSignals.find((item) => item.code === "KOSDAQ");
  const kospiRate = safeNumber(kospi?.changeRate);
  const kosdaqRate = safeNumber(kosdaq?.changeRate);
  if (kospiRate === null || kosdaqRate === null) {
    return "시장 지수 데이터를 확인할 수 없습니다. 개별 종목 기준으로 브리핑을 표시합니다.";
  }
  return `KOSPI ${formatPercent(kospiRate)} · KOSDAQ ${formatPercent(kosdaqRate)} 기준으로 ${directionText(direction)} 흐름입니다.`;
}

export function TodayMarketBrief({
  signals,
  stocks,
  variant = "home",
  sectionId
}: {
  signals: MarketSignal[];
  stocks?: Stock[];
  variant?: BriefVariant;
  sectionId?: string;
}) {
  const { user, isSupabaseReady } = useAuth();
  const { entries } = usePortfolio();
  const { symbols: watchlistSymbols } = useWatchlist();
  const [diagnoses, setDiagnoses] = useState<PortfolioDiagnosis[]>([]);
  const [cloudAlertMap, setCloudAlertMap] = useState<Record<string, UserAlertCondition[]>>({});
  const [riskSnapshots, setRiskSnapshots] = useState<RiskSnapshot[]>([]);
  const [snapshotNotice, setSnapshotNotice] = useState("");

  const safeEntries = useMemo(() => (Array.isArray(entries) ? entries : []), [entries]);
  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
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
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_alert_rules")
          .select("id,holding_id,rule_type,threshold,enabled,created_at")
          .eq("user_id", user.id);
        if (cancelled) return;
        if (error) {
          setCloudAlertMap({});
          return;
        }
        const safeRows = Array.isArray(data) ? data : [];
        const map: Record<string, UserAlertCondition[]> = {};
        for (const row of safeRows) {
          const holdingId = safeText(row?.holding_id);
          if (!holdingId) continue;
          const normalized = normalizeAlertCondition({
            id: row?.id,
            type: row?.rule_type,
            threshold: row?.threshold,
            enabled: row?.enabled,
            createdAt: row?.created_at
          });
          if (!normalized) continue;
          if (!Array.isArray(map[holdingId])) map[holdingId] = [];
          map[holdingId].push(normalized);
        }
        setCloudAlertMap(map);
      } catch {
        if (!cancelled) setCloudAlertMap({});
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
          .select("id,snapshot_date,symbol,risk_status,return_rate,created_at")
          .eq("user_id", user.id)
          .order("snapshot_date", { ascending: false })
          .limit(500);
        if (cancelled) return;
        if (error) {
          setSnapshotNotice("아직 비교할 이전 리스크 기록이 없습니다. 오늘부터 변화 추적을 시작합니다.");
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

  const diagnosisById = useMemo(() => {
    const map = new Map<string, PortfolioDiagnosis>();
    const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
    for (const diagnosis of safeDiagnoses) {
      if (typeof diagnosis.id === "string" && diagnosis.id) {
        map.set(diagnosis.id, diagnosis);
      }
    }
    return map;
  }, [diagnoses]);

  const today = localDateKey();
  const stockMap = useMemo(() => {
    const map = new Map<string, Stock>();
    for (const stock of safeStocks) {
      if (typeof stock.symbol === "string" && stock.symbol) {
        map.set(stock.symbol, stock);
      }
    }
    return map;
  }, [safeStocks]);

  const riskChangeBySymbol = useMemo(() => {
    const map = new Map<string, { direction: "상승" | "하락" | "유지" | "비교 불가"; reason: string }>();
    const safeSnapshots = Array.isArray(riskSnapshots) ? riskSnapshots : [];
    const currentDiagnoses = Array.from(diagnosisById.values());
    for (const diagnosis of currentDiagnoses) {
      const symbol = safeText(diagnosis.symbol);
      if (!symbol) continue;
      const previous = safeSnapshots
        .filter((item) => item.symbol === symbol && item.snapshotDate < today)
        .sort((a, b) =>
          `${b.snapshotDate}-${b.createdAt}`.localeCompare(`${a.snapshotDate}-${a.createdAt}`)
        )[0];
      if (!previous) {
        map.set(symbol, {
          direction: "비교 불가",
          reason: "아직 비교할 이전 리스크 기록이 없습니다. 오늘부터 변화 추적을 시작합니다."
        });
        continue;
      }
      const prevRank = riskRank(previous.riskStatus);
      const nowRank = riskRank(toRiskStatusFromJudgement(diagnosis));
      const direction = nowRank > prevRank ? "상승" : nowRank < prevRank ? "하락" : "유지";
      const returnGap =
        previous.returnRate !== null && Number.isFinite(diagnosis.returnRate)
          ? diagnosis.returnRate - previous.returnRate
          : null;
      const reasonParts: string[] = [];
      if (direction === "상승") reasonParts.push("리스크 상태가 상승했습니다.");
      if (direction === "하락") reasonParts.push("리스크 상태가 완화되었습니다.");
      if (direction === "유지") reasonParts.push("리스크 상태는 유지 중입니다.");
      if (returnGap !== null && returnGap <= -3) reasonParts.push("수익률이 하락했습니다.");
      if (returnGap !== null && returnGap >= 3) reasonParts.push("수익률이 개선되었습니다.");
      if (diagnosis.quoteSource !== "KIS") reasonParts.push("현재가 확인이 필요합니다.");
      map.set(symbol, { direction, reason: reasonParts[0] ?? "리스크 변화를 관찰 중입니다." });
    }
    return map;
  }, [diagnosisById, riskSnapshots, today]);

  const focusItems = useMemo(() => {
    const items: FocusItem[] = [];

    for (const entry of safeEntries) {
      const diagnosis = diagnosisById.get(entry.id);
      if (!diagnosis) continue;
      const symbol = safeText(diagnosis.symbol);
      if (!symbol) continue;
      const conditionList = Array.isArray(alertMap[entry.id]) ? alertMap[entry.id] : [];
      const alertNear = nearAlertCount(diagnosis, conditionList);
      const riskChange = riskChangeBySymbol.get(symbol);
      const isRisk = diagnosis.judgement === "리스크 관리 관찰" || riskChange?.direction === "상승";
      const isDataCheck =
        diagnosis.quoteSource !== "KIS" || diagnosis.market.includes("확인") || diagnosis.currentPrice <= 0;
      const isProfitMove = Math.abs(diagnosis.returnRate) >= 4;

      let tag: FocusTag = "수익";
      if (isRisk) tag = "리스크";
      else if (alertNear > 0) tag = "알림";
      else if (isDataCheck) tag = "데이터";

      const reason =
        isRisk
          ? riskChange?.reason || "리스크 상태 변화가 있어 우선 확인이 필요합니다."
          : alertNear > 0
            ? "알림 조건에 가까워진 항목이 있습니다."
            : isDataCheck
              ? "가격 출처 확인이 필요한 구간입니다."
              : isProfitMove
                ? "수익률 변동이 커 관찰이 필요합니다."
                : "보유 상태를 유지 관찰하는 구간입니다.";

      let score = 0;
      if (isRisk) score += 5;
      if (alertNear > 0) score += 4;
      if (isProfitMove) score += 3;
      if (isDataCheck) score += 2;
      if (riskChange?.direction === "상승") score += 2;

      items.push({
        key: `holding-${entry.id}`,
        symbol,
        name: safeText(diagnosis.stockName, symbol),
        tag,
        reason,
        href: `/stocks/${symbol}`,
        score
      });
    }

    if (variant === "home") {
      const holdingSymbols = new Set(items.map((item) => item.symbol));
      for (const symbol of safeWatchlistSymbols) {
        if (holdingSymbols.has(symbol)) continue;
        const stock = stockMap.get(symbol);
        if (!stock) continue;
        const isDataCheck = stock.quoteSource !== "KIS" || stock.priceAnomaly !== null;
        const changeRate = safeNumber(stock.changeRate) ?? 0;
        const hasProfitMove = Math.abs(changeRate) >= 3;
        let tag: FocusTag = "수익";
        if (isDataCheck) tag = "데이터";
        const reason = isDataCheck
          ? safeText(stock.priceAnomalyMessage, "데이터 확인 필요 신호가 있습니다.")
          : hasProfitMove
            ? "등락률 변동이 커 우선 확인이 필요합니다."
            : "관심종목 추세를 관찰하는 구간입니다.";
        let score = 0;
        if (isDataCheck) score += 4;
        if (hasProfitMove) score += 3;
        items.push({
          key: `watch-${symbol}`,
          symbol,
          name: safeText(stock.koreanName, symbol),
          tag,
          reason,
          href: `/stocks/${symbol}`,
          score
        });
      }
    }

    return items
      .sort((left, right) => right.score - left.score || left.name.localeCompare(right.name, "ko"))
      .slice(0, 3);
  }, [alertMap, diagnosisById, riskChangeBySymbol, safeEntries, safeWatchlistSymbols, stockMap, variant]);

  const direction = useMemo(() => resolveMarketDirection(signals), [signals]);
  const oneLine = useMemo(
    () => marketBriefLine(direction, focusItems.map((item) => item.tag)),
    [direction, focusItems]
  );
  const directionDetail = useMemo(() => marketDirectionDetail(direction, signals), [direction, signals]);

  const briefImpactText = useMemo(() => {
    if (safeEntries.length > 0 || safeWatchlistSymbols.length > 0) {
      return "내 보유종목 기준으로 오늘 먼저 확인할 종목이 있습니다.";
    }
    return "보유종목이나 관심종목을 추가하면 맞춤 브리핑을 받을 수 있습니다.";
  }, [safeEntries.length, safeWatchlistSymbols.length]);

  const riskSummaryLine = useMemo(() => {
    const changes = Array.from(riskChangeBySymbol.values());
    if (changes.length === 0) return "아직 비교할 이전 리스크 기록이 없습니다. 오늘부터 변화 추적을 시작합니다.";
    const rising = changes.filter((item) => item.direction === "상승").length;
    const falling = changes.filter((item) => item.direction === "하락").length;
    if (rising > 0) {
      return `리스크 상승 종목 ${rising}개가 있어 우선 확인이 필요합니다.`;
    }
    if (falling > 0) {
      return `리스크 완화 종목 ${falling}개가 확인되어 유지 관찰 흐름입니다.`;
    }
    return "전일 대비 큰 리스크 변화 없이 유지 관찰 구간입니다.";
  }, [riskChangeBySymbol]);

  const alertNearSummary = useMemo(() => {
    const count = Array.from(diagnosisById.values()).reduce((sum, diagnosis) => {
      const entry = safeEntries.find((item) => item.id === diagnosis.id);
      const conditions = entry ? alertMap[entry.id] : [];
      return sum + nearAlertCount(diagnosis, Array.isArray(conditions) ? conditions : []);
    }, 0);
    if (count > 0) return `알림 조건 근접 항목이 ${count}건 있습니다.`;
    return "오늘 확인할 알림 조건은 없습니다.";
  }, [alertMap, diagnosisById, safeEntries]);

  const portfolioStatus = useMemo(() => {
    const safeDiagnoses = Array.from(diagnosisById.values());
    if (safeDiagnoses.length === 0) return "데이터 확인 필요";
    if (safeDiagnoses.some((item) => item.judgement === "리스크 관리 관찰")) return "리스크 점검";
    if (safeDiagnoses.some((item) => item.judgement === "비중 조절 검토 구간")) return "리스크 점검";
    const avgReturn =
      safeDiagnoses.reduce((sum, item) => sum + item.returnRate, 0) / Math.max(safeDiagnoses.length, 1);
    if (avgReturn >= 3) return "수익 관찰";
    return "유지 관찰";
  }, [diagnosisById]);

  const showEmptyState =
    safeEntries.length === 0 &&
    safeWatchlistSymbols.length === 0 &&
    focusItems.length === 0;

  return (
    <section
      id={sectionId}
      className="scroll-mt-32 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-normal text-brand">브리핑</p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
            {variant === "portfolio" ? "내 포트폴리오 오늘 브리핑" : "오늘 시장 브리핑"}
          </h2>
        </div>
        <span
          className={`rounded-md border px-2 py-1 text-[11px] font-bold ${marketDirectionBadgeClass(
            direction
          )}`}
        >
          {directionText(direction)}
        </span>
      </div>

      <p className="mt-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
        {oneLine}
      </p>

      {showEmptyState ? (
        <div className="mt-3">
          <EmptyState
            compact
            icon={AlertTriangle}
            title="보유종목이나 관심종목을 추가하면 맞춤형 시장 브리핑을 만들 수 있습니다."
            description={directionDetail}
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          <h3 className="text-sm font-bold text-ink dark:text-white">오늘 먼저 확인할 것</h3>
          {focusItems.length === 0 ? (
            <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              현재 우선 확인 종목이 없습니다.
            </p>
          ) : (
            <ul className="grid gap-2">
              {focusItems.map((item) => (
                <li
                  key={item.key}
                  className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60"
                >
                  <Link href={item.href} className="block">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="truncate text-sm font-bold text-ink dark:text-white">
                        {item.name} · {item.symbol}
                      </p>
                      <span className={`rounded-md border px-2 py-1 text-[11px] font-bold ${tagClass(item.tag)}`}>
                        {item.tag}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      {item.reason}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          )}

          {variant === "portfolio" ? (
            <div className="mt-1 grid gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
              <p>전체 포트폴리오 상태: {portfolioStatus}</p>
              <p>리스크 변화 요약: {riskSummaryLine}</p>
              <p>알림 조건 근접 여부: {alertNearSummary}</p>
            </div>
          ) : (
            <p className="mt-1 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
              {briefImpactText}
            </p>
          )}

          <details className="rounded-md border border-line bg-white px-3 py-2 dark:border-dark-line dark:bg-dark-panel">
            <summary className="cursor-pointer list-none text-xs font-bold text-slate-600 dark:text-slate-300">
              자세히 보기
            </summary>
            <div className="mt-2 grid gap-2">
              <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {directionDetail}
              </p>
              {snapshotNotice ? (
                <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {snapshotNotice}
                </p>
              ) : null}
              <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {riskSummaryLine}
              </p>
              <p className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {alertNearSummary}
              </p>
            </div>
          </details>
        </div>
      )}

      <p className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-[11px] font-semibold leading-5 text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-400">
        KIS 현재가, data.go.kr 일별 종가, 보유종목 및 리스크 기록을 함께 참고한 브리핑입니다.
      </p>
    </section>
  );
}
