"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Bell, ChevronDown, ChevronUp, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { MobileTabNav } from "@/components/mobile-tab-nav";
import { TodayMarketBrief } from "@/components/today-market-brief";
import { TodayInvestmentChecklist } from "@/components/today-investment-checklist";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui-states";
import { usePortfolio } from "@/components/portfolio-provider";
import { useWatchlist } from "@/components/watchlist-provider";
import { changeColorClass, formatKRW, formatNumber, formatPercent } from "@/lib/format";
import { FREE_LIMITS, isPaidPlan } from "@/lib/plan";
import { supabase } from "@/lib/supabase";
import { PORTFOLIO_DIAGNOSIS_STORAGE_KEY } from "@/lib/storage-keys";
import type {
  InvestmentHorizon,
  MarketSignal,
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

type ConditionDraft = {
  type: AlertConditionType;
  threshold: string;
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

type TriggeredUserAlert = {
  key: string;
  id: string;
  symbol: string;
  stockName: string;
  conditionType: AlertConditionType;
  priority: number;
  message: string;
  nextCheck: string;
};

type UserAlertSummary = {
  key: string;
  id: string;
  symbol: string;
  stockName: string;
  triggerCount: number;
  triggerMessages: string[];
  coreSummary: string;
  nextCheck: string;
  topPriority: number;
};

type PortfolioAlertRuleRow = {
  id?: string;
  user_id?: string;
  holding_id?: string;
  rule_type?: string;
  threshold?: number | null;
  enabled?: boolean;
  created_at?: string;
  updated_at?: string;
};

type AlertRuleSyncStatus = "local" | "synced" | "failed";
type PortfolioMobileTab = "summary" | "holdings" | "alerts" | "reports";

const ALERT_CONDITIONS_STORAGE_KEY = "krx-insight-portfolio-alert-conditions";
const BROWSER_NOTIFICATION_ENABLED_KEY = "portfolioBrowserNotificationEnabled";
const BROWSER_NOTIFICATION_NOTIFIED_PREFIX = "portfolioAlertNotified";

type NotificationPermissionState = NotificationPermission | "unsupported";

type PortfolioNotificationItem = {
  symbol: string;
  stockName: string;
  body: string;
  priority: number;
  signature: string;
};

type DailyPortfolioReportItem = {
  id: string;
  symbol: string;
  stockName: string;
  returnRate: number;
  judgement: string;
  coreReason: string;
  nextCheck: string;
  priority: number;
};

type PortfolioReportPayloadItem = {
  stockName: string;
  symbol: string;
  returnRate: number;
  judgement: string;
  coreReason: string;
  nextCheck: string;
};

type PortfolioReportPayload = {
  totalHoldings: number;
  totalEvaluation: number;
  totalProfitLoss: number;
  averageReturnRate: number;
  riskCount: number;
  holdCount: number;
  topWatchItems: PortfolioReportPayloadItem[];
  maintainItems: PortfolioReportPayloadItem[];
  riskItems: PortfolioReportPayloadItem[];
  nextCheckConditions: string[];
  createdAt: string;
};

type PortfolioReportRow = {
  id?: string;
  user_id?: string;
  report_date?: string;
  summary?: string;
  payload?: unknown;
  created_at?: string;
};

type PortfolioReportHistoryItem = {
  id: string;
  reportDate: string;
  summary: string;
  payload: PortfolioReportPayload | null;
  createdAt: string;
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

function extractSupabaseErrorMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  return "알 수 없는 오류";
}

function normalizePortfolioReportPayloadItem(value: unknown): PortfolioReportPayloadItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const stockName = safeText(raw.stockName);
  const symbol = safeText(raw.symbol);
  if (!stockName && !symbol) return null;

  return {
    stockName: stockName || symbol,
    symbol: symbol || stockName,
    returnRate: safeNumber(raw.returnRate, 0),
    judgement: safeText(raw.judgement, "대기 / 확인 필요"),
    coreReason: safeText(raw.coreReason),
    nextCheck: safeText(raw.nextCheck)
  };
}

function normalizePortfolioReportPayload(value: unknown): PortfolioReportPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const normalizeItems = (key: string) => {
    const source = raw[key];
    if (!Array.isArray(source)) return [] as PortfolioReportPayloadItem[];
    return source
      .map(normalizePortfolioReportPayloadItem)
      .filter((item): item is PortfolioReportPayloadItem => Boolean(item));
  };

  const nextCheckConditions = Array.isArray(raw.nextCheckConditions)
    ? raw.nextCheckConditions
        .map((item) => safeText(item))
        .filter((item) => Boolean(item))
    : [];

  return {
    totalHoldings: safeNumber(raw.totalHoldings, 0),
    totalEvaluation: safeNumber(raw.totalEvaluation, 0),
    totalProfitLoss: safeNumber(raw.totalProfitLoss, 0),
    averageReturnRate: safeNumber(raw.averageReturnRate, 0),
    riskCount: safeNumber(raw.riskCount, 0),
    holdCount: safeNumber(raw.holdCount, 0),
    topWatchItems: normalizeItems("topWatchItems"),
    maintainItems: normalizeItems("maintainItems"),
    riskItems: normalizeItems("riskItems"),
    nextCheckConditions,
    createdAt: safeText(raw.createdAt)
  };
}

function reportItemToPayloadItem(item: DailyPortfolioReportItem): PortfolioReportPayloadItem {
  return {
    stockName: safeText(item.stockName, safeText(item.symbol, "-")),
    symbol: safeText(item.symbol),
    returnRate: safeNumber(item.returnRate, 0),
    judgement: safeText(item.judgement, "대기 / 확인 필요"),
    coreReason: safeText(item.coreReason),
    nextCheck: safeText(item.nextCheck)
  };
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

function formatJudgementLabel(judgement: string) {
  if (judgement === "리스크 관리 관찰") return "리스크 관리 필요";
  if (judgement === "비중 조절 검토 구간") return "비중 조절 검토";
  return judgement;
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

function isThresholdRequired(type: AlertConditionType) {
  return (
    type === "price_lte" ||
    type === "price_gte" ||
    type === "return_lte" ||
    type === "return_gte"
  );
}

function getConditionTypeLabel(type: AlertConditionType) {
  if (type === "price_lte") return "현재가가 특정 가격 이하";
  if (type === "price_gte") return "현재가가 특정 가격 이상";
  if (type === "return_lte") return "수익률이 특정 값 이하";
  if (type === "return_gte") return "수익률이 특정 값 이상";
  if (type === "ma20_below") return "MA20 아래로 내려가면";
  if (type === "rsi_gte_70") return "RSI 70 이상";
  return "RSI 30 이하";
}

function normalizeAlertCondition(value: unknown): UserAlertCondition | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : "";
  const type = raw.type;
  const enabled = typeof raw.enabled === "boolean" ? raw.enabled : true;
  const createdAt = typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString();
  const thresholdRaw = raw.threshold;
  const threshold =
    typeof thresholdRaw === "number" && Number.isFinite(thresholdRaw) ? thresholdRaw : null;

  if (!id || !isAlertConditionType(type)) return null;

  return {
    id,
    type,
    threshold,
    enabled,
    createdAt
  };
}

function parseLocalAlertConditionMap(raw: string | null) {
  if (!raw) return {} as Record<string, UserAlertCondition[]>;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown> | null;
    const normalized: Record<string, UserAlertCondition[]> = {};
    const entries = parsed && typeof parsed === "object" ? Object.entries(parsed) : [];

    for (const [entryId, conditions] of entries) {
      const safeConditions = Array.isArray(conditions)
        ? conditions
            .map(normalizeAlertCondition)
            .filter((item): item is UserAlertCondition => Boolean(item))
        : [];
      normalized[entryId] = safeConditions;
    }

    return normalized;
  } catch {
    return {} as Record<string, UserAlertCondition[]>;
  }
}

function rowToAlertCondition(row: PortfolioAlertRuleRow): UserAlertCondition | null {
  const id = typeof row.id === "string" ? row.id : "";
  const type = row.rule_type;
  const enabled = typeof row.enabled === "boolean" ? row.enabled : true;
  const createdAt =
    typeof row.created_at === "string" ? row.created_at : new Date().toISOString();
  const threshold =
    typeof row.threshold === "number" && Number.isFinite(row.threshold)
      ? row.threshold
      : null;

  if (!id || !isAlertConditionType(type)) return null;

  return {
    id,
    type,
    threshold,
    enabled,
    createdAt
  };
}

function conditionToRuleRow(
  entryId: string,
  condition: UserAlertCondition,
  userId: string
) {
  const now = new Date().toISOString();
  return {
    user_id: userId,
    id: condition.id,
    holding_id: entryId,
    rule_type: condition.type,
    threshold: condition.threshold,
    enabled: condition.enabled,
    created_at: condition.createdAt,
    updated_at: now
  };
}

function normalizeAlertConditionMap(
  value: Record<string, UserAlertCondition[]> | null | undefined
): Record<string, UserAlertCondition[]> {
  if (!value || typeof value !== "object") {
    return {};
  }

  const normalized: Record<string, UserAlertCondition[]> = {};
  const entries = Object.entries(value);
  for (const [entryId, conditions] of entries) {
    const safeConditions = Array.isArray(conditions)
      ? conditions
          .map(normalizeAlertCondition)
          .filter((item): item is UserAlertCondition => Boolean(item))
      : [];
    normalized[entryId] = safeConditions;
  }

  return normalized;
}

function hasAnyAlertConditionMapItems(
  value: Record<string, UserAlertCondition[]> | null | undefined
) {
  const safeMap = normalizeAlertConditionMap(value);
  const allLists = Object.values(safeMap);
  return allLists.some((items) => Array.isArray(items) && items.length > 0);
}

function getAlertConditionSignatures(value: Record<string, UserAlertCondition[]>) {
  const safeMap = normalizeAlertConditionMap(value);
  const signatures = new Set<string>();

  for (const [entryId, conditions] of Object.entries(safeMap)) {
    const safeConditions = Array.isArray(conditions) ? conditions : [];
    for (const condition of safeConditions) {
      if (!condition || typeof condition.id !== "string") continue;
      const threshold =
        typeof condition.threshold === "number" && Number.isFinite(condition.threshold)
          ? String(condition.threshold)
          : "null";
      const enabled = condition.enabled ? "1" : "0";
      const type = isAlertConditionType(condition.type) ? condition.type : "invalid";
      signatures.add(`${entryId}::${condition.id}::${type}::${threshold}::${enabled}`);
    }
  }

  return signatures;
}

function extractRsiFromDiagnosis(diagnosis: PortfolioDiagnosis) {
  const chunks = [
    ...(Array.isArray(diagnosis.nextChecks) ? diagnosis.nextChecks : []),
    ...(Array.isArray(diagnosis.cautionReasons) ? diagnosis.cautionReasons : []),
    ...(Array.isArray(diagnosis.addReasons) ? diagnosis.addReasons : []),
    safeText(diagnosis.why, "")
  ]
    .filter((text) => typeof text === "string")
    .join(" ");

  const match = chunks.match(/RSI\s*([0-9]+(?:\.[0-9]+)?)/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function isMa20BelowByDiagnosis(diagnosis: PortfolioDiagnosis) {
  const cautionReasons = Array.isArray(diagnosis.cautionReasons) ? diagnosis.cautionReasons : [];
  return cautionReasons.some((reason) => typeof reason === "string" && reason.includes("MA20 아래"));
}

function alertPriorityByType(type: AlertConditionType) {
  if (type === "ma20_below") return 100;
  if (type === "price_lte") return 90;
  if (type === "return_lte") return 80;
  if (type === "price_gte") return 70;
  if (type === "return_gte") return 60;
  if (type === "rsi_lte_30") return 50;
  if (type === "rsi_gte_70") return 40;
  return 30;
}

function buildUserAlertCoreSummary(
  judgement: string,
  options: {
    hasMa20Below: boolean;
    hasPriceLower: boolean;
    hasReturnLower: boolean;
    hasRsiOverheat: boolean;
  }
) {
  let prefix = "현재 보유 상태는 대기·확인 필요 구간이며,";
  if (judgement === "유지 관찰") {
    prefix = "현재 보유 상태는 유지 관찰 구간이지만,";
  } else if (judgement === "추가 관찰 가능") {
    prefix = "현재 보유 상태는 추가 관찰 가능 구간이지만,";
  } else if (judgement === "리스크 관리 관찰" || judgement === "비중 조절 검토 구간") {
    prefix = "현재 보유 상태는 리스크 관리 필요 구간이며,";
  }

  if (options.hasMa20Below && (options.hasPriceLower || options.hasReturnLower)) {
    return `${prefix} 사용자가 설정한 가격 조건과 MA20 기준을 함께 확인할 필요가 있습니다.`;
  }
  if (options.hasMa20Below) {
    return `${prefix} MA20 이탈 여부를 신중하게 확인하고 재평가가 필요합니다.`;
  }
  if (options.hasPriceLower) {
    return `${prefix} 설정한 가격 하단 조건 접근 여부를 관찰하며 리스크 관리가 필요합니다.`;
  }
  if (options.hasReturnLower) {
    return `${prefix} 수익률 하락 조건 발동 여부를 확인하며 재평가가 필요합니다.`;
  }
  if (options.hasRsiOverheat) {
    return `${prefix} RSI 과열 조건이 감지되어 신중한 관찰이 필요합니다.`;
  }
  return `${prefix} 설정된 알림 조건을 참고 정보로 점검할 필요가 있습니다.`;
}

function buildTriggeredUserAlerts(
  entries: PortfolioPositionInput[],
  diagnoses: PortfolioDiagnosis[],
  conditionsByEntry: Record<string, UserAlertCondition[]>
) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeDiagnoses = Array.isArray(diagnoses) ? diagnoses : [];
  const map = new Map<string, PortfolioDiagnosis>();
  for (const item of safeDiagnoses) {
    if (typeof item?.id === "string") {
      map.set(item.id, item);
    }
  }

  const results: TriggeredUserAlert[] = [];

  for (const entry of safeEntries) {
    const diagnosis = map.get(entry.id);
    if (!diagnosis) continue;

    const stockName = safeText(diagnosis.stockName, safeText(entry.stockName, entry.symbol));
    const symbol = safeText(diagnosis.symbol, entry.symbol);
    const currentPrice = safeNumber(diagnosis.currentPrice, 0);
    const returnRate = safeNumber(diagnosis.returnRate, 0);
    const rsi = extractRsiFromDiagnosis(diagnosis);
    const ma20Below = isMa20BelowByDiagnosis(diagnosis);
    const fallbackNextCheck = "다음 KIS 현재가와 MA20 유지 여부를 확인하세요.";
    const usingFallback = diagnosis.quoteSource !== "KIS";
    const nextCheckText = usingFallback
      ? "현재가는 data.go.kr 최근 종가 기준입니다. 다음 종가와 MA20 유지 여부를 확인하세요."
      : fallbackNextCheck;

    const conditionList = Array.isArray(conditionsByEntry[entry.id])
      ? conditionsByEntry[entry.id]
      : [];

    for (const condition of conditionList) {
      if (!condition.enabled) continue;

      let triggered = false;
      let message = "";

      if (condition.type === "price_lte") {
        const threshold = safeNumber(condition.threshold, NaN);
        if (Number.isFinite(threshold) && currentPrice <= threshold) {
          triggered = true;
          message = `현재가가 설정가 ${formatKRW(threshold)} 이하에 접근했습니다.`;
        }
      } else if (condition.type === "price_gte") {
        const threshold = safeNumber(condition.threshold, NaN);
        if (Number.isFinite(threshold) && currentPrice >= threshold) {
          triggered = true;
          message = `현재가가 설정가 ${formatKRW(threshold)} 이상 구간에 진입했습니다.`;
        }
      } else if (condition.type === "return_lte") {
        const threshold = safeNumber(condition.threshold, NaN);
        if (Number.isFinite(threshold) && returnRate <= threshold) {
          triggered = true;
          message = `수익률이 설정값 ${formatPercent(threshold)} 이하로 하락해 확인 필요 신호가 감지되었습니다.`;
        }
      } else if (condition.type === "return_gte") {
        const threshold = safeNumber(condition.threshold, NaN);
        if (Number.isFinite(threshold) && returnRate >= threshold) {
          triggered = true;
          message = `수익률이 설정값 ${formatPercent(threshold)} 이상 구간에 도달했습니다.`;
        }
      } else if (condition.type === "ma20_below") {
        if (ma20Below) {
          triggered = true;
          message = "MA20 아래 구간으로 내려가 관찰 및 재평가가 필요합니다.";
        }
      } else if (condition.type === "rsi_gte_70") {
        if (typeof rsi === "number" && Number.isFinite(rsi) && rsi >= 70) {
          triggered = true;
          message = `RSI ${rsi.toFixed(1)}로 70 이상 과열 구간 신호가 감지되었습니다.`;
        }
      } else if (condition.type === "rsi_lte_30") {
        if (typeof rsi === "number" && Number.isFinite(rsi) && rsi <= 30) {
          triggered = true;
          message = `RSI ${rsi.toFixed(1)}로 30 이하 침체 구간 신호가 감지되었습니다.`;
        }
      }

      if (triggered) {
        results.push({
          key: `${entry.id}-${condition.id}`,
          id: entry.id,
          symbol,
          stockName,
          conditionType: condition.type,
          priority: alertPriorityByType(condition.type),
          message,
          nextCheck: nextCheckText
        });
      }
    }
  }

  return results;
}

function buildTriggeredUserAlertSummaries(
  alerts: TriggeredUserAlert[],
  diagnosisMap: Map<string, PortfolioDiagnosis>
) {
  const safeAlerts = Array.isArray(alerts) ? alerts : [];
  const grouped = new Map<
    string,
    {
      id: string;
      symbol: string;
      stockName: string;
      items: TriggeredUserAlert[];
    }
  >();

  for (const alert of safeAlerts) {
    const groupKey = `${alert.id}:${alert.symbol}`;
    const existing = grouped.get(groupKey);
    if (existing) {
      existing.items.push(alert);
      continue;
    }
    grouped.set(groupKey, {
      id: alert.id,
      symbol: alert.symbol,
      stockName: alert.stockName,
      items: [alert]
    });
  }

  const summaries: UserAlertSummary[] = [];
  grouped.forEach((group) => {
    const sortedItems = (Array.isArray(group.items) ? [...group.items] : []).sort(
      (left, right) => right.priority - left.priority
    );
    if (sortedItems.length === 0) return;

    const triggerMessages = sortedItems.map((item) => safeText(item.message)).filter(Boolean);
    const topItem = sortedItems[0];
    const diagnosis = diagnosisMap.get(group.id);
    const judgement = safeText(diagnosis?.judgement, "대기 / 확인 필요");
    const hasMa20Below = sortedItems.some((item) => item.conditionType === "ma20_below");
    const hasPriceLower = sortedItems.some((item) => item.conditionType === "price_lte");
    const hasReturnLower = sortedItems.some((item) => item.conditionType === "return_lte");
    const hasRsiOverheat = sortedItems.some((item) => item.conditionType === "rsi_gte_70");

    summaries.push({
      key: `${group.id}-${group.symbol}`,
      id: group.id,
      symbol: group.symbol,
      stockName: group.stockName,
      triggerCount: sortedItems.length,
      triggerMessages,
      coreSummary: buildUserAlertCoreSummary(judgement, {
        hasMa20Below,
        hasPriceLower,
        hasReturnLower,
        hasRsiOverheat
      }),
      nextCheck: safeText(topItem.nextCheck, "다음 종가와 MA20 유지 여부를 확인하세요."),
      topPriority: safeNumber(topItem.priority, 0)
    });
  });

  return summaries.sort((left, right) => {
    if (right.topPriority !== left.topPriority) return right.topPriority - left.topPriority;
    if (right.triggerCount !== left.triggerCount) return right.triggerCount - left.triggerCount;
    return left.symbol.localeCompare(right.symbol);
  });
}

function normalizeNotificationPermission(value: unknown): NotificationPermissionState {
  if (value === "granted" || value === "denied" || value === "default") {
    return value;
  }
  return "default";
}

function notificationStatusLabel(
  permission: NotificationPermissionState,
  enabled: boolean
) {
  if (permission === "denied") return "권한 차단됨";
  if (permission === "granted" && enabled) return "알림 켜짐";
  return "알림 꺼짐";
}

function localDateKey() {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function judgementPriority(judgement: string) {
  if (judgement === "리스크 관리 관찰") return 100;
  if (judgement === "비중 조절 검토 구간") return 90;
  if (judgement === "대기 / 확인 필요") return 80;
  if (judgement === "유지 관찰") return 70;
  if (judgement === "추가 관찰 가능") return 60;
  return 50;
}

function buildDailyPortfolioReportItems(
  entries: PortfolioPositionInput[],
  diagnosisMap: Map<string, PortfolioDiagnosis>,
  failures: Record<string, string>
) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const safeFailures =
    failures && typeof failures === "object" ? failures : ({} as Record<string, string>);
  const items: DailyPortfolioReportItem[] = [];

  for (const entry of safeEntries) {
    const diagnosis = diagnosisMap.get(entry.id);
    const judgement = safeText(diagnosis?.judgement, "대기 / 확인 필요");
    const returnRate = safeNumber(diagnosis?.returnRate, 0);
    const nextChecks = Array.isArray(diagnosis?.nextChecks) ? diagnosis.nextChecks : [];
    const nextCheck =
      safeText(nextChecks[0]) ||
      safeText(safeFailures[entry.id]) ||
      "다음 종가와 MA20 유지 여부를 확인해 재평가가 필요합니다.";

    items.push({
      id: entry.id,
      symbol: safeText(diagnosis?.symbol, entry.symbol),
      stockName: safeText(diagnosis?.stockName, safeText(entry.stockName, entry.symbol)),
      returnRate,
      judgement,
      coreReason: getCoreJudgementReason(diagnosis),
      nextCheck,
      priority: judgementPriority(judgement)
    });
  }

  return items.sort((left, right) => {
    if (right.priority !== left.priority) return right.priority - left.priority;
    return left.returnRate - right.returnRate;
  });
}

function buildPortfolioSummaryLines(options: {
  totalCount: number;
  avgReturn: number;
  riskUpCount: number;
  keepCount: number;
  topItems: DailyPortfolioReportItem[];
}) {
  const lines: string[] = [];
  const totalCount = safeNumber(options.totalCount, 0);
  const avgReturn = safeNumber(options.avgReturn, 0);
  const riskUpCount = safeNumber(options.riskUpCount, 0);
  const keepCount = safeNumber(options.keepCount, 0);
  const safeTopItems = Array.isArray(options.topItems) ? options.topItems : [];
  const topName = safeText(safeTopItems[0]?.stockName);

  if (totalCount === 0) {
    return ["보유종목을 추가하면 오늘의 AI 리포트를 생성할 수 있습니다."];
  }

  if (riskUpCount > 0) {
    lines.push(
      `현재 포트폴리오는 ${avgReturn >= 0 ? "수익 관찰" : "변동성 관찰"} 구간이지만 리스크 상승 종목이 ${riskUpCount}개 있어 우선 확인이 필요합니다.`
    );
  } else {
    lines.push(
      `현재 포트폴리오는 ${avgReturn >= 0 ? "수익 관찰" : "변동성 관찰"} 흐름이며 급격한 리스크 확대 신호는 제한적입니다.`
    );
  }

  if (topName) {
    lines.push(
      `${topName}을 포함한 우선 확인 종목은 다음 종가 흐름과 MA20 유지 여부를 신중하게 점검하세요.`
    );
  }

  if (keepCount > 0) {
    lines.push(
      `유지 관찰 종목은 ${keepCount}개이며, KIS 현재가 변화와 사용자 알림 조건 발동 여부를 참고 정보로 확인하세요.`
    );
  } else {
    lines.push("유지 관찰 종목이 적어 리스크 관리 기준과 확인 조건 중심의 재평가가 필요합니다.");
  }

  return lines.slice(0, 4);
}

function buildTomorrowCheckItems(options: {
  diagnoses: PortfolioDiagnosis[];
  riskAlerts: PortfolioRiskAlert[];
  alertConditionsByEntry: Record<string, UserAlertCondition[]>;
  triggeredUserAlertSummaries: UserAlertSummary[];
}) {
  const safeDiagnoses = Array.isArray(options.diagnoses) ? options.diagnoses : [];
  const safeRiskAlerts = Array.isArray(options.riskAlerts) ? options.riskAlerts : [];
  const safeTriggered = Array.isArray(options.triggeredUserAlertSummaries)
    ? options.triggeredUserAlertSummaries
    : [];
  const safeConditions =
    options.alertConditionsByEntry && typeof options.alertConditionsByEntry === "object"
      ? options.alertConditionsByEntry
      : {};
  const checks: string[] = [];
  const addCheck = (value: string) => {
    if (!value) return;
    if (!checks.includes(value)) checks.push(value);
  };

  const hasMa20Check = safeDiagnoses.some((item) => {
    const nextChecks = Array.isArray(item.nextChecks) ? item.nextChecks : [];
    const cautionReasons = Array.isArray(item.cautionReasons) ? item.cautionReasons : [];
    return hasKeyword(nextChecks, "MA20") || hasKeyword(cautionReasons, "MA20");
  });
  if (hasMa20Check) {
    addCheck("MA20 유지 여부를 확인하고 종가 기준 추세를 재평가하세요.");
  }

  addCheck("KIS 현재가 변화와 data.go.kr 최근 종가 간 괴리를 함께 관찰하세요.");

  const hasRsiHot = safeDiagnoses.some((item) => {
    const rsi = extractRsiFromDiagnosis(item);
    const cautionReasons = Array.isArray(item.cautionReasons) ? item.cautionReasons : [];
    return (typeof rsi === "number" && Number.isFinite(rsi) && rsi >= 70) || hasKeyword(cautionReasons, "과열");
  });
  if (hasRsiHot) {
    addCheck("RSI 과열 여부와 단기 변동성 확대 신호를 신중하게 확인하세요.");
  }

  const hasLowBreakRisk = safeRiskAlerts.some((item) => safeText(item.riskType).includes("20일 저점"));
  if (hasLowBreakRisk) {
    addCheck("20일 저점 이탈 여부와 거래량 반응을 함께 점검하세요.");
  }

  const hasUserConditions = Object.values(safeConditions).some(
    (list) => Array.isArray(list) && list.some((condition) => condition.enabled)
  );
  if (hasUserConditions || safeTriggered.length > 0) {
    addCheck("사용자 알림 조건 발동 여부를 확인하고 필요한 경우 기준값을 재조정하세요.");
  }

  if (checks.length < 3) {
    addCheck("다음 종가 흐름과 손익 전환 구간을 중심으로 확인 필요 항목을 점검하세요.");
  }
  if (checks.length < 3) {
    addCheck("리스크 관리 필요 종목은 우선순위를 높여 점검하고 재평가하세요.");
  }

  return checks.slice(0, 5);
}

function buildDailyPortfolioReportText(options: {
  dateText: string;
  portfolioStatusLabel: string;
  totalCount: number;
  totalValue: number;
  totalPnL: number;
  avgReturn: number;
  todayPriorityItems: DailyPortfolioReportItem[];
  keepObservationItems: DailyPortfolioReportItem[];
  riskManagementItems: DailyPortfolioReportItem[];
  tomorrowCheckItems: string[];
}) {
  const safeTop = Array.isArray(options.todayPriorityItems) ? options.todayPriorityItems : [];
  const safeKeep = Array.isArray(options.keepObservationItems) ? options.keepObservationItems : [];
  const safeRisk = Array.isArray(options.riskManagementItems) ? options.riskManagementItems : [];
  const safeChecks = Array.isArray(options.tomorrowCheckItems) ? options.tomorrowCheckItems : [];

  const topLines =
    safeTop.length === 0
      ? ["- 우선 확인 종목 데이터가 없습니다."]
      : safeTop.map((item, index) => {
          const lineIndex = index + 1;
          return `${lineIndex}. ${safeText(item.stockName)} (${safeText(item.symbol)}) | 수익률 ${formatPercent(
            safeNumber(item.returnRate)
          )} | ${formatJudgementLabel(safeText(item.judgement))} | 핵심 이유: ${safeText(
            item.coreReason
          )} | 다음 확인: ${safeText(
            item.nextCheck
          )}`;
        });

  const keepLines =
    safeKeep.length === 0
      ? ["- 현재 유지 관찰 종목은 없습니다."]
      : safeKeep.map(
          (item, index) =>
            `${index + 1}. ${safeText(item.stockName)} (${safeText(item.symbol)}) | 수익률 ${formatPercent(
              safeNumber(item.returnRate)
            )} | ${formatJudgementLabel(safeText(item.judgement))}`
        );

  const riskLines =
    safeRisk.length === 0
      ? ["- 현재 리스크 관리가 필요한 종목은 없습니다."]
      : safeRisk.map(
          (item, index) =>
            `${index + 1}. ${safeText(item.stockName)} (${safeText(item.symbol)}) | 수익률 ${formatPercent(
              safeNumber(item.returnRate)
            )} | 핵심 이유: ${safeText(item.coreReason)} | 다음 확인: ${safeText(item.nextCheck)}`
        );

  const checkLines =
    safeChecks.length === 0
      ? ["- 다음 종가와 MA20 유지 여부를 확인하며 재평가가 필요합니다."]
      : safeChecks.map((item, index) => `${index + 1}. ${safeText(item)}`);

  return [
    `날짜: ${safeText(options.dateText)}`,
    `전체 포트폴리오 상태: ${safeText(options.portfolioStatusLabel)}`,
    `총 보유 종목 수: ${formatNumber(safeNumber(options.totalCount))}`,
    `총 평가금액: ${formatKRW(safeNumber(options.totalValue))}`,
    `총 평가손익: ${formatKRW(safeNumber(options.totalPnL))}`,
    `평균 수익률: ${formatPercent(safeNumber(options.avgReturn))}`,
    "",
    "오늘 먼저 확인할 종목 TOP 3",
    ...topLines,
    "",
    "유지 관찰 종목",
    ...keepLines,
    "",
    "리스크 관리 필요 종목",
    ...riskLines,
    "",
    "내일 확인 조건",
    ...checkLines,
    "",
    "면책 문구",
    "본 내용은 관찰과 확인 필요 사항을 정리한 참고 정보이며 투자 조언이 아닙니다. 최종 판단과 책임은 사용자에게 있습니다."
  ].join("\n");
}

function wrapCanvasTextLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const safeTextValue = safeText(text);
  if (!safeTextValue) return [""];

  const words = safeTextValue.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const chunkCandidate = `${chunk}${char}`;
      if (context.measureText(chunkCandidate).width <= maxWidth) {
        chunk = chunkCandidate;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

function buildPortfolioNotificationItems(
  riskAlerts: PortfolioRiskAlert[],
  userAlertSummaries: UserAlertSummary[]
) {
  const safeRiskAlerts = Array.isArray(riskAlerts) ? riskAlerts : [];
  const safeUserSummaries = Array.isArray(userAlertSummaries) ? userAlertSummaries : [];
  const grouped = new Map<
    string,
    {
      symbol: string;
      stockName: string;
      riskAlerts: PortfolioRiskAlert[];
      userSummary: UserAlertSummary | null;
      priority: number;
    }
  >();

  for (const riskAlert of safeRiskAlerts) {
    const key = safeText(riskAlert.symbol);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) {
      existing.riskAlerts.push(riskAlert);
      existing.priority = Math.max(existing.priority, safeNumber(riskAlert.priority, 0) + 100);
      continue;
    }
    grouped.set(key, {
      symbol: safeText(riskAlert.symbol),
      stockName: safeText(riskAlert.stockName, safeText(riskAlert.symbol)),
      riskAlerts: [riskAlert],
      userSummary: null,
      priority: safeNumber(riskAlert.priority, 0) + 100
    });
  }

  for (const summary of safeUserSummaries) {
    const key = safeText(summary.symbol);
    if (!key) continue;
    const existing = grouped.get(key);
    if (existing) {
      existing.userSummary = summary;
      existing.priority = Math.max(existing.priority, safeNumber(summary.topPriority, 0));
      continue;
    }
    grouped.set(key, {
      symbol: safeText(summary.symbol),
      stockName: safeText(summary.stockName, safeText(summary.symbol)),
      riskAlerts: [],
      userSummary: summary,
      priority: safeNumber(summary.topPriority, 0)
    });
  }

  const items: PortfolioNotificationItem[] = [];
  grouped.forEach((group) => {
    const riskCount = Array.isArray(group.riskAlerts) ? group.riskAlerts.length : 0;
    const userCount = safeNumber(group.userSummary?.triggerCount, 0);
    if (riskCount <= 0 && userCount <= 0) return;

    const hasMa20Risk = (Array.isArray(group.riskAlerts) ? group.riskAlerts : []).some((item) =>
      safeText(item.riskType).includes("MA20")
    );
    const hasPriceLowerUser = Array.isArray(group.userSummary?.triggerMessages)
      ? group.userSummary?.triggerMessages.some((msg) => safeText(msg).includes("설정가"))
      : false;

    let body = "";
    if (riskCount > 0 && userCount > 0) {
      body = `${group.stockName} 리스크 알림 ${riskCount}개와 사용자 알림 ${userCount}개가 있습니다. 현재가 조건과 MA20 기준을 확인하세요.`;
    } else if (riskCount > 0) {
      body = `${group.stockName} 리스크 알림 ${riskCount}개가 있습니다. 다음 확인 조건을 점검하세요.`;
    } else {
      body = `${group.stockName} 사용자 알림 ${userCount}개가 발동했습니다. 설정한 조건을 확인하세요.`;
    }

    const riskTypes = (Array.isArray(group.riskAlerts) ? group.riskAlerts : [])
      .map((item) => safeText(item.riskType))
      .filter(Boolean)
      .sort()
      .join("|");
    const userTriggerDigest = (Array.isArray(group.userSummary?.triggerMessages)
      ? group.userSummary?.triggerMessages
      : []
    )
      .map((msg) => safeText(msg))
      .filter(Boolean)
      .sort()
      .join("|");
    const signature = `${riskTypes}::${userTriggerDigest}::${hasMa20Risk ? "ma20" : ""}::${
      hasPriceLowerUser ? "price" : ""
    }`;

    items.push({
      symbol: group.symbol,
      stockName: group.stockName,
      body,
      priority: safeNumber(group.priority, 0),
      signature
    });
  });

  return items.sort((left, right) => right.priority - left.priority);
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
        "AI 판단 결과가 리스크 관리 필요 구간으로 분류되어 재평가가 필요합니다.",
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

export function PortfolioPageClient({ signals }: { signals: MarketSignal[] }) {
  const { user } = useAuth();
  const { symbols: watchlistSymbols } = useWatchlist();
  const {
    entries,
    plan,
    planStatusLabel,
    holdingLimit,
    isHoldingLimitReached,
    isHoldingNearLimit,
    planLimitNotice,
    addEntry,
    removeEntry,
    canSyncLocalToCloud,
    syncLocalToCloud,
    isCloudSyncEnabled,
    isCloudSyncing,
    cloudSyncNotice,
    cloudSyncStatus,
    isSupabaseReady
  } = usePortfolio();
  const [diagnoses, setDiagnoses] = useState<PortfolioDiagnosis[]>([]);
  const [failures, setFailures] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [alertConditionsByEntry, setAlertConditionsByEntry] = useState<
    Record<string, UserAlertCondition[]>
  >({});
  const [isAlertConditionsReady, setIsAlertConditionsReady] = useState(false);
  const [alertDraftByEntry, setAlertDraftByEntry] = useState<Record<string, ConditionDraft>>({});
  const [notificationPermission, setNotificationPermission] =
    useState<NotificationPermissionState>("default");
  const [isBrowserNotificationEnabled, setIsBrowserNotificationEnabled] = useState(false);
  const [browserNotificationNotice, setBrowserNotificationNotice] = useState("");
  const setNotificationStatusMessage = setBrowserNotificationNotice;
  const [dailyReportCopyNotice, setDailyReportCopyNotice] = useState("");
  const [dailyReportImageNotice, setDailyReportImageNotice] = useState("");
  const [dailyReportCloudNotice, setDailyReportCloudNotice] = useState("");
  const [isSavingDailyReport, setIsSavingDailyReport] = useState(false);
  const [todaySavedReportCount, setTodaySavedReportCount] = useState(0);
  const [recentSavedReports, setRecentSavedReports] = useState<PortfolioReportHistoryItem[]>([]);
  const [isRecentReportsLoading, setIsRecentReportsLoading] = useState(false);
  const [recentReportsNotice, setRecentReportsNotice] = useState("");
  const [expandedSavedReportId, setExpandedSavedReportId] = useState<string | null>(null);
  const [cloudSyncActionNotice, setCloudSyncActionNotice] = useState("");
  const [alertRuleSyncNotice, setAlertRuleSyncNotice] = useState("");
  const [localAlertConditionsSnapshot, setLocalAlertConditionsSnapshot] = useState<
    Record<string, UserAlertCondition[]>
  >({});
  const [cloudAlertConditionsSnapshot, setCloudAlertConditionsSnapshot] = useState<
    Record<string, UserAlertCondition[]>
  >({});
  const [isAlertRuleSyncing, setIsAlertRuleSyncing] = useState(false);
  const [alertRuleSyncStatus, setAlertRuleSyncStatus] = useState<AlertRuleSyncStatus>("local");
  const [symbolLookup, setSymbolLookup] = useState<{
    symbol: string;
    name: string;
    market: string;
    dataSource: string;
  } | null>(null);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [isLookupLoading, setIsLookupLoading] = useState(false);
  const [mobileTab, setMobileTab] = useState<PortfolioMobileTab>("summary");
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

  useEffect(() => {
    if (typeof window === "undefined") return;

    const syncMobileTabWithHash = () => {
      const currentHash = window.location.hash.toLowerCase();
      const nextTab: PortfolioMobileTab =
        currentHash === "#reports"
          ? "reports"
          : currentHash === "#portfolio-alerts"
            ? "alerts"
            : currentHash === "#portfolio-holdings"
              ? "holdings"
              : "summary";
      setMobileTab(nextTab);

      if (nextTab === "reports") {
        window.requestAnimationFrame(() => {
          const reportSection = window.document.getElementById("reports");
          if (reportSection) {
            reportSection.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        });
      }
    };

    syncMobileTabWithHash();
    window.addEventListener("hashchange", syncMobileTabWithHash);
    return () => {
      window.removeEventListener("hashchange", syncMobileTabWithHash);
    };
  }, []);

  const safeEntries = useMemo(
    () => (Array.isArray(entries) ? entries : []),
    [entries]
  );
  const safeSignals = useMemo(
    () => (Array.isArray(signals) ? signals : []),
    [signals]
  );
  const safeWatchlistSymbols = useMemo(
    () =>
      (Array.isArray(watchlistSymbols) ? watchlistSymbols : []).filter(
        (item): item is string => typeof item === "string" && Boolean(item)
      ),
    [watchlistSymbols]
  );
  const currentPlanLabel = planStatusLabel;
  const isFreePlan = !isPaidPlan(plan);
  const watchlistLimit = isFreePlan ? FREE_LIMITS.watchlist : null;
  const reportDailyLimit = isFreePlan ? FREE_LIMITS.dailyReportSave : null;
  const watchlistCount = safeWatchlistSymbols.length;
  const reportLimitReached = Boolean(
    reportDailyLimit !== null && todaySavedReportCount >= reportDailyLimit
  );
  const isWatchlistNearLimit = Boolean(
    watchlistLimit !== null && watchlistCount >= watchlistLimit - 1 && watchlistCount < watchlistLimit
  );
  const showNearLimitNotice = isFreePlan && (isWatchlistNearLimit || isHoldingNearLimit);
  const hasPlanOverLimitData = Boolean(
    isFreePlan &&
      ((watchlistLimit !== null && watchlistCount > watchlistLimit) ||
        (holdingLimit !== null && safeEntries.length > holdingLimit))
  );
  const cloudSyncStatusLabel = useMemo(() => {
    if (cloudSyncStatus === "failed") return "동기화 실패";
    if (cloudSyncStatus === "synced" && isCloudSyncEnabled) return "클라우드 동기화됨";
    return "로컬 모드";
  }, [cloudSyncStatus, isCloudSyncEnabled]);
  const alertRuleSyncStatusLabel = useMemo(() => {
    if (!isCloudSyncEnabled) return "알림 조건 로컬 모드";
    if (alertRuleSyncStatus === "failed") return "알림 조건 동기화 실패";
    if (alertRuleSyncStatus === "synced") return "알림 조건 클라우드 동기화됨";
    return "알림 조건 로컬 모드";
  }, [alertRuleSyncStatus, isCloudSyncEnabled]);
  const canSyncLocalAlertRulesToCloud = useMemo(() => {
    if (!isCloudSyncEnabled || !supabase || !user?.id) return false;
    if (!hasAnyAlertConditionMapItems(localAlertConditionsSnapshot)) return false;

    const localSignatures = getAlertConditionSignatures(localAlertConditionsSnapshot);
    const cloudSignatures = getAlertConditionSignatures(cloudAlertConditionsSnapshot);
    if (localSignatures.size !== cloudSignatures.size) return true;
    for (const signature of Array.from(localSignatures)) {
      if (!cloudSignatures.has(signature)) return true;
    }
    return false;
  }, [
    cloudAlertConditionsSnapshot,
    isCloudSyncEnabled,
    localAlertConditionsSnapshot,
    supabase,
    user?.id
  ]);

  useEffect(() => {
    if (cloudSyncNotice) {
      setCloudSyncActionNotice(cloudSyncNotice);
    }
  }, [cloudSyncNotice]);

  async function handleSyncLocalToCloud() {
    const result = await syncLocalToCloud();
    setCloudSyncActionNotice(result.message);
  }
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
    let cancelled = false;
    setIsAlertConditionsReady(false);
    setAlertRuleSyncNotice("");
    setAlertRuleSyncStatus(isCloudSyncEnabled ? "synced" : "local");

    let localConditions: Record<string, UserAlertCondition[]> = {};
    try {
      const raw = window.localStorage.getItem(ALERT_CONDITIONS_STORAGE_KEY);
      localConditions = parseLocalAlertConditionMap(raw);
    } catch {
      localConditions = {};
    }

    setAlertConditionsByEntry(localConditions);
    setLocalAlertConditionsSnapshot(localConditions);

    if (!isCloudSyncEnabled || !supabase || !user?.id) {
      setCloudAlertConditionsSnapshot({});
      setAlertRuleSyncStatus("local");
      setIsAlertConditionsReady(true);
      return;
    }

    void (async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_alert_rules")
          .select("id,user_id,holding_id,rule_type,threshold,enabled,created_at,updated_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (cancelled) return;
        if (error) {
          setAlertConditionsByEntry(localConditions);
          setCloudAlertConditionsSnapshot({});
          setAlertRuleSyncStatus("failed");
          setAlertRuleSyncNotice("클라우드 동기화에 실패했습니다. 로컬 데이터는 유지됩니다.");
          return;
        }

        const safeRows = Array.isArray(data) ? data : [];
        if (safeRows.length === 0) {
          setAlertConditionsByEntry(localConditions);
          setCloudAlertConditionsSnapshot({});
          setAlertRuleSyncStatus("synced");
          return;
        }

        const grouped: Record<string, UserAlertCondition[]> = {};
        for (const row of safeRows as PortfolioAlertRuleRow[]) {
          const entryId =
            typeof row.holding_id === "string" ? row.holding_id : "";
          if (!entryId) continue;
          const normalized = rowToAlertCondition(row);
          if (!normalized) continue;
          const existing = Array.isArray(grouped[entryId]) ? grouped[entryId] : [];
          grouped[entryId] = [...existing, normalized];
        }

        setAlertConditionsByEntry(grouped);
        setCloudAlertConditionsSnapshot(grouped);
        setAlertRuleSyncStatus("synced");
      } catch {
        if (cancelled) return;
        setAlertConditionsByEntry(localConditions);
        setCloudAlertConditionsSnapshot({});
        setAlertRuleSyncStatus("failed");
        setAlertRuleSyncNotice("클라우드 동기화에 실패했습니다. 로컬 데이터는 유지됩니다.");
      } finally {
        if (!cancelled) {
          setIsAlertConditionsReady(true);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCloudSyncEnabled, user?.id]);

  useEffect(() => {
    if (!isAlertConditionsReady) return;
    try {
      window.localStorage.setItem(
        ALERT_CONDITIONS_STORAGE_KEY,
        JSON.stringify(alertConditionsByEntry)
      );
    } catch {
      // localStorage may be blocked in restricted contexts.
    }
  }, [alertConditionsByEntry, isAlertConditionsReady]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setIsBrowserNotificationEnabled(false);
      setBrowserNotificationNotice("이 브라우저에서는 알림 기능을 사용할 수 없습니다.");
      return;
    }

    const permission = normalizeNotificationPermission(Notification.permission);
    setNotificationPermission(permission);
    try {
      const raw = window.localStorage.getItem(BROWSER_NOTIFICATION_ENABLED_KEY);
      setIsBrowserNotificationEnabled(raw === "true");
    } catch {
      setIsBrowserNotificationEnabled(false);
    }
    if (permission === "denied") {
      setIsBrowserNotificationEnabled(false);
      try {
        window.localStorage.setItem(BROWSER_NOTIFICATION_ENABLED_KEY, "false");
      } catch {
        // localStorage may be blocked in restricted contexts.
      }
      setBrowserNotificationNotice(
        "브라우저 알림 권한이 차단되었습니다. 브라우저 설정에서 알림 권한을 허용해주세요."
      );
    }
  }, []);

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
  const triggeredUserAlerts = useMemo(
    () => buildTriggeredUserAlerts(safeEntries, diagnoses, alertConditionsByEntry),
    [safeEntries, diagnoses, alertConditionsByEntry]
  );
  const triggeredUserAlertSummaries = useMemo(
    () => buildTriggeredUserAlertSummaries(triggeredUserAlerts, diagnosisMap),
    [triggeredUserAlerts, diagnosisMap]
  );
  const portfolioNotificationItems = useMemo(
    () => buildPortfolioNotificationItems(riskAlerts, triggeredUserAlertSummaries),
    [riskAlerts, triggeredUserAlertSummaries]
  );
  const dailyReportItems = useMemo(
    () => buildDailyPortfolioReportItems(safeEntries, diagnosisMap, failures),
    [safeEntries, diagnosisMap, failures]
  );
  const todayPriorityItems = useMemo(
    () => (Array.isArray(dailyReportItems) ? dailyReportItems.slice(0, 3) : []),
    [dailyReportItems]
  );
  const keepObservationItems = useMemo(
    () =>
      (Array.isArray(dailyReportItems) ? dailyReportItems : [])
        .filter((item) => item.judgement === "유지 관찰")
        .slice(0, 3),
    [dailyReportItems]
  );
  const riskManagementItems = useMemo(
    () =>
      (Array.isArray(dailyReportItems) ? dailyReportItems : [])
        .filter((item) => item.judgement === "리스크 관리 관찰")
        .slice(0, 3),
    [dailyReportItems]
  );
  const keepObservationCount = useMemo(
    () =>
      (Array.isArray(dailyReportItems) ? dailyReportItems : []).filter(
        (item) => item.judgement === "유지 관찰"
      ).length,
    [dailyReportItems]
  );
  const portfolioSummaryLines = useMemo(
    () =>
      buildPortfolioSummaryLines({
        totalCount: safeEntries.length,
        avgReturn: summary.avgReturn,
        riskUpCount,
        keepCount: keepObservationCount,
        topItems: todayPriorityItems
      }),
    [safeEntries.length, summary.avgReturn, riskUpCount, keepObservationCount, todayPriorityItems]
  );
  const tomorrowCheckItems = useMemo(
    () =>
      buildTomorrowCheckItems({
        diagnoses,
        riskAlerts,
        alertConditionsByEntry,
        triggeredUserAlertSummaries
      }),
    [diagnoses, riskAlerts, alertConditionsByEntry, triggeredUserAlertSummaries]
  );
  const portfolioStatusLabel = useMemo(() => {
    if (safeEntries.length === 0) return "포트폴리오 데이터 대기";
    if (riskUpCount > 0) return "리스크 재평가 필요 구간";
    if (summary.avgReturn >= 0) return "수익 관찰 구간";
    return "변동성 관찰 구간";
  }, [safeEntries.length, riskUpCount, summary.avgReturn]);
  const dailyReportDateText = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = `${now.getMonth() + 1}`.padStart(2, "0");
    const day = `${now.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);
  const dailyReportSummaryText = useMemo(() => {
    const safeLines = Array.isArray(portfolioSummaryLines) ? portfolioSummaryLines : [];
    if (safeLines.length === 0) {
      return "보유종목을 추가하면 오늘의 AI 리포트를 생성할 수 있습니다.";
    }
    return safeLines.join(" ").trim();
  }, [portfolioSummaryLines]);
  const dailyReportPayload = useMemo<PortfolioReportPayload>(
    () => ({
      totalHoldings: safeEntries.length,
      totalEvaluation: safeNumber(summary.totalValue, 0),
      totalProfitLoss: safeNumber(summary.totalPnL, 0),
      averageReturnRate: safeNumber(summary.avgReturn, 0),
      riskCount: safeNumber(riskUpCount, 0),
      holdCount: safeNumber(keepObservationCount, 0),
      topWatchItems: (Array.isArray(todayPriorityItems) ? todayPriorityItems : []).map(
        reportItemToPayloadItem
      ),
      maintainItems: (Array.isArray(keepObservationItems) ? keepObservationItems : []).map(
        reportItemToPayloadItem
      ),
      riskItems: (Array.isArray(riskManagementItems) ? riskManagementItems : []).map(
        reportItemToPayloadItem
      ),
      nextCheckConditions: (Array.isArray(tomorrowCheckItems) ? tomorrowCheckItems : [])
        .map((item) => safeText(item))
        .filter((item) => Boolean(item)),
      createdAt: new Date().toISOString()
    }),
    [
      keepObservationCount,
      keepObservationItems,
      riskManagementItems,
      riskUpCount,
      safeEntries.length,
      summary.avgReturn,
      summary.totalPnL,
      summary.totalValue,
      todayPriorityItems,
      tomorrowCheckItems
    ]
  );

  const fetchRecentSavedReports = useCallback(async () => {
    if (!isSupabaseReady || !supabase || !user?.id) {
      setRecentSavedReports([]);
      setTodaySavedReportCount(0);
      setRecentReportsNotice(
        isSupabaseReady
          ? "로그인하면 저장한 AI 리포트를 확인할 수 있습니다."
          : "리포트 클라우드 저장을 사용할 수 없습니다."
      );
      return;
    }

    setIsRecentReportsLoading(true);
    try {
      const [{ data, error }, { count, error: countError }] = await Promise.all([
        supabase
          .from("portfolio_reports")
          .select("id,user_id,report_date,summary,payload,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("portfolio_reports")
          .select("id", { count: "exact", head: true })
          .eq("user_id", user.id)
          .eq("report_date", dailyReportDateText)
      ]);

      if (error) {
        throw error;
      }
      if (countError) {
        throw countError;
      }

      const safeRows = Array.isArray(data) ? data : [];
      const normalized = safeRows
        .map((row): PortfolioReportHistoryItem | null => {
          const raw = row as PortfolioReportRow;
          const id = safeText(raw.id);
          const reportDate = safeText(raw.report_date);
          const summary = safeText(raw.summary);
          const createdAt = safeText(raw.created_at);
          if (!id || !reportDate) return null;
          return {
            id,
            reportDate,
            summary,
            createdAt,
            payload: normalizePortfolioReportPayload(raw.payload)
          };
        })
        .filter((item): item is PortfolioReportHistoryItem => Boolean(item));

      setRecentSavedReports(normalized);
      setTodaySavedReportCount(Number.isFinite(count ?? NaN) ? Number(count) : 0);
      setRecentReportsNotice("");
    } catch {
      setRecentSavedReports([]);
      setTodaySavedReportCount(0);
      setRecentReportsNotice("리포트 클라우드 저장을 사용할 수 없습니다.");
    } finally {
      setIsRecentReportsLoading(false);
    }
  }, [dailyReportDateText, isSupabaseReady, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      setRecentSavedReports([]);
      setTodaySavedReportCount(0);
      setExpandedSavedReportId(null);
      setRecentReportsNotice("로그인하면 저장한 AI 리포트를 확인할 수 있습니다.");
      return;
    }

    void fetchRecentSavedReports();
  }, [fetchRecentSavedReports, user?.id]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!isBrowserNotificationEnabled) return;
    if (notificationPermission !== "granted") return;
    if (!("Notification" in window)) return;

    const safeItems = Array.isArray(portfolioNotificationItems) ? portfolioNotificationItems : [];
    if (safeItems.length === 0) return;

    const dateKey = localDateKey();
    for (const item of safeItems.slice(0, 3)) {
      const symbol = safeText(item.symbol).toUpperCase();
      const signature = safeText(item.signature);
      if (!symbol || !signature) continue;
      const notifiedKey = `${BROWSER_NOTIFICATION_NOTIFIED_PREFIX}:${dateKey}:${symbol}:${signature}`;

      try {
        if (window.localStorage.getItem(notifiedKey)) {
          continue;
        }

        new Notification("KRX Insight 보유종목 알림", {
          body: safeText(item.body, `${safeText(item.stockName)} 알림을 확인하세요.`)
        });
        window.localStorage.setItem(notifiedKey, new Date().toISOString());
      } catch {
        setBrowserNotificationNotice(
          "브라우저 알림 전송 중 문제가 발생했습니다. 권한과 브라우저 설정을 확인해주세요."
        );
      }
    }
  }, [isBrowserNotificationEnabled, notificationPermission, portfolioNotificationItems]);

  function getAlertDraft(entryId: string): ConditionDraft {
    const draft = alertDraftByEntry[entryId];
    if (draft && isAlertConditionType(draft.type)) {
      return draft;
    }
    return {
      type: "price_lte",
      threshold: ""
    };
  }

  const insertAlertConditionToCloud = useCallback(
    async (entryId: string, condition: UserAlertCondition) => {
      if (!isCloudSyncEnabled || !supabase || !user?.id) return;
      if (!entryId) {
        setAlertRuleSyncStatus("failed");
        setAlertRuleSyncNotice("보유종목 ID를 확인할 수 없습니다.");
        return;
      }

      const row = conditionToRuleRow(entryId, condition, user.id);
      console.log("[portfolio-alert] inserting rule");
      console.log("[portfolio-alert] user_id:", user.id);
      console.log("[portfolio-alert] holding_id:", entryId);
      console.log("[portfolio-alert] rule_type:", condition.type);
      console.log("[portfolio-alert] threshold:", condition.threshold);

      try {
        const { error } = await supabase
          .from("portfolio_alert_rules")
          .upsert([row], { onConflict: "user_id,id" });
        if (error) {
          throw error;
        }

        console.log("[portfolio-alert] insert success");
        setCloudAlertConditionsSnapshot((current) => {
          const safeCurrent = normalizeAlertConditionMap(current);
          const existing = Array.isArray(safeCurrent[entryId]) ? safeCurrent[entryId] : [];
          const next = [...existing.filter((item) => item.id !== condition.id), condition];
          return {
            ...safeCurrent,
            [entryId]: next
          };
        });
        setAlertRuleSyncStatus("synced");
        setAlertRuleSyncNotice("알림 조건 클라우드 동기화됨");
      } catch (error) {
        const message = extractSupabaseErrorMessage(error);
        console.log("[portfolio-alert] insert error", message);
        setAlertRuleSyncStatus("failed");
        setAlertRuleSyncNotice(`알림 조건 클라우드 동기화에 실패했습니다: ${message}`);
      }
    },
    [isCloudSyncEnabled, supabase, user?.id]
  );

  const updateAlertConditionEnabledInCloud = useCallback(
    async (entryId: string, conditionId: string, enabled: boolean) => {
      if (!isCloudSyncEnabled || !supabase || !user?.id) return;
      if (!entryId) {
        setAlertRuleSyncStatus("failed");
        setAlertRuleSyncNotice("보유종목 ID를 확인할 수 없습니다.");
        return;
      }

      try {
        const { error } = await supabase
          .from("portfolio_alert_rules")
          .update({
            enabled,
            updated_at: new Date().toISOString()
          })
          .eq("user_id", user.id)
          .eq("holding_id", entryId)
          .eq("id", conditionId);
        if (error) {
          throw error;
        }

        setCloudAlertConditionsSnapshot((current) => {
          const safeCurrent = normalizeAlertConditionMap(current);
          const existing = Array.isArray(safeCurrent[entryId]) ? safeCurrent[entryId] : [];
          const next = existing.map((condition) =>
            condition.id === conditionId ? { ...condition, enabled } : condition
          );
          return {
            ...safeCurrent,
            [entryId]: next
          };
        });
        setAlertRuleSyncStatus("synced");
        setAlertRuleSyncNotice("알림 조건 클라우드 동기화됨");
      } catch (error) {
        const message = extractSupabaseErrorMessage(error);
        setAlertRuleSyncStatus("failed");
        setAlertRuleSyncNotice(`알림 조건 클라우드 동기화에 실패했습니다: ${message}`);
      }
    },
    [isCloudSyncEnabled, supabase, user?.id]
  );

  const deleteAlertConditionFromCloud = useCallback(
    async (entryId: string, conditionId: string) => {
      if (!isCloudSyncEnabled || !supabase || !user?.id) return;
      if (!entryId) {
        setAlertRuleSyncStatus("failed");
        setAlertRuleSyncNotice("보유종목 ID를 확인할 수 없습니다.");
        return;
      }

      try {
        const { error } = await supabase
          .from("portfolio_alert_rules")
          .delete()
          .eq("user_id", user.id)
          .eq("holding_id", entryId)
          .eq("id", conditionId);
        if (error) {
          throw error;
        }

        setCloudAlertConditionsSnapshot((current) => {
          const safeCurrent = normalizeAlertConditionMap(current);
          const existing = Array.isArray(safeCurrent[entryId]) ? safeCurrent[entryId] : [];
          const next = existing.filter((condition) => condition.id !== conditionId);
          return {
            ...safeCurrent,
            [entryId]: next
          };
        });
        setAlertRuleSyncStatus("synced");
        setAlertRuleSyncNotice("알림 조건 클라우드 동기화됨");
      } catch (error) {
        const message = extractSupabaseErrorMessage(error);
        setAlertRuleSyncStatus("failed");
        setAlertRuleSyncNotice(`알림 조건 클라우드 동기화에 실패했습니다: ${message}`);
      }
    },
    [isCloudSyncEnabled, supabase, user?.id]
  );

  const handleSyncLocalAlertRulesToCloud = useCallback(async () => {
    if (!isCloudSyncEnabled || !supabase || !user?.id) {
      setAlertRuleSyncStatus("local");
      setAlertRuleSyncNotice("클라우드 동기화 미설정");
      return;
    }

    const normalizedLocalMap = normalizeAlertConditionMap(localAlertConditionsSnapshot);
    const rows = Object.entries(normalizedLocalMap).flatMap(([entryId, conditions]) => {
      const safeConditions = Array.isArray(conditions) ? conditions : [];
      return safeConditions.map((condition) => conditionToRuleRow(entryId, condition, user.id));
    });

    setIsAlertRuleSyncing(true);
    try {
      const { error: deleteError } = await supabase
        .from("portfolio_alert_rules")
        .delete()
        .eq("user_id", user.id);
      if (deleteError) {
        throw deleteError;
      }

      if (rows.length > 0) {
        const { error: upsertError } = await supabase
          .from("portfolio_alert_rules")
          .upsert(rows, { onConflict: "user_id,id" });
        if (upsertError) {
          throw upsertError;
        }
      }

      setAlertConditionsByEntry(normalizedLocalMap);
      setCloudAlertConditionsSnapshot(normalizedLocalMap);
      setAlertRuleSyncStatus("synced");
      setAlertRuleSyncNotice("로컬 알림 조건을 클라우드에 동기화했습니다.");
    } catch {
      setAlertRuleSyncStatus("failed");
      setAlertRuleSyncNotice(
        "알림 조건 클라우드 동기화에 실패했습니다. 로컬 데이터는 유지됩니다."
      );
    } finally {
      setIsAlertRuleSyncing(false);
    }
  }, [isCloudSyncEnabled, localAlertConditionsSnapshot, supabase, user?.id]);

  function updateAlertDraft(entryId: string, patch: Partial<ConditionDraft>) {
    setAlertDraftByEntry((current) => {
      const base = getAlertDraft(entryId);
      const nextType = patch.type ?? base.type;
      const nextThreshold = patch.threshold ?? base.threshold;
      return {
        ...current,
        [entryId]: {
          type: isAlertConditionType(nextType) ? nextType : base.type,
          threshold: nextThreshold
        }
      };
    });
  }

  function addAlertCondition(entryId: string) {
    if (!entryId) {
      setAlertRuleSyncStatus("failed");
      setAlertRuleSyncNotice("보유종목 ID를 확인할 수 없습니다.");
      return;
    }

    const draft = getAlertDraft(entryId);
    const needsThreshold = isThresholdRequired(draft.type);
    const trimmedThreshold = draft.threshold.trim();
    if (needsThreshold && !trimmedThreshold) {
      setAlertRuleSyncStatus(isCloudSyncEnabled ? "failed" : "local");
      setAlertRuleSyncNotice("알림 기준값을 올바르게 입력해주세요.");
      return;
    }

    const parsedThreshold = Number(trimmedThreshold);
    const threshold =
      needsThreshold && Number.isFinite(parsedThreshold) ? parsedThreshold : null;

    if (needsThreshold && threshold === null) {
      setAlertRuleSyncStatus(isCloudSyncEnabled ? "failed" : "local");
      setAlertRuleSyncNotice("알림 기준값을 올바르게 입력해주세요.");
      return;
    }

    if (
      (draft.type === "price_lte" || draft.type === "price_gte") &&
      (threshold === null || threshold <= 0)
    ) {
      setAlertRuleSyncStatus(isCloudSyncEnabled ? "failed" : "local");
      setAlertRuleSyncNotice("알림 기준값을 올바르게 입력해주세요.");
      return;
    }

    const newCondition: UserAlertCondition = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      type: draft.type,
      threshold,
      enabled: true,
      createdAt: new Date().toISOString()
    };

    const existing = Array.isArray(alertConditionsByEntry[entryId]) ? alertConditionsByEntry[entryId] : [];
    const nextEntryConditions = [...existing, newCondition];
    setAlertConditionsByEntry((current) => {
      return {
        ...current,
        [entryId]: nextEntryConditions
      };
    });
    if (isCloudSyncEnabled && user?.id && supabase) {
      void insertAlertConditionToCloud(entryId, newCondition);
    } else {
      setAlertRuleSyncStatus("local");
      setAlertRuleSyncNotice("");
    }

    updateAlertDraft(entryId, { threshold: "" });
  }

  function toggleAlertCondition(entryId: string, conditionId: string) {
    const existing = Array.isArray(alertConditionsByEntry[entryId]) ? alertConditionsByEntry[entryId] : [];
    const target = existing.find((condition) => condition.id === conditionId);
    const nextEnabled = target ? !target.enabled : false;
    const nextEntryConditions = existing.map((condition) =>
      condition.id === conditionId
        ? { ...condition, enabled: nextEnabled }
        : condition
    );
    setAlertConditionsByEntry((current) => {
      return {
        ...current,
        [entryId]: nextEntryConditions
      };
    });
    if (isCloudSyncEnabled && user?.id && supabase && target) {
      void updateAlertConditionEnabledInCloud(entryId, conditionId, nextEnabled);
    } else if (!isCloudSyncEnabled) {
      setAlertRuleSyncStatus("local");
      setAlertRuleSyncNotice("");
    }
  }

  function removeAlertCondition(entryId: string, conditionId: string) {
    const existing = Array.isArray(alertConditionsByEntry[entryId]) ? alertConditionsByEntry[entryId] : [];
    const nextEntryConditions = existing.filter((condition) => condition.id !== conditionId);
    setAlertConditionsByEntry((current) => {
      return {
        ...current,
        [entryId]: nextEntryConditions
      };
    });
    if (isCloudSyncEnabled && user?.id && supabase) {
      void deleteAlertConditionFromCloud(entryId, conditionId);
    } else {
      setAlertRuleSyncStatus("local");
      setAlertRuleSyncNotice("");
    }
  }

  function onDraftChange<K extends keyof DraftState>(key: K, value: DraftState[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function addPortfolioEntry(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const symbol = draft.symbol.trim().toUpperCase();
    const buyPrice = parseNumber(draft.buyPrice);
    const quantity = parseNumber(draft.quantity);
    if (!symbol || buyPrice <= 0 || quantity <= 0) return;

    if (isFreePlan && holdingLimit !== null && safeEntries.length >= holdingLimit) {
      setCloudSyncActionNotice(
        user?.id
          ? "Free 플랜에서는 보유종목을 최대 3개까지 관리할 수 있습니다."
          : "Free 플랜에서는 보유종목을 최대 3개까지 관리할 수 있습니다. 로그인하면 클라우드 동기화와 요금제 기능을 사용할 수 있습니다."
      );
      return;
    }

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

    setCloudSyncActionNotice("");
    setDraft((current) => ({
      ...current,
      symbol: "",
      buyPrice: "",
      quantity: "",
      memo: ""
    }));
  }

  async function handleToggleBrowserNotification() {
    console.log("[portfolio-notification] button clicked");
    if (typeof window === "undefined") return;

    if (isBrowserNotificationEnabled) {
      setIsBrowserNotificationEnabled(false);
      setNotificationStatusMessage("브라우저 알림이 꺼졌습니다.");
      try {
        window.localStorage.setItem(BROWSER_NOTIFICATION_ENABLED_KEY, "false");
      } catch {
        // localStorage may be blocked in restricted contexts.
      }
      return;
    }

    if (!("Notification" in window)) {
      setNotificationPermission("unsupported");
      setIsBrowserNotificationEnabled(false);
      setNotificationStatusMessage("이 브라우저에서는 알림 기능을 사용할 수 없습니다.");
      return;
    }

    try {
      let nextPermission = normalizeNotificationPermission(Notification.permission);
      if (nextPermission === "default") {
        nextPermission = normalizeNotificationPermission(await Notification.requestPermission());
      }
      setNotificationPermission(nextPermission);

      if (nextPermission === "granted") {
        setIsBrowserNotificationEnabled(true);
        setNotificationStatusMessage("브라우저 알림이 켜졌습니다.");
        try {
          window.localStorage.setItem(BROWSER_NOTIFICATION_ENABLED_KEY, "true");
        } catch {
          // localStorage may be blocked in restricted contexts.
        }
        try {
          new Notification("KRX Insight", {
            body: "브라우저 알림이 정상적으로 켜졌습니다."
          });
        } catch {
          setNotificationStatusMessage(
            "브라우저 알림은 켜졌지만 테스트 알림 전송 중 문제가 발생했습니다."
          );
        }
        return;
      }

      if (nextPermission === "denied") {
        setIsBrowserNotificationEnabled(false);
        try {
          window.localStorage.setItem(BROWSER_NOTIFICATION_ENABLED_KEY, "false");
        } catch {
          // localStorage may be blocked in restricted contexts.
        }
        setNotificationStatusMessage(
          "브라우저 알림 권한이 차단되었습니다. 브라우저 설정에서 알림 권한을 허용해주세요."
        );
        return;
      }

      setIsBrowserNotificationEnabled(false);
      try {
        window.localStorage.setItem(BROWSER_NOTIFICATION_ENABLED_KEY, "false");
      } catch {
        // localStorage may be blocked in restricted contexts.
      }
      setNotificationStatusMessage(
        "브라우저 알림 권한 허용이 필요합니다. 브라우저 설정에서 권한 상태를 확인해주세요."
      );
    } catch {
      setNotificationStatusMessage(
        "브라우저 알림 설정 중 문제가 발생했습니다. 브라우저 권한 상태를 확인해주세요."
      );
    }
  }

  async function handleCopyDailyReport() {
    if (typeof window === "undefined") return;

    try {
      if (safeEntries.length === 0) {
        const emptyText = "보유종목을 추가하면 오늘의 AI 리포트를 생성할 수 있습니다.";
        if (navigator?.clipboard?.writeText) {
          await navigator.clipboard.writeText(emptyText);
          setDailyReportCopyNotice("리포트가 클립보드에 복사되었습니다.");
          return;
        }
        throw new Error("clipboard unavailable");
      }

      const reportText = buildDailyPortfolioReportText({
        dateText: dailyReportDateText,
        portfolioStatusLabel,
        totalCount: safeEntries.length,
        totalValue: summary.totalValue,
        totalPnL: summary.totalPnL,
        avgReturn: summary.avgReturn,
        todayPriorityItems,
        keepObservationItems,
        riskManagementItems,
        tomorrowCheckItems
      });

      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(reportText);
        setDailyReportCopyNotice("리포트가 클립보드에 복사되었습니다.");
        return;
      }

      throw new Error("clipboard unavailable");
    } catch {
      setDailyReportCopyNotice("리포트 복사에 실패했습니다. 다시 시도해주세요.");
    }
  }

  async function handleSaveDailyReportImage() {
    if (typeof window === "undefined") return;
    try {
      const reportText =
        safeEntries.length === 0
          ? "보유종목을 추가하면 오늘의 AI 리포트를 생성할 수 있습니다."
          : buildDailyPortfolioReportText({
              dateText: dailyReportDateText,
              portfolioStatusLabel,
              totalCount: safeEntries.length,
              totalValue: summary.totalValue,
              totalPnL: summary.totalPnL,
              avgReturn: summary.avgReturn,
              todayPriorityItems,
              keepObservationItems,
              riskManagementItems,
              tomorrowCheckItems
            });

      const rawLines = reportText.split("\n");
      const canvas = document.createElement("canvas");
      const width = 1080;
      const padding = 56;
      const contentWidth = width - padding * 2;
      const lineHeight = 36;
      const sectionHeadingSet = new Set([
        "오늘 먼저 확인할 종목 TOP 3",
        "유지 관찰 종목",
        "리스크 관리 필요 종목",
        "내일 확인 조건",
        "면책 문구"
      ]);

      canvas.width = width;
      canvas.height = 2000;
      const context = canvas.getContext("2d");
      if (!context) {
        setDailyReportImageNotice("이미지 저장에 실패했습니다. 다시 시도해주세요.");
        return;
      }

      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, canvas.height);
      context.textBaseline = "top";

      const preparedLines: Array<{ text: string; type: "normal" | "heading" | "spacer" }> = [];
      for (const line of rawLines) {
        const trimmed = line.trim();
        if (!trimmed) {
          preparedLines.push({ text: "", type: "spacer" });
          continue;
        }

        const type: "normal" | "heading" =
          sectionHeadingSet.has(trimmed) || trimmed.startsWith("날짜:") || trimmed.startsWith("전체 포트폴리오 상태:")
            ? "heading"
            : "normal";

        context.font =
          type === "heading"
            ? "700 25px 'Noto Sans KR', 'Segoe UI', sans-serif"
            : "500 23px 'Noto Sans KR', 'Segoe UI', sans-serif";
        const wrapped = wrapCanvasTextLines(context, trimmed, contentWidth);
        for (const wrappedLine of wrapped) {
          preparedLines.push({ text: wrappedLine, type });
        }
      }

      const contentHeight =
        64 +
        52 +
        44 +
        preparedLines.reduce((sum, line) => sum + (line.type === "spacer" ? 20 : lineHeight), 0) +
        80;
      const height = Math.max(620, contentHeight);
      canvas.height = height;

      context.fillStyle = "#f8fafc";
      context.fillRect(0, 0, width, height);

      const cardX = 26;
      const cardY = 20;
      const cardWidth = width - 52;
      const cardHeight = height - 40;
      const radius = 22;
      context.beginPath();
      context.moveTo(cardX + radius, cardY);
      context.lineTo(cardX + cardWidth - radius, cardY);
      context.quadraticCurveTo(cardX + cardWidth, cardY, cardX + cardWidth, cardY + radius);
      context.lineTo(cardX + cardWidth, cardY + cardHeight - radius);
      context.quadraticCurveTo(
        cardX + cardWidth,
        cardY + cardHeight,
        cardX + cardWidth - radius,
        cardY + cardHeight
      );
      context.lineTo(cardX + radius, cardY + cardHeight);
      context.quadraticCurveTo(cardX, cardY + cardHeight, cardX, cardY + cardHeight - radius);
      context.lineTo(cardX, cardY + radius);
      context.quadraticCurveTo(cardX, cardY, cardX + radius, cardY);
      context.closePath();
      context.fillStyle = "#ffffff";
      context.fill();

      let currentY = cardY + 34;
      const textStartX = cardX + 32;
      context.fillStyle = "#1d4ed8";
      context.font = "700 36px 'Noto Sans KR', 'Segoe UI', sans-serif";
      context.fillText("KRX Insight", textStartX, currentY);
      currentY += 54;

      context.fillStyle = "#0f172a";
      context.font = "700 32px 'Noto Sans KR', 'Segoe UI', sans-serif";
      context.fillText("오늘의 내 보유종목 AI 리포트", textStartX, currentY);
      currentY += 46;

      context.fillStyle = "#334155";
      context.font = "600 24px 'Noto Sans KR', 'Segoe UI', sans-serif";
      context.fillText(`날짜: ${dailyReportDateText}`, textStartX, currentY);
      currentY += 44;

      for (const line of preparedLines) {
        if (line.type === "spacer") {
          currentY += 20;
          continue;
        }

        if (line.type === "heading") {
          context.fillStyle = "#0f172a";
          context.font = "700 25px 'Noto Sans KR', 'Segoe UI', sans-serif";
        } else {
          context.fillStyle = "#1e293b";
          context.font = "500 23px 'Noto Sans KR', 'Segoe UI', sans-serif";
        }
        context.fillText(line.text, textStartX, currentY);
        currentY += lineHeight;
      }

      const dataUrl = canvas.toDataURL("image/png");
      const link = document.createElement("a");
      link.href = dataUrl;
      link.download = `krx-insight-portfolio-report-${dailyReportDateText}.png`;
      link.click();
      setDailyReportImageNotice("리포트 이미지가 저장되었습니다.");
    } catch {
      setDailyReportImageNotice("이미지 저장에 실패했습니다. 다시 시도해주세요.");
    }
  }

  async function handleSaveDailyReportToCloud() {
    if (!user?.id) {
      setDailyReportCloudNotice("로그인 후 리포트를 클라우드에 저장할 수 있습니다.");
      return;
    }
    if (!isSupabaseReady || !supabase) {
      setDailyReportCloudNotice("리포트 클라우드 저장을 사용할 수 없습니다.");
      return;
    }
    if (isFreePlan && reportDailyLimit !== null && todaySavedReportCount >= reportDailyLimit) {
      setDailyReportCloudNotice("Free 플랜에서는 AI 리포트를 하루 1회 저장할 수 있습니다.");
      return;
    }

    setIsSavingDailyReport(true);
    try {
      const reportId = `report-${dailyReportDateText.replace(/-/g, "")}-${Date.now()}`;
      const payload = {
        ...dailyReportPayload,
        createdAt: new Date().toISOString()
      };
      const { error } = await supabase.from("portfolio_reports").insert({
        user_id: user.id,
        id: reportId,
        report_date: dailyReportDateText,
        summary: dailyReportSummaryText,
        payload
      });

      if (error) {
        throw error;
      }

      setDailyReportCloudNotice("오늘의 AI 리포트를 저장했습니다.");
      setTodaySavedReportCount((current) => current + 1);
      await fetchRecentSavedReports();
    } catch (error) {
      const message = extractSupabaseErrorMessage(error);
      setDailyReportCloudNotice(`AI 리포트 저장에 실패했습니다: ${message}`);
    } finally {
      setIsSavingDailyReport(false);
    }
  }
  const mobileTabClass = (tab: PortfolioMobileTab) =>
    mobileTab === tab ? "block" : "hidden";

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <section className={`mb-4 ${mobileTabClass("summary")} md:block`}>
        <TodayMarketBrief
          signals={safeSignals}
          variant="portfolio"
          sectionId="portfolio-morning-brief"
        />
      </section>
      <section className={`mb-4 ${mobileTabClass("summary")} md:block`}>
        <TodayInvestmentChecklist variant="portfolio" sectionId="portfolio-checklist" />
      </section>
      <MobileTabNav
        items={[
          { key: "summary", label: "요약" },
          { key: "holdings", label: "보유" },
          { key: "alerts", label: "알림" },
          { key: "reports", label: "리포트" }
        ]}
        activeKey={mobileTab}
        onChange={(value) => setMobileTab(value as PortfolioMobileTab)}
        topClassName="top-[72px]"
      />
      <section
        id="portfolio-summary"
        className={`scroll-mt-32 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5 ${mobileTabClass(
          "summary"
        )} md:block`}
      >
        <p className="text-xs font-bold uppercase tracking-normal text-brand">Portfolio</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          내 보유종목 AI 진단
        </h1>
        <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
          KIS 현재가와 data.go.kr 일별 종가 데이터를 기반으로 보유 상태를 관찰하고, 확인 필요 구간을 정리하는 참고 정보입니다.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
            현재 플랜: {currentPlanLabel}
          </span>
          {isFreePlan ? (
            <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              관심종목 {watchlistCount}/{watchlistLimit ?? FREE_LIMITS.watchlist} · 보유종목 {safeEntries.length}/
              {holdingLimit ?? FREE_LIMITS.holdings} · 리포트 저장 {todaySavedReportCount}/
              {reportDailyLimit ?? FREE_LIMITS.dailyReportSave}
            </span>
          ) : (
            <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
              관심종목 · 보유종목 · 리포트 저장 한도 없음
            </span>
          )}
          {(isFreePlan && (showNearLimitNotice || reportLimitReached)) || hasPlanOverLimitData ? (
              <a
                href="/pricing#pro"
                className="inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
              >
                요금제 보기
            </a>
          ) : null}
        </div>
        {showNearLimitNotice ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-amber-700 dark:text-amber-200">
            곧 Free 한도에 도달합니다.
          </p>
        ) : null}
        {hasPlanOverLimitData ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-red-700 dark:text-red-200">
            현재 Free 한도를 초과한 데이터가 있습니다. 기존 데이터는 유지됩니다.
          </p>
        ) : null}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <button
            type="button"
            onClick={handleToggleBrowserNotification}
            className="inline-flex h-9 items-center justify-center gap-1 rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 sm:h-8 sm:justify-start"
          >
            <Bell className="h-3.5 w-3.5" />
            {isBrowserNotificationEnabled ? "브라우저 알림 끄기" : "브라우저 알림 켜기"}
          </button>
          <span
            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
              notificationPermission === "denied"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                : notificationPermission === "granted" && isBrowserNotificationEnabled
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
            }`}
          >
            {notificationStatusLabel(notificationPermission, isBrowserNotificationEnabled)}
          </span>
          <span
            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
              cloudSyncStatusLabel === "동기화 실패"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                : cloudSyncStatusLabel === "클라우드 동기화됨"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
            }`}
          >
            {cloudSyncStatusLabel}
          </span>
          <span
            className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
              alertRuleSyncStatusLabel === "알림 조건 동기화 실패"
                ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                : alertRuleSyncStatusLabel === "알림 조건 클라우드 동기화됨"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-slate-200 bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
            }`}
          >
            {alertRuleSyncStatusLabel}
          </span>
        </div>
        {browserNotificationNotice && (
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {browserNotificationNotice}
          </p>
        )}
        {alertRuleSyncNotice && (
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {alertRuleSyncNotice}
          </p>
        )}
        {planLimitNotice ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-red-700 dark:text-red-200">
            {planLimitNotice}
          </p>
        ) : null}
        {!isSupabaseReady && (
          <p className="mt-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
            {cloudSyncActionNotice || "클라우드 동기화 미설정"}
          </p>
        )}
        {isCloudSyncEnabled && (
          <div className="mt-3 rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs font-bold text-ink dark:text-white">클라우드 동기화</p>
              {canSyncLocalToCloud ? (
                <button
                  type="button"
                  onClick={() => void handleSyncLocalToCloud()}
                  disabled={isCloudSyncing}
                  className="inline-flex min-h-9 w-full items-center justify-center rounded-md bg-brand px-3 text-xs font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:h-8 sm:w-auto"
                >
                  {isCloudSyncing ? "동기화 중..." : "로컬 보유종목을 클라우드에 동기화"}
                </button>
              ) : (
                <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  동기화 상태 양호
                </span>
              )}
            </div>
            {cloudSyncActionNotice && (
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {cloudSyncActionNotice}
              </p>
            )}
            {canSyncLocalAlertRulesToCloud && (
              <div className="mt-2">
                <button
                  type="button"
                  onClick={() => void handleSyncLocalAlertRulesToCloud()}
                  disabled={isAlertRuleSyncing}
                  className="inline-flex min-h-9 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-bold text-slate-700 hover:text-brand disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-200 dark:disabled:bg-slate-900/50 dark:disabled:text-slate-500 sm:h-8 sm:w-auto"
                >
                  {isAlertRuleSyncing
                    ? "알림 조건 동기화 중..."
                    : "로컬 알림 조건을 클라우드에 동기화"}
                </button>
              </div>
            )}
          </div>
        )}
        <p className="mt-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          클라우드 동기화와 리포트 저장은 향후 Pro 기능으로 확장될 수 있습니다.
        </p>
      </section>

      <section
        id="portfolio-risk"
        className={`mt-4 scroll-mt-32 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5 ${mobileTabClass(
          "alerts"
        )} md:block`}
      >
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-brand">Risk Alert</p>
            <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
              보유종목 리스크 알림
            </h2>
          </div>
          <span className="inline-flex w-fit items-center gap-1 rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
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

        <div id="portfolio-alerts" className="mt-4 scroll-mt-32 border-t border-line pt-3 dark:border-dark-line">
          <h3 className="text-sm font-bold text-ink dark:text-white">사용자 알림 발동</h3>
          {triggeredUserAlertSummaries.length === 0 ? (
            <div className="mt-2 grid gap-2">
              <p className="rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
                현재 설정된 알림 조건 중 발동된 항목이 없습니다.
              </p>
              {notificationPermission === "granted" && isBrowserNotificationEnabled && (
                <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                  현재 발동된 알림은 없지만 브라우저 알림은 켜져 있습니다.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-2 grid gap-2">
              {(Array.isArray(triggeredUserAlertSummaries) ? triggeredUserAlertSummaries : [])
                .slice(0, 3)
                .map((summary) => (
                  <article
                    key={summary.key}
                    className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
                  >
                    <p className="text-sm font-bold text-ink dark:text-white">
                      {summary.stockName} · {summary.symbol}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      사용자 알림 {formatNumber(summary.triggerCount)}개 발동
                    </p>
                    <ul className="mt-2 grid gap-1">
                      {(Array.isArray(summary.triggerMessages) ? summary.triggerMessages : []).map(
                        (message, index) => (
                          <li
                            key={`${summary.key}-${index}`}
                            className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300"
                          >
                            - {message}
                          </li>
                        )
                      )}
                    </ul>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      핵심 요약: {summary.coreSummary}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      확인 조건: {summary.nextCheck}
                    </p>
                  </article>
                ))}
            </div>
          )}
        </div>
      </section>

      <section
        id="reports"
        className={`mt-4 scroll-mt-32 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5 ${mobileTabClass(
          "reports"
        )} md:block`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-normal text-brand">Daily Report</p>
            <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
              오늘의 내 보유종목 AI 리포트
            </h2>
          </div>
          <div className="grid w-full grid-cols-1 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
            <button
              type="button"
              onClick={() => void handleCopyDailyReport()}
              className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 sm:h-8"
            >
              리포트 복사
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDailyReportToCloud()}
              disabled={isSavingDailyReport || reportLimitReached}
              className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:text-brand disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 sm:h-8"
            >
              {isSavingDailyReport ? "저장 중..." : "리포트 저장"}
            </button>
            <button
              type="button"
              onClick={() => void handleSaveDailyReportImage()}
              className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 sm:h-8"
            >
              리포트 이미지 저장
            </button>
            <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              전체 포트폴리오 상태: {portfolioStatusLabel}
            </span>
            {isFreePlan ? (
              <span
                className={`rounded-md border px-2 py-1 text-xs font-bold ${
                  reportLimitReached
                    ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200"
                    : "border-slate-200 bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
                }`}
              >
                리포트 저장 {todaySavedReportCount}/{reportDailyLimit ?? FREE_LIMITS.dailyReportSave}
              </span>
            ) : null}
            {isFreePlan ? (
              <a
                href="/pricing#pro"
                className="inline-flex h-9 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200 sm:h-8"
              >
                Pro 기능 보기
              </a>
            ) : null}
          </div>
        </div>
        {dailyReportCopyNotice && (
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {dailyReportCopyNotice}
          </p>
        )}
        {dailyReportImageNotice && (
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {dailyReportImageNotice}
          </p>
        )}
        {dailyReportCloudNotice && (
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            {dailyReportCloudNotice}
          </p>
        )}

        {safeEntries.length === 0 ? (
          <div className="mt-3 rounded-md border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
            <p className="text-sm font-bold text-ink dark:text-white">
              보유종목을 추가하면 오늘의 AI 리포트를 생성할 수 있습니다.
            </p>
            <a
              href="#portfolio-add-entry"
              className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-xs font-bold text-white hover:bg-blue-700"
            >
              보유종목 추가하기
            </a>
          </div>
        ) : (
          <div className="mt-3 grid gap-4">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-5">
              <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">총 보유 종목 수</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{safeEntries.length}</p>
              </article>
              <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">평균 수익률</p>
                <p className={`mt-1 text-sm font-bold ${changeColorClass(summary.avgReturn)}`}>
                  {formatPercent(summary.avgReturn)}
                </p>
              </article>
              <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">리스크 상승 종목 수</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{riskUpCount}</p>
              </article>
              <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">유지 관찰 종목 수</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{keepObservationCount}</p>
              </article>
              <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">전체 포트폴리오 상태</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{portfolioStatusLabel}</p>
              </article>
            </div>

            <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
              <h3 className="text-sm font-bold text-ink dark:text-white">AI 요약</h3>
              <div className="mt-2 grid gap-1">
                {(Array.isArray(portfolioSummaryLines) ? portfolioSummaryLines : []).map((line, index) => (
                  <p
                    key={`daily-summary-${index}`}
                    className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300"
                  >
                    {line}
                  </p>
                ))}
              </div>
            </article>

            <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
              <h3 className="text-sm font-bold text-ink dark:text-white">오늘 먼저 확인할 종목 TOP 3</h3>
              <div className="mt-2 grid gap-2">
                {(Array.isArray(todayPriorityItems) ? todayPriorityItems : []).map((item) => (
                  <article
                    key={`daily-priority-${item.id}`}
                    className="rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-ink dark:text-white">
                          {item.stockName}
                        </p>
                        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          {item.symbol}
                        </p>
                      </div>
                      <span
                        className={`inline-flex rounded-md border px-2 py-1 text-xs font-bold ${judgementClass(
                          item.judgement
                        )}`}
                      >
                        {formatJudgementLabel(item.judgement)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      수익률: <span className={changeColorClass(item.returnRate)}>{formatPercent(item.returnRate)}</span>
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      핵심 판단 이유: {item.coreReason}
                    </p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      다음 확인 조건: {item.nextCheck}
                    </p>
                  </article>
                ))}
              </div>
            </article>

            <div className="grid gap-3 lg:grid-cols-2">
              <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <h3 className="text-sm font-bold text-ink dark:text-white">유지 관찰 종목</h3>
                {(Array.isArray(keepObservationItems) ? keepObservationItems : []).length === 0 ? (
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                    현재 유지 관찰 종목은 없습니다.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2">
                    {(Array.isArray(keepObservationItems) ? keepObservationItems : []).map((item) => (
                      <article
                        key={`keep-observation-${item.id}`}
                        className="rounded-md border border-line bg-white p-2 dark:border-dark-line dark:bg-dark-panel"
                      >
                        <p className="text-xs font-bold text-ink dark:text-white">
                          {item.stockName} · {item.symbol}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          수익률: <span className={changeColorClass(item.returnRate)}>{formatPercent(item.returnRate)}</span>
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </article>

              <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
                <h3 className="text-sm font-bold text-ink dark:text-white">리스크 관리 필요 종목</h3>
                {(Array.isArray(riskManagementItems) ? riskManagementItems : []).length === 0 ? (
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                    현재 리스크 관리가 필요한 종목은 없습니다.
                  </p>
                ) : (
                  <div className="mt-2 grid gap-2">
                    {(Array.isArray(riskManagementItems) ? riskManagementItems : []).map((item) => (
                      <article
                        key={`risk-needed-${item.id}`}
                        className="rounded-md border border-line bg-white p-2 dark:border-dark-line dark:bg-dark-panel"
                      >
                        <p className="text-xs font-bold text-ink dark:text-white">
                          {item.stockName} · {item.symbol}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          핵심 판단 이유: {item.coreReason}
                        </p>
                      </article>
                    ))}
                  </div>
                )}
              </article>
            </div>

            <article className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
              <h3 className="text-sm font-bold text-ink dark:text-white">내일 확인 조건</h3>
              <ul className="mt-2 grid gap-1">
                {(Array.isArray(tomorrowCheckItems) ? tomorrowCheckItems : []).map((item, index) => (
                  <li
                    key={`tomorrow-check-${index}`}
                    className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300"
                  >
                    - {item}
                  </li>
                ))}
              </ul>
            </article>
          </div>
        )}

        <article className="mt-4 rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
          <h3 className="text-sm font-bold text-ink dark:text-white">최근 저장한 리포트</h3>
          {!user?.id ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              로그인하면 저장한 AI 리포트를 확인할 수 있습니다.
            </p>
          ) : !isSupabaseReady || !supabase ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              리포트 클라우드 저장을 사용할 수 없습니다.
            </p>
          ) : isRecentReportsLoading ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              최근 저장한 리포트를 불러오고 있습니다.
            </p>
          ) : recentReportsNotice ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              {recentReportsNotice}
            </p>
          ) : (Array.isArray(recentSavedReports) ? recentSavedReports : []).length === 0 ? (
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              아직 저장된 리포트가 없습니다.
            </p>
          ) : (
            <div className="mt-2 grid gap-2">
              {(Array.isArray(recentSavedReports) ? recentSavedReports : []).slice(0, 5).map((report) => {
                const savedAtText = report.createdAt
                  ? new Date(report.createdAt).toLocaleString("ko-KR")
                  : "-";
                const safePayload = report.payload;
                const topWatch = Array.isArray(safePayload?.topWatchItems)
                  ? safePayload?.topWatchItems
                  : [];
                const topWatchText =
                  topWatch.length > 0
                    ? topWatch
                        .slice(0, 3)
                        .map((item) => `${safeText(item.stockName)}(${safeText(item.symbol)})`)
                        .join(", ")
                    : "데이터 없음";
                const isExpanded = expandedSavedReportId === report.id;
                return (
                  <article
                    key={report.id}
                    className="rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-ink dark:text-white">
                          {report.reportDate}
                        </p>
                        <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                          {safeText(report.summary, "요약 데이터 없음")}
                        </p>
                        <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                          저장 시간: {savedAtText}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedSavedReportId((current) =>
                            current === report.id ? null : report.id
                          )
                        }
                        className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-slate-50 px-2 text-[11px] font-bold text-slate-700 hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                      >
                        간단 보기
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="mt-2 rounded-md border border-line bg-slate-50 p-2 dark:border-dark-line dark:bg-slate-900/50">
                        {safePayload ? (
                          <div className="grid gap-1">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              총 보유 종목 수: {formatNumber(safeNumber(safePayload.totalHoldings))}
                            </p>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              평균 수익률: {formatPercent(safeNumber(safePayload.averageReturnRate))}
                            </p>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              리스크 종목 수: {formatNumber(safeNumber(safePayload.riskCount))}
                            </p>
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                              오늘 먼저 확인할 종목: {topWatchText}
                            </p>
                          </div>
                        ) : (
                          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                            리포트 payload를 확인할 수 없습니다.
                          </p>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          )}
        </article>
      </section>

      <section className={`mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-5 ${mobileTabClass("summary")} md:grid`}>
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

      <section
        id="portfolio-holdings"
        className={`mt-4 grid min-w-0 scroll-mt-32 gap-4 ${mobileTabClass("holdings")} md:grid xl:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.1fr)]`}
      >
        <form
          id="portfolio-add-entry"
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
              disabled={isFreePlan && holdingLimit !== null && safeEntries.length >= holdingLimit}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Plus className="h-4 w-4" />
              보유종목 추가
            </button>
            {isFreePlan && holdingLimit !== null && safeEntries.length >= holdingLimit ? (
              <p className="text-xs font-semibold text-red-700 dark:text-red-200">
                Free 플랜에서는 보유종목을 최대 3개까지 관리할 수 있습니다.{" "}
                <a href="/pricing#pro" className="underline underline-offset-2">
                  요금제 보기
                </a>
              </p>
            ) : null}
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
                const conditionDraft = getAlertDraft(entry.id);
                const conditionList = Array.isArray(alertConditionsByEntry[entry.id])
                  ? alertConditionsByEntry[entry.id]
                  : [];
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
                        {formatJudgementLabel(judgement)}
                      </span>
                    </div>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                      핵심 판단 이유: {coreReason}
                    </p>

                    {isExpanded && (
                      <div className="mt-4 border-t border-line pt-3 dark:border-dark-line">
                        <section className="mb-4 rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                          <h3 className="text-sm font-bold text-ink dark:text-white">알림 조건 설정</h3>
                          <div className="mt-2 grid gap-2 sm:grid-cols-[minmax(0,1fr)_120px_auto]">
                            <select
                              value={conditionDraft.type}
                              onChange={(event) =>
                                updateAlertDraft(entry.id, {
                                  type: event.target.value as AlertConditionType
                                })
                              }
                              className="h-9 rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
                            >
                              <option value="price_lte">현재가가 특정 가격 이하이면 알림</option>
                              <option value="price_gte">현재가가 특정 가격 이상이면 알림</option>
                              <option value="return_lte">수익률이 특정 값 이하이면 알림</option>
                              <option value="return_gte">수익률이 특정 값 이상이면 알림</option>
                              <option value="ma20_below">MA20 아래로 내려가면 알림</option>
                              <option value="rsi_gte_70">RSI 70 이상이면 알림</option>
                              <option value="rsi_lte_30">RSI 30 이하이면 알림</option>
                            </select>
                            <input
                              value={conditionDraft.threshold}
                              onChange={(event) =>
                                updateAlertDraft(entry.id, { threshold: event.target.value })
                              }
                              disabled={!isThresholdRequired(conditionDraft.type)}
                              inputMode="decimal"
                              placeholder={
                                conditionDraft.type === "return_lte" ||
                                conditionDraft.type === "return_gte"
                                  ? "예: -5"
                                  : "예: 270000"
                              }
                              className="h-9 rounded-md border border-line bg-white px-2 text-xs font-semibold text-ink outline-none ring-brand/20 focus:ring disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-dark-line dark:bg-slate-950 dark:text-white dark:disabled:bg-slate-900"
                            />
                            <button
                              type="button"
                              onClick={() => addAlertCondition(entry.id)}
                              className="inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-xs font-bold text-white hover:bg-blue-700"
                            >
                              조건 추가
                            </button>
                          </div>
                          <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                            {isThresholdRequired(conditionDraft.type)
                              ? conditionDraft.type === "return_lte" ||
                                conditionDraft.type === "return_gte"
                                ? "수익률 기준은 % 숫자로 입력하세요. 예: -5, 3"
                                : "가격 기준은 원 단위 숫자로 입력하세요."
                              : "해당 조건은 임계값 입력 없이 신호 기반으로 감지됩니다."}
                          </p>

                          {conditionList.length === 0 ? (
                            <p className="mt-2 rounded-md border border-line bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
                              설정된 알림 조건이 없습니다.
                            </p>
                          ) : (
                            <ul className="mt-2 grid gap-2">
                              {(Array.isArray(conditionList) ? conditionList : []).map((condition) => (
                                <li
                                  key={condition.id}
                                  className="rounded-md border border-line bg-slate-50 px-2 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="min-w-0 break-words">
                                      {getConditionTypeLabel(condition.type)}
                                      {typeof condition.threshold === "number" &&
                                      Number.isFinite(condition.threshold)
                                        ? condition.type === "return_lte" ||
                                          condition.type === "return_gte"
                                          ? ` · ${formatPercent(condition.threshold)}`
                                          : ` · ${formatKRW(condition.threshold)}`
                                        : ""}
                                    </p>
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        onClick={() => toggleAlertCondition(entry.id, condition.id)}
                                        className={`rounded-md border px-2 py-1 text-[11px] font-bold ${
                                          condition.enabled
                                            ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200"
                                            : "border-slate-200 bg-slate-100 text-slate-500 dark:border-dark-line dark:bg-slate-800 dark:text-slate-300"
                                        }`}
                                      >
                                        {condition.enabled ? "ON" : "OFF"}
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => removeAlertCondition(entry.id, condition.id)}
                                        className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold text-slate-500 hover:text-danger dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
                                      >
                                        삭제
                                      </button>
                                    </div>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}
                        </section>

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
