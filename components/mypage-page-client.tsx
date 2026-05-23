"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, BarChart3, BriefcaseBusiness, LogOut, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { usePortfolio } from "@/components/portfolio-provider";
import { changeColorClass, formatPercent } from "@/lib/format";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type PlanLabel = "Free" | "Pro" | "Business";

type CloudStats = {
  holdingsCount: number;
  alertRulesCount: number;
  reportsCount: number;
  riskSnapshotsCount: number;
};

type SavedReportPayloadItem = {
  stockName: string;
  symbol: string;
};

type SavedReportPayload = {
  totalHoldings: number;
  averageReturnRate: number;
  riskCount: number;
  topWatchItems: SavedReportPayloadItem[];
};

type SavedReport = {
  id: string;
  reportDate: string;
  summary: string;
  createdAt: string;
  payload: SavedReportPayload | null;
};

type RiskChangeDirection = "상승" | "하락" | "유지" | "비교 불가";

type RiskSnapshotRow = {
  symbol: string;
  stockName: string;
  riskStatus: string;
  aiScore: number | null;
  returnRate: number | null;
  snapshotDate: string;
  createdAt: string;
  payload: Record<string, unknown>;
};

type RecentRiskChangeItem = {
  key: string;
  date: string;
  symbol: string;
  stockName: string;
  previousStatus: string;
  currentStatus: string;
  direction: RiskChangeDirection;
  reason: string;
  aiScoreChange: number | null;
  returnRateChange: number | null;
};

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function toPlanLabel(value: unknown): PlanLabel {
  if (typeof value !== "string") return "Free";
  const normalized = value.trim().toLowerCase();
  if (normalized === "pro") return "Pro";
  if (normalized === "business") return "Business";
  return "Free";
}

function toCloudStatusLabel(status: "local" | "synced" | "failed", isSyncing: boolean) {
  if (isSyncing) return "클라우드 동기화 중";
  if (status === "synced") return "클라우드 동기화됨";
  if (status === "failed") return "동기화 실패";
  return "로컬 모드";
}

function normalizeSavedReportPayloadItem(value: unknown): SavedReportPayloadItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const stockName = safeText(raw.stockName);
  const symbol = safeText(raw.symbol);
  if (!stockName && !symbol) return null;
  return {
    stockName: stockName || symbol,
    symbol: symbol || stockName
  };
}

function normalizeSavedReportPayload(value: unknown): SavedReportPayload | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const topWatchSource = Array.isArray(raw.topWatchItems) ? raw.topWatchItems : [];
  const topWatchItems = topWatchSource
    .map(normalizeSavedReportPayloadItem)
    .filter((item): item is SavedReportPayloadItem => Boolean(item));

  return {
    totalHoldings: safeNumber(raw.totalHoldings, 0),
    averageReturnRate: safeNumber(raw.averageReturnRate, 0),
    riskCount: safeNumber(raw.riskCount, 0),
    topWatchItems
  };
}

function normalizeSavedReport(value: unknown): SavedReport | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  const reportDate = safeText(raw.report_date);
  if (!id || !reportDate) return null;
  return {
    id,
    reportDate,
    summary: safeText(raw.summary, "요약 데이터 없음"),
    createdAt: safeText(raw.created_at),
    payload: normalizeSavedReportPayload(raw.payload)
  };
}

function formatDateTime(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("ko-KR");
}

function extractSupabaseMessage(error: unknown) {
  if (typeof error === "object" && error !== null && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) {
      return message.trim();
    }
  }
  return "알 수 없는 오류";
}

function getKstDateDaysAgo(daysAgo: number) {
  const safeDays = Number.isFinite(daysAgo) && daysAgo > 0 ? Math.floor(daysAgo) : 0;
  const base = new Date();
  base.setDate(base.getDate() - safeDays);
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(base);
}

function getStatusRank(status: string) {
  if (status === "리스크 관리 필요") return 5;
  if (status === "확인 필요") return 4;
  if (status === "비중 조절 검토") return 3;
  if (status === "유지 관찰") return 2;
  if (status === "추가 관찰 가능") return 1;
  return 0;
}

function getDirectionRank(direction: RiskChangeDirection) {
  if (direction === "상승") return 4;
  if (direction === "하락") return 3;
  if (direction === "유지") return 2;
  return 1;
}

function getRiskDirectionClass(direction: RiskChangeDirection) {
  if (direction === "상승") {
    return "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-200";
  }
  if (direction === "하락") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200";
  }
  if (direction === "유지") {
    return "border-slate-300 bg-slate-100 text-slate-700 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-200";
  }
  return "border-slate-200 bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300";
}

function normalizeRiskSnapshotRow(value: unknown): RiskSnapshotRow | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const symbol = safeText(raw.symbol);
  const snapshotDate = safeText(raw.snapshot_date);
  if (!symbol || !snapshotDate) return null;
  const payload =
    typeof raw.payload === "object" && raw.payload !== null && !Array.isArray(raw.payload)
      ? (raw.payload as Record<string, unknown>)
      : {};
  return {
    symbol,
    stockName: safeText(raw.stock_name, symbol),
    riskStatus: safeText(raw.risk_status, "비교 불가"),
    aiScore: typeof raw.ai_score === "number" && Number.isFinite(raw.ai_score) ? raw.ai_score : null,
    returnRate:
      typeof raw.return_rate === "number" && Number.isFinite(raw.return_rate) ? raw.return_rate : null,
    snapshotDate,
    createdAt: safeText(raw.created_at),
    payload
  };
}

function buildRecentRiskChanges(rows: RiskSnapshotRow[]) {
  const safeRows = Array.isArray(rows) ? rows : [];
  const grouped = new Map<string, RiskSnapshotRow[]>();
  for (const row of safeRows) {
    const list = grouped.get(row.symbol);
    if (Array.isArray(list)) {
      list.push(row);
    } else {
      grouped.set(row.symbol, [row]);
    }
  }

  const entries: RecentRiskChangeItem[] = [];
  grouped.forEach((snapshots, symbol) => {
    const safeList = Array.isArray(snapshots) ? [...snapshots] : [];
    if (safeList.length < 2) return;
    safeList.sort((left, right) =>
      `${left.snapshotDate}-${left.createdAt}`.localeCompare(`${right.snapshotDate}-${right.createdAt}`)
    );
    for (let index = 1; index < safeList.length; index += 1) {
      const previous = safeList[index - 1];
      const current = safeList[index];
      const prevRank = getStatusRank(previous.riskStatus);
      const nowRank = getStatusRank(current.riskStatus);
      const direction: RiskChangeDirection =
        nowRank > prevRank ? "상승" : nowRank < prevRank ? "하락" : "유지";
      const payloadReason =
        typeof current.payload.reason === "string" ? safeText(current.payload.reason) : "";
      const reason =
        payloadReason ||
        (direction === "상승"
          ? "리스크 지표가 상승해 우선 확인이 필요합니다."
          : direction === "하락"
            ? "리스크 지표가 완화되어 유지 관찰 구간입니다."
            : "리스크 상태가 유지되고 있습니다.");
      entries.push({
        key: `${current.symbol}-${current.snapshotDate}-${index}`,
        date: current.snapshotDate,
        symbol,
        stockName: current.stockName || symbol,
        previousStatus: previous.riskStatus,
        currentStatus: current.riskStatus,
        direction,
        reason,
        aiScoreChange:
          previous.aiScore !== null && current.aiScore !== null
            ? current.aiScore - previous.aiScore
            : null,
        returnRateChange:
          previous.returnRate !== null && current.returnRate !== null
            ? current.returnRate - previous.returnRate
            : null
      });
    }
  });

  return entries.sort((left, right) => {
    const dateGap = right.date.localeCompare(left.date);
    if (dateGap !== 0) return dateGap;
    return getDirectionRank(right.direction) - getDirectionRank(left.direction);
  });
}

export function MyPagePageClient() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const { cloudSyncStatus, isCloudSyncing, cloudSyncNotice } = usePortfolio();

  const [plan, setPlan] = useState<PlanLabel>("Free");
  const [stats, setStats] = useState<CloudStats>({
    holdingsCount: 0,
    alertRulesCount: 0,
    reportsCount: 0,
    riskSnapshotsCount: 0
  });
  const [riskTrackStartDate, setRiskTrackStartDate] = useState("");
  const [recentReports, setRecentReports] = useState<SavedReport[]>([]);
  const [recentRiskChanges, setRecentRiskChanges] = useState<RecentRiskChangeItem[]>([]);
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false);
  const [fetchError, setFetchError] = useState("");

  const cloudStatusLabel = useMemo(
    () => toCloudStatusLabel(cloudSyncStatus, isCloudSyncing),
    [cloudSyncStatus, isCloudSyncing]
  );

  useEffect(() => {
    const supabaseClient = supabase;
    if (!user?.id) {
      setPlan("Free");
      setStats({ holdingsCount: 0, alertRulesCount: 0, reportsCount: 0, riskSnapshotsCount: 0 });
      setRecentReports([]);
      setRecentRiskChanges([]);
      setExpandedReportId(null);
      setRiskTrackStartDate("");
      setFetchError("");
      setIsFetching(false);
      return;
    }

    if (!isSupabaseConfigured || !supabaseClient) {
      setFetchError("계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      setStats({ holdingsCount: 0, alertRulesCount: 0, reportsCount: 0, riskSnapshotsCount: 0 });
      setRecentReports([]);
      setRecentRiskChanges([]);
      setPlan("Free");
      setRiskTrackStartDate("");
      setIsFetching(false);
      return;
    }

    const client = supabaseClient;
    const userId = user.id;
    let cancelled = false;

    async function fetchMyPageData() {
      setIsFetching(true);
      setFetchError("");

      const [
        profileResult,
        holdingsCountResult,
        alertRulesCountResult,
        reportsCountResult,
        riskSnapshotsCountResult,
        riskTrackStartResult,
        recentReportsResult,
        riskTimelineResult
      ] = await Promise.allSettled([
        client.from("profiles").select("plan").eq("id", userId).limit(1),
        client.from("portfolio_holdings").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client
          .from("portfolio_alert_rules")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        client.from("portfolio_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client
          .from("portfolio_risk_snapshots")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        client
          .from("portfolio_risk_snapshots")
          .select("snapshot_date")
          .eq("user_id", userId)
          .order("snapshot_date", { ascending: true })
          .limit(1),
        client
          .from("portfolio_reports")
          .select("id,report_date,summary,created_at,payload")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3),
        client
          .from("portfolio_risk_snapshots")
          .select("symbol,stock_name,risk_status,ai_score,return_rate,snapshot_date,created_at,payload")
          .eq("user_id", userId)
          .gte("snapshot_date", getKstDateDaysAgo(6))
          .order("snapshot_date", { ascending: false })
          .limit(300)
      ]);

      if (cancelled) return;

      let hasError = false;

      const nextPlan = (() => {
        if (profileResult.status !== "fulfilled") {
          hasError = true;
          return "Free" as PlanLabel;
        }
        if (profileResult.value.error) {
          hasError = true;
          return "Free" as PlanLabel;
        }
        const rows = Array.isArray(profileResult.value.data) ? profileResult.value.data : [];
        const firstRow = rows.length > 0 ? rows[0] : null;
        const safePlan = firstRow ? toPlanLabel((firstRow as { plan?: unknown }).plan) : "Free";
        return safePlan;
      })();

      const countFromResult = (
        result: PromiseSettledResult<{ count: number | null; error: { message?: string } | null }>
      ) => {
        if (result.status !== "fulfilled") {
          hasError = true;
          return 0;
        }
        if (result.value.error) {
          hasError = true;
          return 0;
        }
        return Number.isFinite(result.value.count ?? NaN) ? Number(result.value.count) : 0;
      };

      const nextStats: CloudStats = {
        holdingsCount: countFromResult(holdingsCountResult),
        alertRulesCount: countFromResult(alertRulesCountResult),
        reportsCount: countFromResult(reportsCountResult),
        riskSnapshotsCount: countFromResult(riskSnapshotsCountResult)
      };

      const nextRiskTrackStartDate = (() => {
        if (riskTrackStartResult.status !== "fulfilled") {
          hasError = true;
          return "";
        }
        if (riskTrackStartResult.value.error) {
          hasError = true;
          return "";
        }
        const rows = Array.isArray(riskTrackStartResult.value.data)
          ? riskTrackStartResult.value.data
          : [];
        const first = rows.length > 0 ? rows[0] : null;
        return first && typeof (first as { snapshot_date?: unknown }).snapshot_date === "string"
          ? ((first as { snapshot_date?: string }).snapshot_date ?? "")
          : "";
      })();

      const nextRecentReports = (() => {
        if (recentReportsResult.status !== "fulfilled") {
          hasError = true;
          return [] as SavedReport[];
        }
        if (recentReportsResult.value.error) {
          hasError = true;
          return [] as SavedReport[];
        }
        const rows = Array.isArray(recentReportsResult.value.data) ? recentReportsResult.value.data : [];
        return rows
          .map(normalizeSavedReport)
          .filter((item): item is SavedReport => Boolean(item));
      })();

      const nextRecentRiskChanges = (() => {
        if (riskTimelineResult.status !== "fulfilled") {
          hasError = true;
          return [] as RecentRiskChangeItem[];
        }
        if (riskTimelineResult.value.error) {
          hasError = true;
          return [] as RecentRiskChangeItem[];
        }
        const rows = Array.isArray(riskTimelineResult.value.data) ? riskTimelineResult.value.data : [];
        const normalized = rows
          .map(normalizeRiskSnapshotRow)
          .filter((item): item is RiskSnapshotRow => Boolean(item));
        return buildRecentRiskChanges(normalized).slice(0, 3);
      })();

      setPlan(nextPlan);
      setStats(nextStats);
      setRiskTrackStartDate(nextRiskTrackStartDate);
      setRecentReports(nextRecentReports);
      setRecentRiskChanges(nextRecentRiskChanges);
      setFetchError(hasError ? "계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요." : "");
      setIsFetching(false);
    }

    void fetchMyPageData();

    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  async function handleSignOut() {
    const result = await signOut();
    if (!result.ok) {
      setFetchError(result.message || "계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    router.push("/");
  }

  function triggerHeaderLogin() {
    if (typeof window === "undefined") return;
    const loginButton = window.document.querySelector<HTMLButtonElement>(
      "button[data-auth-login-trigger='true']"
    );
    if (loginButton) {
      loginButton.click();
      return;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const safeReports = Array.isArray(recentReports) ? recentReports : [];
  const safeRecentRiskChanges = Array.isArray(recentRiskChanges) ? recentRiskChanges : [];
  const safeCloudNotice = safeText(cloudSyncNotice);

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">로그인 상태를 확인 중입니다.</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-xs font-bold tracking-normal text-brand">계정</p>
          <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white">내 계정</h1>
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
            로그인 후 내 계정을 확인할 수 있습니다.
          </p>
          <button
            type="button"
            onClick={triggerHeaderLogin}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            로그인
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <p className="text-xs font-bold tracking-normal text-brand">계정</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white">내 계정</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          계정 정보와 클라우드 동기화 현황을 한 번에 확인할 수 있습니다.
        </p>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel lg:col-span-2">
          <h2 className="text-sm font-bold text-ink dark:text-white">계정 정보</h2>
          <dl className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">이메일</dt>
              <dd className="mt-1 break-all text-sm font-semibold text-slate-700 dark:text-slate-200">
                {safeText(user.email, "-")}
              </dd>
            </div>
            <div className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">현재 플랜</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{plan}</dd>
            </div>
            <div className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">클라우드 동기화 상태</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">{cloudStatusLabel}</dd>
            </div>
            <div className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <dt className="text-[11px] font-bold text-slate-500 dark:text-slate-400">동기화 안내</dt>
              <dd className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                {safeCloudNotice || "클라우드 동기화 사용 가능"}
              </dd>
            </div>
          </dl>
        </article>

        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <h2 className="text-sm font-bold text-ink dark:text-white">클라우드 데이터 통계</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <li className="flex items-center justify-between rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <span>portfolio_holdings</span>
              <strong>{Number.isFinite(stats.holdingsCount) ? stats.holdingsCount : 0}</strong>
            </li>
            <li className="flex items-center justify-between rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <span>portfolio_alert_rules</span>
              <strong>{Number.isFinite(stats.alertRulesCount) ? stats.alertRulesCount : 0}</strong>
            </li>
            <li className="flex items-center justify-between rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <span>portfolio_reports</span>
              <strong>{Number.isFinite(stats.reportsCount) ? stats.reportsCount : 0}</strong>
            </li>
            <li className="flex items-center justify-between rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
              <span>portfolio_risk_snapshots</span>
              <strong>{Number.isFinite(stats.riskSnapshotsCount) ? stats.riskSnapshotsCount : 0}</strong>
            </li>
          </ul>
          <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            최근 리스크 변화 추적 시작일: {riskTrackStartDate || "데이터 없음"}
          </p>
        </article>
      </section>

      {fetchError && (
        <section className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {fetchError}
        </section>
      )}

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-ink dark:text-white">최근 리스크 변화</h2>
          {isFetching && (
            <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              불러오는 중...
            </span>
          )}
        </div>

        {safeRecentRiskChanges.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            아직 비교할 이전 기록이 없습니다. 오늘부터 리스크 변화를 추적합니다.
          </p>
        ) : (
          <ul className="mt-3 grid gap-2">
            {safeRecentRiskChanges.map((item) => (
              <li
                key={item.key}
                className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-slate-700 dark:text-slate-200">
                      {item.stockName} · {item.symbol}
                    </p>
                    <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">{item.date}</p>
                  </div>
                  <span
                    className={`rounded-md border px-2 py-1 text-[11px] font-bold ${getRiskDirectionClass(item.direction)}`}
                  >
                    {item.direction === "상승"
                      ? "리스크 상승"
                      : item.direction === "하락"
                        ? "리스크 하락"
                        : item.direction === "유지"
                          ? "유지"
                          : "비교 불가"}
                  </span>
                </div>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  이전 상태: {item.previousStatus} → 현재 상태: {item.currentStatus}
                </p>
                <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
                  {item.reason}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  AI 점수 변화:{" "}
                  {item.aiScoreChange !== null
                    ? `${item.aiScoreChange > 0 ? "+" : ""}${item.aiScoreChange.toFixed(1)}`
                    : "데이터 없음"}{" "}
                  · 수익률 변화:{" "}
                  {item.returnRateChange !== null ? formatPercent(item.returnRateChange) : "데이터 없음"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <div className="flex flex-wrap items-center gap-2">
          <h2 className="text-sm font-bold text-ink dark:text-white">최근 저장한 AI 리포트</h2>
          {isFetching && (
            <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              불러오는 중...
            </span>
          )}
        </div>

        {safeReports.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            저장된 리포트가 없습니다.
          </p>
        ) : (
          <div className="mt-3 space-y-2">
            {safeReports.slice(0, 3).map((report) => {
              const payload = report.payload;
              const topWatchList = payload && Array.isArray(payload.topWatchItems) ? payload.topWatchItems : [];
              const topWatchText = topWatchList
                .slice(0, 3)
                .map((item) => safeText(item.stockName || item.symbol))
                .filter((item) => Boolean(item))
                .join(", ");

              const expanded = expandedReportId === report.id;

              return (
                <article
                  key={report.id}
                  className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{report.reportDate}</p>
                      <p className="mt-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {safeText(report.summary, "요약 데이터 없음")}
                      </p>
                      <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                        저장 시간: {formatDateTime(report.createdAt)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedReportId((current) => (current === report.id ? null : report.id))}
                      className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
                    >
                      보기
                    </button>
                  </div>
                  {expanded && (
                    <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <div className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-950 dark:text-slate-300">
                        총 보유 종목 수: {payload ? payload.totalHoldings : 0}
                      </div>
                      <div className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-950 dark:text-slate-300">
                        평균 수익률:{" "}
                        <span className={changeColorClass(payload ? payload.averageReturnRate : 0)}>
                          {formatPercent(payload ? payload.averageReturnRate : 0)}
                        </span>
                      </div>
                      <div className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-950 dark:text-slate-300">
                        리스크 종목 수: {payload ? payload.riskCount : 0}
                      </div>
                      <div className="rounded-md border border-line bg-white px-3 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-950 dark:text-slate-300">
                        오늘 먼저 확인할 종목: {topWatchText || "데이터 없음"}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href="/portfolio"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-line bg-slate-50 px-3 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
        >
          <BriefcaseBusiness className="h-4 w-4" />
          내 보유종목으로 이동
        </Link>
        <Link
          href="/debug/market-data"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-line bg-slate-50 px-3 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
        >
          <BarChart3 className="h-4 w-4" />
          가격/데이터 진단 보기
        </Link>
        <Link
          href="/pricing"
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-line bg-slate-50 px-3 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
        >
          <ArrowRight className="h-4 w-4" />
          요금제 보기
        </Link>
        <button
          type="button"
          onClick={() => void handleSignOut()}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-md border border-line bg-slate-50 px-3 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
        >
          <LogOut className="h-4 w-4" />
          로그아웃
        </button>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <div className="flex items-start gap-2 text-slate-600 dark:text-slate-300">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <p className="text-xs font-semibold leading-6">
            이 페이지는 계정 및 클라우드 동기화 상태 확인용입니다. 투자 판단은 참고 정보로만 활용해주세요.
          </p>
        </div>
      </section>
    </main>
  );
}
