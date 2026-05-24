"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useAuth } from "@/components/auth-provider";

type HomeBetaOnboardingProps = {
  compact?: boolean;
};

const STEP_ITEMS = [
  {
    title: "종목 검색",
    description: "관심 있는 종목을 먼저 찾아보세요.",
    href: "/#search"
  },
  {
    title: "관심종목 추가",
    description: "별표 버튼으로 오늘 볼 종목을 모아두세요.",
    href: "/#home-interest"
  },
  {
    title: "보유종목 등록",
    description: "매수가와 수량을 입력해 진단을 확인하세요.",
    href: "/portfolio#portfolio-add-entry"
  }
] as const;

export function HomeBetaOnboarding({ compact = false }: HomeBetaOnboardingProps) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const actionLink = useMemo(() => (isLoggedIn ? "/portfolio" : "/beta"), [isLoggedIn]);
  const actionLabel = isLoggedIn ? "내 보유종목으로 이동" : "무료로 테스트하기";

  function handleLoginClick() {
    if (typeof document === "undefined") return;
    const trigger = document.querySelector<HTMLButtonElement>("[data-auth-login-trigger='true']");
    if (trigger) {
      trigger.click();
      return;
    }
    window.location.href = "/";
  }

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold tracking-normal text-brand">처음 오셨나요?</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">3단계로 바로 시작하기</h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            오늘 시장 브리핑을 확인하고, 검색부터 보유종목 진단까지 빠르게 진행할 수 있습니다.
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
        </div>
      </div>
      <div className={`mt-3 grid gap-2 ${compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3"}`}>
        {STEP_ITEMS.map((item, index) => (
          <Link
            key={item.title}
            href={item.href}
            className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60"
          >
            <p className="text-xs font-bold text-brand">{index + 1}단계</p>
            <p className="mt-1 text-sm font-bold text-ink dark:text-white">{item.title}</p>
            <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
              {item.description}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

