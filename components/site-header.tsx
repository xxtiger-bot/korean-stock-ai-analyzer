"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Mail, Star, X } from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";

export function SiteHeader() {
  const {
    user,
    isSupabaseReady,
    isLoading,
    supabaseUrl,
    supabaseUrlStatus,
    supabaseNotice,
    signInWithMagicLink,
    signOut
  } = useAuth();
  const [authNotice, setAuthNotice] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [isSendingLink, setIsSendingLink] = useState(false);
  const [modalNotice, setModalNotice] = useState("");

  const email = typeof user?.email === "string" ? user.email : "";
  const isLocalMode = !user;

  const supabaseUrlStatusLabel =
    supabaseUrlStatus === "ok"
      ? "URL 정상"
      : supabaseUrlStatus === "missing"
        ? "URL 미설정"
        : supabaseUrlStatus === "contains-rest-v1"
          ? "URL 포함 /rest/v1/"
          : supabaseUrlStatus === "example-url"
            ? "URL 예시 aBcDe"
            : "URL 형식 오류";

  function handleOpenLogin() {
    console.log(`[auth] supabase url: ${supabaseUrl || "(empty)"}`);
    setIsLoginModalOpen(true);
    setModalNotice("");
  }

  function handleContinueLocalMode() {
    setIsLoginModalOpen(false);
    setModalNotice("");
    setAuthNotice("로컬 모드로 계속 사용합니다.");
  }

  async function handleSendMagicLink() {
    const redirectTo = `${window.location.origin}/auth/callback`;
    console.log(`[auth] supabase url: ${supabaseUrl || "(empty)"}`);
    console.log(`[auth] redirectTo: ${redirectTo}`);
    setIsSendingLink(true);
    try {
      const result = await signInWithMagicLink(loginEmail, redirectTo);
      if (!result.ok) {
        const message = result.message ?? "로그인 링크 요청에 실패했습니다.";
        setModalNotice(message);
        setAuthNotice(message);
        return;
      }

      const successMessage = result.message ?? "로그인 링크를 이메일로 보냈습니다.";
      setModalNotice(successMessage);
      setAuthNotice(successMessage);
      setIsLoginModalOpen(false);
      setLoginEmail("");
    } catch {
      const message = "로그인 링크 요청 중 문제가 발생했습니다. 다시 시도해주세요.";
      setModalNotice(message);
      setAuthNotice(message);
    } finally {
      setIsSendingLink(false);
    }
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
      <div className="mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 px-3 py-2 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 flex-1 items-center gap-3 sm:flex-none">
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
        <div className="flex w-full min-w-0 flex-wrap items-center justify-end gap-2 sm:w-auto sm:shrink-0">
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 sm:flex">
            <Star className="h-4 w-4 text-amber-500" />
            관심종목
          </div>
          {user ? (
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
            <>
              <button
                type="button"
                onClick={handleOpenLogin}
                className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-slate-400 dark:border-dark-line dark:bg-dark-panel dark:text-slate-200 dark:disabled:text-slate-500"
              >
                로그인
              </button>
              {isLoading && (
                <span className="hidden rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] font-semibold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-400 sm:inline-flex">
                  확인 중
                </span>
              )}
            </>
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
          <p className="max-w-full break-words text-right">
            {authNotice || supabaseNotice || "클라우드 동기화 미설정"}
          </p>
        </div>
      )}
      {isLocalMode && (
        <div className="mx-auto flex max-w-7xl items-center justify-end px-4 pb-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 sm:px-6 lg:px-8">
          <p className="max-w-full break-words text-right">
            현재 모드：로컬 모드 · 로그인 후 클라우드 동기화를 사용할 수 있습니다.
          </p>
        </div>
      )}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-sm rounded-xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold uppercase tracking-normal text-brand">Auth</p>
                <h3 className="mt-1 text-base font-bold text-ink dark:text-white">이메일 로그인</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line bg-slate-50 text-slate-500 hover:text-slate-700 dark:border-dark-line dark:bg-slate-900 dark:text-slate-300"
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
              로그인 링크를 받을 이메일을 입력해주세요.
            </p>
            <div className="mt-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900 dark:text-slate-300">
              <p>현재 모드：로컬 모드</p>
              <p className="mt-1">로그인 후 클라우드 동기화를 사용할 수 있습니다.</p>
              <p className="mt-1">Supabase URL 상태：{supabaseUrlStatusLabel}</p>
            </div>
            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                이메일
              </span>
              <input
                type="email"
                value={loginEmail}
                onChange={(event) => setLoginEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
              />
            </label>
            {modalNotice && (
              <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {modalNotice}
              </p>
            )}
            <button
              type="button"
              onClick={() => void handleSendMagicLink()}
              disabled={isSendingLink}
              className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              <Mail className="h-4 w-4" />
              {isSendingLink ? "전송 중..." : "로그인 링크 보내기"}
            </button>
            <button
              type="button"
              onClick={handleContinueLocalMode}
              className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
            >
              클라우드 로그인 없이 계속 사용
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
