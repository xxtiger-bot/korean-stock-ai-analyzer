"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AdminStats = {
  profiles: number;
  feedback: number;
  waitlist: number;
  referrals: number;
  watchlist: number;
  holdings: number;
  reports: number;
  snapshots: number;
};

type FeedbackItem = {
  id: string;
  email: string;
  category: string;
  message: string;
  rating: number | null;
  createdAt: string;
};

type WaitlistItem = {
  id: string;
  email: string;
  plan: string;
  source: string;
  createdAt: string;
};

type ReferralItem = {
  id: string;
  referralCode: string;
  rewardDays: number;
  createdAt: string;
};

const EMPTY_STATS: AdminStats = {
  profiles: 0,
  feedback: 0,
  waitlist: 0,
  referrals: 0,
  watchlist: 0,
  holdings: 0,
  reports: 0,
  snapshots: 0
};

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeCount(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function toDateTimeText(value: string) {
  if (!value) return "시간 정보 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 정보 없음";
  return date.toLocaleString("ko-KR", { hour12: false });
}

function normalizeFeedback(value: unknown): FeedbackItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  const message = safeText(raw.message).trim();
  if (!id || !message) return null;
  const ratingRaw = raw.rating;
  const rating =
    typeof ratingRaw === "number" && Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5
      ? ratingRaw
      : null;
  return {
    id,
    email: safeText(raw.email, "익명 사용자") || "익명 사용자",
    category: safeText(raw.category, "기타") || "기타",
    message,
    rating,
    createdAt: safeText(raw.created_at)
  };
}

function normalizeWaitlist(value: unknown): WaitlistItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  if (!id) return null;
  return {
    id,
    email: safeText(raw.email, "이메일 없음") || "이메일 없음",
    plan: safeText(raw.plan, "pro") || "pro",
    source: safeText(raw.source, "unknown") || "unknown",
    createdAt: safeText(raw.created_at)
  };
}

function normalizeReferral(value: unknown): ReferralItem | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  if (!id) return null;
  const rewardDaysRaw = raw.reward_days;
  const rewardDays = typeof rewardDaysRaw === "number" && Number.isFinite(rewardDaysRaw) ? rewardDaysRaw : 0;
  return {
    id,
    referralCode: safeText(raw.referral_code, "-") || "-",
    rewardDays,
    createdAt: safeText(raw.created_at)
  };
}

export function AdminDashboardPageClient() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState<AdminStats>(EMPTY_STATS);
  const [recentFeedback, setRecentFeedback] = useState<FeedbackItem[]>([]);
  const [recentWaitlist, setRecentWaitlist] = useState<WaitlistItem[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<ReferralItem[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadAdminData() {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setError("관리 데이터를 불러오지 못했습니다.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError("");

      try {
        const [
          profilesCount,
          feedbackCount,
          waitlistCount,
          referralsCount,
          watchlistCount,
          holdingsCount,
          reportsCount,
          snapshotsCount,
          feedbackRowsResult,
          waitlistRowsResult,
          referralsRowsResult
        ] = await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("user_feedback").select("id", { count: "exact", head: true }),
          supabase.from("pro_waitlist").select("id", { count: "exact", head: true }),
          supabase.from("referrals").select("id", { count: "exact", head: true }),
          supabase.from("watchlist_items").select("symbol", { count: "exact", head: true }),
          supabase.from("portfolio_holdings").select("id", { count: "exact", head: true }),
          supabase.from("portfolio_reports").select("id", { count: "exact", head: true }),
          supabase.from("portfolio_risk_snapshots").select("id", { count: "exact", head: true }),
          supabase
            .from("user_feedback")
            .select("id,email,category,message,rating,created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("pro_waitlist")
            .select("id,email,plan,source,created_at")
            .order("created_at", { ascending: false })
            .limit(5),
          supabase
            .from("referrals")
            .select("id,referral_code,reward_days,created_at")
            .order("created_at", { ascending: false })
            .limit(5)
        ]);

        if (cancelled) return;

        const hasCountError =
          Boolean(profilesCount.error) ||
          Boolean(feedbackCount.error) ||
          Boolean(waitlistCount.error) ||
          Boolean(referralsCount.error) ||
          Boolean(watchlistCount.error) ||
          Boolean(holdingsCount.error) ||
          Boolean(reportsCount.error) ||
          Boolean(snapshotsCount.error);
        const hasListError =
          Boolean(feedbackRowsResult.error) ||
          Boolean(waitlistRowsResult.error) ||
          Boolean(referralsRowsResult.error);

        if (hasCountError || hasListError) {
          setError("관리 데이터를 불러오지 못했습니다.");
        }

        setStats({
          profiles: safeCount(profilesCount.count),
          feedback: safeCount(feedbackCount.count),
          waitlist: safeCount(waitlistCount.count),
          referrals: safeCount(referralsCount.count),
          watchlist: safeCount(watchlistCount.count),
          holdings: safeCount(holdingsCount.count),
          reports: safeCount(reportsCount.count),
          snapshots: safeCount(snapshotsCount.count)
        });

        const feedbackList = Array.isArray(feedbackRowsResult.data)
          ? feedbackRowsResult.data.map(normalizeFeedback).filter((item): item is FeedbackItem => Boolean(item))
          : [];
        const waitlistList = Array.isArray(waitlistRowsResult.data)
          ? waitlistRowsResult.data
              .map(normalizeWaitlist)
              .filter((item): item is WaitlistItem => Boolean(item))
          : [];
        const referralList = Array.isArray(referralsRowsResult.data)
          ? referralsRowsResult.data
              .map(normalizeReferral)
              .filter((item): item is ReferralItem => Boolean(item))
          : [];

        setRecentFeedback(feedbackList);
        setRecentWaitlist(waitlistList);
        setRecentReferrals(referralList);
      } catch {
        if (!cancelled) {
          setError("관리 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadAdminData();

    return () => {
      cancelled = true;
    };
  }, []);

  const topCategory = useMemo(() => {
    const safeList = Array.isArray(recentFeedback) ? recentFeedback : [];
    if (safeList.length === 0) return "데이터 없음";
    const map = new Map<string, number>();
    safeList.forEach((item) => {
      const key = item.category || "기타";
      map.set(key, (map.get(key) ?? 0) + 1);
    });
    let best = "데이터 없음";
    let max = 0;
    map.forEach((value, key) => {
      if (value > max) {
        max = value;
        best = key;
      }
    });
    return best;
  }, [recentFeedback]);

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">KRX Insight Admin</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          베타 테스트 운영 현황을 확인합니다.
        </p>
      </section>

      {error ? (
        <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
          {error}
        </section>
      ) : null}

      <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">전체 사용자 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.profiles}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">피드백 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.feedback}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">Pro 알림 신청 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.waitlist}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">초대 성공 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.referrals}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">관심종목 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.watchlist}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">보유종목 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.holdings}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">저장된 AI 리포트 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.reports}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">리스크 스냅샷 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.snapshots}</p>
        </article>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">최근 피드백 5개</h2>
        <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          최근 카테고리 경향: {topCategory}
        </p>
        {isLoading ? (
          <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">불러오는 중...</p>
        ) : recentFeedback.length === 0 ? (
          <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
            아직 접수된 피드백이 없습니다.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {recentFeedback.map((item) => (
              <li
                key={item.id}
                className="rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
              >
                <p>
                  {item.rating ? `만족도 ${item.rating}/5` : "만족도 미입력"} · {item.category}
                </p>
                <p className="mt-1 break-words">{item.message}</p>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                  {item.email} · {toDateTimeText(item.createdAt)}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">최근 Pro 알림 신청 5개</h2>
          {isLoading ? (
            <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">불러오는 중...</p>
          ) : recentWaitlist.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
              아직 신청 기록이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentWaitlist.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                >
                  <p>{item.email}</p>
                  <p className="mt-1">
                    plan: {item.plan} · source: {item.source}
                  </p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {toDateTimeText(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>

        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">최근 초대 기록 5개</h2>
          {isLoading ? (
            <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">불러오는 중...</p>
          ) : recentReferrals.length === 0 ? (
            <p className="mt-3 text-sm font-semibold text-slate-500 dark:text-slate-400">
              아직 초대 기록이 없습니다.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {recentReferrals.map((item) => (
                <li
                  key={item.id}
                  className="rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                >
                  <p>referral_code: {item.referralCode}</p>
                  <p className="mt-1">reward_days: {item.rewardDays}</p>
                  <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    {toDateTimeText(item.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </article>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">빠른 이동</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin/feedback"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            피드백 관리
          </Link>
          <Link
            href="/admin/beta-kit"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            운영 키트
          </Link>
          <Link
            href="/admin/checklist"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            MVP 체크리스트
          </Link>
          <Link
            href="/beta"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            베타 페이지 보기
          </Link>
          <Link
            href="/pricing"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            요금제 페이지 보기
          </Link>
        </div>
        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
          Supabase 확인 안내: 데이터가 보이지 않으면 RLS 정책과 admin 계정 권한을 먼저 확인해주세요.
        </p>
      </section>
    </main>
  );
}
