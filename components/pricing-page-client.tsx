"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type PlanCard = {
  name: string;
  badgeClass: string;
  items: string[];
};

const PLAN_CARDS: PlanCard[] = [
  {
    name: "무료",
    badgeClass:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200",
    items: ["종목 검색", "기본 AI 분석", "로컬 모드", "하루 리포트 저장 1회"]
  },
  {
    name: "Pro",
    badgeClass:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200",
    items: [
      "클라우드 보유종목 동기화",
      "알림 조건 클라우드 동기화",
      "AI 리포트 저장",
      "리스크 알림",
      "더 많은 관심종목",
      "월 구독 예정"
    ]
  },
  {
    name: "Business",
    badgeClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
    items: ["다중 포트폴리오", "팀 계정", "API 연동", "별도 문의"]
  }
];

export function PricingPageClient() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const [profilePlan, setProfilePlan] = useState("free");

  useEffect(() => {
    const supabaseClient = supabase;
    const userId = user?.id ?? "";
    if (!isLoggedIn || !isSupabaseConfigured || !supabaseClient || !userId) {
      setProfilePlan("free");
      return;
    }
    const client = supabaseClient;

    let cancelled = false;

    async function fetchProfilePlan() {
      try {
        const { data: rows, error } = await client
          .from("profiles")
          .select("plan")
          .eq("id", userId)
          .limit(1);

        if (cancelled) return;

        if (error) {
          console.warn("[pricing] profiles.plan fetch failed:", error.message ?? "unknown error");
          setProfilePlan("free");
          return;
        }

        const firstRow =
          Array.isArray(rows) && rows.length > 0 ? (rows[0] as { plan?: unknown }) : null;
        const safePlan =
          typeof firstRow?.plan === "string" && firstRow.plan.trim()
            ? firstRow.plan.trim().toLowerCase()
            : "free";
        setProfilePlan(safePlan);
      } catch (fetchError) {
        const message = fetchError instanceof Error ? fetchError.message : "unknown error";
        console.warn("[pricing] profiles.plan fetch failed:", message);
        if (!cancelled) {
          setProfilePlan("free");
        }
      }
    }

    void fetchProfilePlan();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

  const currentPlanLabel = useMemo(() => {
    if (profilePlan === "pro") return "Pro";
    if (profilePlan === "business") return "Business";
    return "Free";
  }, [profilePlan]);

  return (
    <main className="mx-auto w-full max-w-7xl px-3 py-4 sm:px-5 lg:px-7">
      <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <p className="text-xs font-bold tracking-normal text-brand">요금제</p>
        <h1 className="mt-1 text-xl font-bold text-ink dark:text-white">요금제 안내</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          KRX Insight의 무료/Pro/Business 플랜 구조를 미리 확인할 수 있습니다.
        </p>
        {isLoggedIn ? (
          <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            현재 플랜: {currentPlanLabel}
          </p>
        ) : (
          <p className="mt-3 inline-flex rounded-md border border-line bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
            로그인 시 현재 플랜 정보를 확인할 수 있습니다.
          </p>
        )}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        {PLAN_CARDS.map((plan) => (
          <article
            key={plan.name}
            className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel"
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink dark:text-white">{plan.name}</h2>
              <span className={`rounded-md border px-2 py-1 text-[11px] font-bold ${plan.badgeClass}`}>
                준비 중
              </span>
            </div>
            <ul className="mt-3 grid gap-1.5">
              {plan.items.map((item) => (
                <li
                  key={`${plan.name}-${item}`}
                  className="text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300"
                >
                  - {item}
                </li>
              ))}
            </ul>
            <button
              type="button"
              className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
              disabled
            >
              준비 중
            </button>
          </article>
        ))}
      </section>
    </main>
  );
}
