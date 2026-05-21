"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Star } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";

export function SiteHeader() {
  const { user, isSupabaseReady, isLoading, signInWithGoogle, signOut } = useAuth();
  const [authNotice, setAuthNotice] = useState("");

  const email = typeof user?.email === "string" ? user.email : "";

  async function handleSignIn() {
    const result = await signInWithGoogle();
    if (!result.ok) {
      setAuthNotice(result.message ?? "로그인을 시작할 수 없습니다.");
      return;
    }
    setAuthNotice("");
  }

  async function handleSignOut() {
    const result = await signOut();
    if (!result.ok) {
      setAuthNotice(result.message ?? "로그아웃에 실패했습니다.");
      return;
    }
    setAuthNotice("로그아웃되었습니다.");
  }

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur dark:border-dark-line dark:bg-slate-950/88">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-normal text-ink dark:text-white">
              KRX Insight
            </span>
            <span className="block truncate text-xs font-medium text-slate-500">
              한국 주식 분석
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 sm:flex">
            <Star className="h-4 w-4 text-amber-500" />
            관심종목
          </div>
          {isLoading ? (
            <span className="hidden rounded-lg border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-400 sm:inline-flex">
              로그인 확인 중
            </span>
          ) : user ? (
            <div className="inline-flex max-w-[260px] items-center gap-2 rounded-lg border border-line bg-slate-50 px-2.5 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 sm:px-3">
              <span className="hidden truncate sm:inline">{email || "로그인 사용자"}</span>
              <button
                type="button"
                onClick={handleSignOut}
                className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-brand dark:border-dark-line dark:bg-slate-900 dark:text-slate-300"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleSignIn}
              className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
            >
              로그인
            </button>
          )}
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
          >
            <BriefcaseBusiness className="h-4 w-4 text-brand" />
            <span className="hidden sm:inline">내 보유종목</span>
            <span className="sm:hidden">보유종목</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
      {(authNotice || !isSupabaseReady) && (
        <div className="mx-auto flex max-w-7xl items-center justify-end px-4 pb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <p className="truncate">
            {authNotice || "클라우드 동기화는 아직 설정되지 않았습니다."}
          </p>
        </div>
      )}
    </header>
  );
}
