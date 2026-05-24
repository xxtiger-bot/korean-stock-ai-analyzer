"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/components/auth-provider";

type HomeBetaOnboardingProps = {
  compact?: boolean;
};

const ONBOARDING_STORAGE_KEY = "krx_onboarding_tasks";

const MISSION_ITEMS = [
  {
    id: "stockSearch",
    title: "종목 검색하기",
    description: "종목 검색에서 관심 종목을 찾아보세요.",
    href: "/#search"
  },
  {
    id: "aiAnalysis",
    title: "AI 분석 확인하기",
    description: "종목 상세에서 AI 분석 리포트를 확인하세요.",
    href: "/stocks/005930"
  },
  {
    id: "watchlist",
    title: "관심종목 추가하기",
    description: "별표 버튼으로 오늘 볼 종목을 모아두세요.",
    href: "/#home-interest"
  },
  {
    id: "portfolio",
    title: "보유종목 등록하기",
    description: "매수가와 수량을 입력해 진단을 확인하세요.",
    href: "/portfolio#portfolio-add-entry"
  },
  {
    id: "feedback",
    title: "피드백 남기기",
    description: "테스트 후 피드백을 남겨 개선에 참여해 주세요.",
    href: "/beta"
  }
] as const;

type MissionId = (typeof MISSION_ITEMS)[number]["id"];
type MissionState = Record<MissionId, boolean>;

function createDefaultMissionState(): MissionState {
  return {
    stockSearch: false,
    aiAnalysis: false,
    watchlist: false,
    portfolio: false,
    feedback: false
  };
}

function normalizeMissionState(raw: unknown): MissionState {
  const defaults = createDefaultMissionState();
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) return defaults;

  const parsed = raw as Record<string, unknown>;
  return {
    stockSearch: parsed.stockSearch === true,
    aiAnalysis: parsed.aiAnalysis === true,
    watchlist: parsed.watchlist === true,
    portfolio: parsed.portfolio === true,
    feedback: parsed.feedback === true
  };
}

export function HomeBetaOnboarding({ compact = false }: HomeBetaOnboardingProps) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const [missionState, setMissionState] = useState<MissionState>(createDefaultMissionState());
  const [isHydrated, setIsHydrated] = useState(false);
  const actionLink = useMemo(() => (isLoggedIn ? "/portfolio" : "/beta"), [isLoggedIn]);
  const actionLabel = isLoggedIn ? "내 보유종목으로 이동" : "무료로 테스트하기";
  const completedCount = useMemo(
    () => Object.values(missionState).filter((value) => value).length,
    [missionState]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (!raw) {
        setMissionState(createDefaultMissionState());
        setIsHydrated(true);
        return;
      }
      const parsed = JSON.parse(raw) as unknown;
      setMissionState(normalizeMissionState(parsed));
    } catch {
      setMissionState(createDefaultMissionState());
    } finally {
      setIsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!isHydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(missionState));
    } catch {
      // localStorage may be blocked in restricted environments.
    }
  }, [isHydrated, missionState]);

  function handleLoginClick() {
    if (typeof document === "undefined") return;
    const trigger = document.querySelector<HTMLButtonElement>("[data-auth-login-trigger='true']");
    if (trigger) {
      trigger.click();
      return;
    }
    window.location.href = "/";
  }

  function toggleMission(id: MissionId) {
    setMissionState((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  }

  function resetMissionState() {
    const nextState = createDefaultMissionState();
    setMissionState(nextState);
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, JSON.stringify(nextState));
    } catch {
      // localStorage may be blocked in restricted environments.
    }
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-normal text-brand">처음 오셨나요?</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">테스트 미션 온보딩</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            종목 검색부터 피드백까지 핵심 흐름을 5단계로 빠르게 확인해보세요.
          </p>
        </div>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Link
            href={actionLink}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            {actionLabel}
          </Link>
          {!isLoggedIn ? (
            <button
              type="button"
              onClick={handleLoginClick}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
            >
              로그인
            </button>
          ) : null}
          <button
            type="button"
            onClick={resetMissionState}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          >
            진행 상황 초기화
          </button>
        </div>
      </div>
      <div className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/50">
        <p className="text-sm font-bold text-ink dark:text-white">
          {completedCount}/{MISSION_ITEMS.length} 완료
        </p>
      </div>
      <div className="mt-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 dark:border-blue-900/60 dark:bg-blue-950/30">
        <p className="text-xs font-semibold leading-5 text-blue-800 dark:text-blue-200">
          홈 화면에 추가하면 앱처럼 사용할 수 있습니다.
        </p>
        <Link
          href="/pwa"
          className="mt-2 inline-flex min-h-11 items-center justify-center rounded-md border border-blue-200 bg-white px-3 text-xs font-bold text-blue-700 hover:border-blue-400 dark:border-blue-800/70 dark:bg-slate-950 dark:text-blue-200"
        >
          설치 안내 보기
        </Link>
      </div>
      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
        {MISSION_ITEMS.map((item, index) => {
          const checked = missionState[item.id];
          return (
            <article
              key={item.id}
              className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60"
            >
              <div className="flex items-start gap-2">
                <button
                  type="button"
                  aria-label={`${item.title} 완료 체크`}
                  onClick={() => toggleMission(item.id)}
                  className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded border text-xs font-bold ${
                    checked
                      ? "border-emerald-400 bg-emerald-500 text-white"
                      : "border-slate-300 bg-white text-slate-500 dark:border-dark-line dark:bg-slate-950 dark:text-slate-300"
                  }`}
                >
                  {checked ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-brand">{index + 1}단계</p>
                  <p className="mt-1 text-sm font-bold text-ink dark:text-white">{item.title}</p>
                  <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                    {item.description}
                  </p>
                </div>
              </div>
              <Link
                href={item.href}
                className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
              >
                바로가기
              </Link>
            </article>
          );
        })}
      </div>
    </section>
  );
}
