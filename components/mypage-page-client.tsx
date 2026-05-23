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

export function MyPagePageClient() {
  const router = useRouter();
  const { user, isLoading, signOut } = useAuth();
  const { cloudSyncStatus, isCloudSyncing, cloudSyncNotice } = usePortfolio();

  const [plan, setPlan] = useState<PlanLabel>("Free");
  const [stats, setStats] = useState<CloudStats>({
    holdingsCount: 0,
    alertRulesCount: 0,
    reportsCount: 0
  });
  const [recentReports, setRecentReports] = useState<SavedReport[]>([]);
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
      setStats({ holdingsCount: 0, alertRulesCount: 0, reportsCount: 0 });
      setRecentReports([]);
      setExpandedReportId(null);
      setFetchError("");
      setIsFetching(false);
      return;
    }

    if (!isSupabaseConfigured || !supabaseClient) {
      setFetchError("계정 정보를 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
      setStats({ holdingsCount: 0, alertRulesCount: 0, reportsCount: 0 });
      setRecentReports([]);
      setPlan("Free");
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
        recentReportsResult
      ] = await Promise.allSettled([
        client.from("profiles").select("plan").eq("id", userId).limit(1),
        client.from("portfolio_holdings").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client
          .from("portfolio_alert_rules")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId),
        client.from("portfolio_reports").select("id", { count: "exact", head: true }).eq("user_id", userId),
        client
          .from("portfolio_reports")
          .select("id,report_date,summary,created_at,payload")
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(3)
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
        reportsCount: countFromResult(reportsCountResult)
      };

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

      setPlan(nextPlan);
      setStats(nextStats);
      setRecentReports(nextRecentReports);
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
          </ul>
        </article>
      </section>

      {fetchError && (
        <section className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-200">
          {fetchError}
        </section>
      )}

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
