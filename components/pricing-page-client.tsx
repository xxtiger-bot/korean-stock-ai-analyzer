"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";
import { normalizeUserPlan, toPlanLabel } from "@/lib/plan";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type PlanCard = {
  id: string;
  name: string;
  badgeClass: string;
  items: string[];
};

const PLAN_CARDS: PlanCard[] = [
  {
    id: "free-plan",
    name: "무료",
    badgeClass:
      "border-slate-200 bg-slate-50 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200",
    items: ["종목 검색", "기본 AI 분석", "로컬 모드", "하루 리포트 저장 1회"]
  },
  {
    id: "pro",
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
    id: "business-plan",
    name: "Business",
    badgeClass:
      "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-200",
    items: ["다중 포트폴리오", "팀 계정", "API 연동", "별도 문의"]
  }
];

const PRO_FEATURE_OPTIONS = [
  "더 많은 관심종목",
  "더 많은 보유종목",
  "AI 리포트 무제한 저장",
  "리스크 변화 전체 기록",
  "Kakao 알림"
] as const;

function isValidEmail(email: string) {
  const safeEmail = email.trim();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(safeEmail);
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function isDuplicateError(error: unknown) {
  if (typeof error !== "object" || error === null) return false;
  const code = safeText((error as { code?: unknown }).code).toLowerCase();
  const message = safeText((error as { message?: unknown }).message).toLowerCase();
  return code === "23505" || message.includes("duplicate");
}

export function PricingPageClient() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const [profilePlan, setProfilePlan] = useState("free");
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [isWaitlistSubmitting, setIsWaitlistSubmitting] = useState(false);
  const [waitlistNotice, setWaitlistNotice] = useState("");
  const [waitlistApplied, setWaitlistApplied] = useState(false);
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistMessage, setWaitlistMessage] = useState("");
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);

  useEffect(() => {
    const safeEmail = typeof user?.email === "string" ? user.email.trim() : "";
    setWaitlistEmail(safeEmail);
  }, [user?.email]);

  useEffect(() => {
    const supabaseClient = supabase;
    const userId = user?.id ?? "";
    if (!isLoggedIn || !isSupabaseConfigured || !supabaseClient || !userId) {
      setProfilePlan("free");
      setWaitlistApplied(false);
      return;
    }
    const client = supabaseClient;

    let cancelled = false;

    async function fetchProfilePlanAndWaitlistStatus() {
      try {
        const [{ data: profileRows, error: profileError }, { data: waitlistRows, error: waitlistError }] =
          await Promise.all([
            client.from("profiles").select("plan").eq("id", userId).limit(1),
            client.from("pro_waitlist").select("id").eq("user_id", userId).limit(1)
          ]);

        if (cancelled) return;

        if (profileError) {
          setProfilePlan("free");
        } else {
          const firstProfile =
            Array.isArray(profileRows) && profileRows.length > 0
              ? (profileRows[0] as { plan?: unknown })
              : null;
          setProfilePlan(normalizeUserPlan(firstProfile?.plan));
        }

        if (waitlistError) {
          setWaitlistApplied(false);
        } else {
          setWaitlistApplied(Array.isArray(waitlistRows) && waitlistRows.length > 0);
        }
      } catch {
        if (!cancelled) {
          setProfilePlan("free");
          setWaitlistApplied(false);
        }
      }
    }

    void fetchProfilePlanAndWaitlistStatus();

    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, user?.id]);

  const currentPlanLabel = useMemo(() => toPlanLabel(normalizeUserPlan(profilePlan)), [profilePlan]);

  const currentPlanCardName = useMemo(() => {
    if (currentPlanLabel === "Pro") return "Pro";
    if (currentPlanLabel === "Business") return "Business";
    return "무료";
  }, [currentPlanLabel]);

  const toggleFeature = (feature: string) => {
    setSelectedFeatures((current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return safeCurrent.includes(feature)
        ? safeCurrent.filter((item) => item !== feature)
        : [...safeCurrent, feature];
    });
  };

  async function handleSubmitProWaitlist(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isSupabaseConfigured || !supabase) {
      setWaitlistNotice("Pro 알림 신청에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    const normalizedEmail = waitlistEmail.trim().toLowerCase();
    if (!isValidEmail(normalizedEmail)) {
      setWaitlistNotice("이메일 형식을 확인해주세요.");
      return;
    }

    setIsWaitlistSubmitting(true);
    setWaitlistNotice("");

    try {
      if (user?.id) {
        const { data: existingRows, error: existingError } = await supabase
          .from("pro_waitlist")
          .select("id")
          .eq("user_id", user.id)
          .limit(1);
        if (existingError) {
          throw existingError;
        }
        if (Array.isArray(existingRows) && existingRows.length > 0) {
          setWaitlistApplied(true);
          setWaitlistNotice("이미 Pro 알림 신청이 등록되어 있습니다.");
          setIsWaitlistSubmitting(false);
          return;
        }
      }

      const featureText = (Array.isArray(selectedFeatures) ? selectedFeatures : []).join(", ");
      const cleanMessage = waitlistMessage.trim();
      const messageParts = [
        featureText ? `관심 기능: ${featureText}` : "",
        cleanMessage ? `요청 메시지: ${cleanMessage}` : ""
      ].filter(Boolean);

      const { error } = await supabase.from("pro_waitlist").insert({
        id: `pro-waitlist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        user_id: user?.id ?? null,
        email: normalizedEmail,
        plan: "pro",
        source: "pricing",
        message: messageParts.join("\n")
      });

      if (error) {
        if (isDuplicateError(error)) {
          setWaitlistApplied(true);
          setWaitlistNotice("이미 Pro 알림 신청이 등록되어 있습니다.");
          setIsWaitlistSubmitting(false);
          return;
        }
        throw error;
      }

      setWaitlistApplied(true);
      setWaitlistNotice("Pro 출시 알림 신청이 완료되었습니다.");
      setSelectedFeatures([]);
      setWaitlistMessage("");
    } catch {
      setWaitlistNotice("Pro 알림 신청에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsWaitlistSubmitting(false);
    }
  }

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
            id={plan.id}
            key={plan.name}
            className={`scroll-mt-24 rounded-lg border bg-white p-4 shadow-soft transition dark:bg-dark-panel ${
              currentPlanCardName === plan.name
                ? "border-brand ring-1 ring-brand/30 dark:border-blue-500/70 dark:ring-blue-500/30"
                : "border-line dark:border-dark-line"
            }`}
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

            {plan.name === "Pro" ? (
              <div className="mt-4 space-y-2">
                <button
                  type="button"
                  onClick={() => setIsWaitlistOpen((current) => !current)}
                  className="inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                >
                  Pro 알림 신청
                </button>
                <button
                  type="button"
                  className="inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
                  disabled
                >
                  Pro 준비 중
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="mt-4 inline-flex h-9 w-full items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
                disabled
              >
                준비 중
              </button>
            )}
          </article>
        ))}
      </section>

      {isWaitlistOpen ? (
        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-ink dark:text-white">Pro 알림 신청</h3>
            {waitlistApplied ? (
              <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                신청 완료
              </span>
            ) : null}
          </div>
          <form className="mt-3 grid gap-3" onSubmit={handleSubmitProWaitlist}>
            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">이메일</span>
              <input
                value={waitlistEmail}
                onChange={(event) => setWaitlistEmail(event.target.value)}
                type="email"
                placeholder="you@example.com"
                className="h-10 rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              />
            </label>

            <fieldset className="grid gap-2">
              <legend className="text-xs font-bold text-slate-500">관심 기능 선택</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {PRO_FEATURE_OPTIONS.map((option) => {
                  const checked = selectedFeatures.includes(option);
                  return (
                    <label
                      key={option}
                      className="flex min-h-10 items-center gap-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleFeature(option)}
                        className="h-4 w-4 accent-blue-600"
                      />
                      <span>{option}</span>
                    </label>
                  );
                })}
              </div>
            </fieldset>

            <label className="grid gap-1">
              <span className="text-xs font-bold text-slate-500">요청 메시지 (선택)</span>
              <textarea
                value={waitlistMessage}
                onChange={(event) => setWaitlistMessage(event.target.value)}
                placeholder="필요한 기능이나 의견을 남겨주세요."
                className="min-h-24 rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={isWaitlistSubmitting}
                className="inline-flex h-10 items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isWaitlistSubmitting ? "신청 중..." : "Pro 알림 신청"}
              </button>
              <button
                type="button"
                onClick={() => setIsWaitlistOpen(false)}
                className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
              >
                닫기
              </button>
            </div>
          </form>
          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Kakao 로그인은 이메일 권한 설정 후 제공될 예정입니다.
          </p>
          {waitlistNotice ? (
            <p className="mt-2 text-xs font-semibold text-slate-700 dark:text-slate-200">
              {waitlistNotice}
            </p>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
