"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Mail, Star, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { useAuth } from "@/components/auth-provider";

const AUTH_EMAIL_COOLDOWN_KEY = "authEmailCooldownUntil";
const AUTH_EMAIL_COOLDOWN_REASON_KEY = "authEmailCooldownReason";
const GUIDE_SEEN_KEY = "hasSeenGuide";
const AUTH_EMAIL_COOLDOWN_SECONDS = 60;
const AUTH_EMAIL_RATE_LIMIT_COOLDOWN_SECONDS = 180;

type AuthModalState =
  | "idle"
  | "sending"
  | "sent"
  | "cooldown"
  | "rateLimited"
  | "error"
  | "loggedIn";
type CooldownReason = "sent" | "rateLimited" | null;
type AuthLoginStep = "email" | "code";

export function SiteHeader() {
  const {
    user,
    isSupabaseReady,
    isLoading,
    supabaseUrl,
    supabaseUrlStatus,
    supabaseNotice,
    sendEmailOtpCode,
    verifyEmailOtpCode,
    signOut
  } = useAuth();
  const [authNotice, setAuthNotice] = useState("");
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loginStep, setLoginStep] = useState<AuthLoginStep>("email");
  const [modalNotice, setModalNotice] = useState("");
  const [emailCooldownUntil, setEmailCooldownUntil] = useState(0);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [authModalState, setAuthModalState] = useState<AuthModalState>("idle");
  const [cooldownReason, setCooldownReason] = useState<CooldownReason>(null);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [doNotShowGuideAgain, setDoNotShowGuideAgain] = useState(false);

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

  const setAuthState = useCallback((next: AuthModalState) => {
    console.log(`[auth] state: ${next}`);
    setAuthModalState(next);
  }, []);

  useEffect(() => {
    if (user) {
      setAuthState("loggedIn");
      setAuthNotice("");
      setModalNotice("");
      setLoginStep("email");
      setOtpCode("");
      return;
    }

    if (!user && authModalState === "loggedIn") {
      if (cooldownSeconds > 0) {
        setAuthState(cooldownReason === "rateLimited" ? "rateLimited" : "cooldown");
      } else {
        setAuthState("idle");
      }
    }
  }, [authModalState, cooldownReason, cooldownSeconds, setAuthState, user]);

  useEffect(() => {
    syncEmailCooldownFromStorage();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const seen = window.localStorage.getItem(GUIDE_SEEN_KEY);
      if (seen !== "true") {
        setIsGuideOpen(true);
        setDoNotShowGuideAgain(true);
        window.localStorage.setItem(GUIDE_SEEN_KEY, "true");
      }
    } catch {
      // localStorage may be blocked in restricted contexts.
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!Number.isFinite(emailCooldownUntil) || emailCooldownUntil <= Date.now()) {
      setCooldownSeconds(0);
      return;
    }

    const tick = () => {
      const remain = Math.max(0, Math.ceil((emailCooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remain);
      if (remain <= 0) {
        setEmailCooldownUntil(0);
        setCooldownReason(null);
        if (!user) {
          setAuthState("idle");
        }
        try {
          window.localStorage.removeItem(AUTH_EMAIL_COOLDOWN_KEY);
          window.localStorage.removeItem(AUTH_EMAIL_COOLDOWN_REASON_KEY);
        } catch {
          // localStorage may be blocked in restricted contexts.
        }
      }
    };

    tick();
    const timer = window.setInterval(tick, 1000);
    return () => {
      window.clearInterval(timer);
    };
  }, [emailCooldownUntil]);

  function startEmailCooldown(seconds: number, reason: Exclude<CooldownReason, null>) {
    if (typeof window === "undefined") return;
    const safeSeconds =
      Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : AUTH_EMAIL_COOLDOWN_SECONDS;
    const until = Date.now() + safeSeconds * 1000;
    setCooldownReason(reason);
    setEmailCooldownUntil(until);
    setCooldownSeconds(safeSeconds);
    setAuthState(reason === "rateLimited" ? "rateLimited" : "cooldown");
    try {
      window.localStorage.setItem(AUTH_EMAIL_COOLDOWN_KEY, String(until));
      window.localStorage.setItem(AUTH_EMAIL_COOLDOWN_REASON_KEY, reason);
    } catch {
      // localStorage may be blocked in restricted contexts.
    }
  }

  function syncEmailCooldownFromStorage() {
    if (typeof window === "undefined") return false;
    try {
      const raw = window.localStorage.getItem(AUTH_EMAIL_COOLDOWN_KEY);
      const reasonRaw = window.localStorage.getItem(AUTH_EMAIL_COOLDOWN_REASON_KEY);
      const parsed = Number(raw);
      const safeReason: CooldownReason =
        reasonRaw === "rateLimited" || reasonRaw === "sent" ? reasonRaw : null;
      if (Number.isFinite(parsed) && parsed > Date.now()) {
        setCooldownReason(safeReason);
        setEmailCooldownUntil(parsed);
        setCooldownSeconds(Math.max(1, Math.ceil((parsed - Date.now()) / 1000)));
        return true;
      } else {
        setEmailCooldownUntil(0);
        setCooldownSeconds(0);
        setCooldownReason(null);
        window.localStorage.removeItem(AUTH_EMAIL_COOLDOWN_KEY);
        window.localStorage.removeItem(AUTH_EMAIL_COOLDOWN_REASON_KEY);
        return false;
      }
    } catch {
      setEmailCooldownUntil(0);
      setCooldownSeconds(0);
      setCooldownReason(null);
      return false;
    }
  }

  function handleOpenLogin() {
    console.log(`[auth] supabase url: ${supabaseUrl || "(empty)"}`);
    const hasCooldown = syncEmailCooldownFromStorage();
    setIsLoginModalOpen(true);
    setModalNotice("");
    setOtpCode("");
    setLoginStep("email");
    if (user) {
      setAuthState("loggedIn");
      return;
    }
    if (hasCooldown) {
      setAuthState(cooldownReason === "rateLimited" ? "rateLimited" : "cooldown");
    } else {
      setAuthState("idle");
    }
  }

  function handleOpenGuide() {
    setIsGuideOpen(true);
  }

  function handleCloseGuide() {
    if (typeof window !== "undefined" && doNotShowGuideAgain) {
      try {
        window.localStorage.setItem(GUIDE_SEEN_KEY, "true");
      } catch {
        // localStorage may be blocked in restricted contexts.
      }
    }
    setIsGuideOpen(false);
  }

  function handleContinueLocalMode() {
    setIsLoginModalOpen(false);
    setModalNotice("");
    setOtpCode("");
    setLoginStep("email");
    setAuthState("idle");
    setAuthNotice("로컬 모드로 계속 사용합니다.");
  }

  async function handleSendOtpCode() {
    if (user) {
      setAuthState("loggedIn");
      return;
    }
    if (cooldownSeconds > 0 || authModalState === "sending") {
      return;
    }
    console.log(`[auth] supabase url: ${supabaseUrl || "(empty)"}`);
    setModalNotice("");
    setAuthState("sending");
    try {
      const result = await sendEmailOtpCode(loginEmail);
      console.log(`[auth] response status: ${result.statusCode ?? 0}`);
      if (!result.ok) {
        const rawMessage = result.message ?? "인증코드 요청에 실패했습니다.";
        const lowerMessage = rawMessage.toLowerCase();
        const isRateLimited =
          result.statusCode === 429 ||
          lowerMessage.includes("email rate limit exceeded") ||
          lowerMessage.includes("rate limit") ||
          lowerMessage.includes("over_email_send_rate_limit") ||
          lowerMessage.includes("over_request_rate_limit");
        const isNetworkError =
          lowerMessage.includes("failed to fetch") ||
          lowerMessage.includes("fetch failed") ||
          lowerMessage.includes("err_name_not_resolved") ||
          lowerMessage.includes("supabase 서버에 연결할 수 없습니다");
        const message = isRateLimited
          ? "로그인 이메일 요청이 너무 많습니다. 3분 후 다시 시도해주세요."
          : isNetworkError
            ? "Supabase 연결에 실패했습니다. 네트워크를 확인해주세요."
            : rawMessage;
        setModalNotice(message);
        setAuthNotice(message);
        if (isRateLimited) {
          setAuthState("rateLimited");
          startEmailCooldown(AUTH_EMAIL_RATE_LIMIT_COOLDOWN_SECONDS, "rateLimited");
        } else {
          setAuthState("error");
        }
        return;
      }

      const successMessage = result.message ?? "인증코드를 이메일로 보냈습니다.";
      setModalNotice(successMessage);
      setAuthNotice(successMessage);
      setAuthState("sent");
      setLoginStep("code");
      startEmailCooldown(AUTH_EMAIL_COOLDOWN_SECONDS, "sent");
    } catch {
      console.log("[auth] response status: 0");
      const message = "Supabase 연결에 실패했습니다. 네트워크를 확인해주세요.";
      setModalNotice(message);
      setAuthNotice(message);
      setAuthState("error");
    }
  }

  async function handleVerifyOtpCode() {
    if (user) {
      setAuthState("loggedIn");
      return;
    }
    if (authModalState === "sending") {
      return;
    }
    console.log(`[auth] supabase url: ${supabaseUrl || "(empty)"}`);
    setModalNotice("");
    setAuthState("sending");
    try {
      const result = await verifyEmailOtpCode(loginEmail, otpCode);
      console.log(`[auth] response status: ${result.statusCode ?? 0}`);
      if (!result.ok) {
        const rawMessage = result.message ?? "인증코드 확인에 실패했습니다.";
        const lowerMessage = rawMessage.toLowerCase();
        const isNetworkError =
          lowerMessage.includes("failed to fetch") ||
          lowerMessage.includes("fetch failed") ||
          lowerMessage.includes("err_name_not_resolved") ||
          lowerMessage.includes("supabase 서버에 연결할 수 없습니다");
        const message = isNetworkError
          ? "Supabase 연결에 실패했습니다. 네트워크를 확인해주세요."
          : rawMessage;
        setModalNotice(message);
        setAuthNotice(message);
        setAuthState("error");
        return;
      }

      setModalNotice("인증이 완료되었습니다.");
      setAuthNotice("로그인되었습니다.");
      setAuthState("loggedIn");
      setIsLoginModalOpen(false);
      setOtpCode("");
      setLoginStep("email");
    } catch {
      console.log("[auth] response status: 0");
      const message = "Supabase 연결에 실패했습니다. 네트워크를 확인해주세요.";
      setModalNotice(message);
      setAuthNotice(message);
      setAuthState("error");
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
          <button
            type="button"
            onClick={handleOpenGuide}
            className="inline-flex h-9 items-center justify-center rounded-lg border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
          >
            사용 가이드
          </button>
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
                <h3 className="mt-1 text-base font-bold text-ink dark:text-white">이메일 인증 로그인</h3>
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
              이메일로 받은 인증코드를 입력해 로그인할 수 있습니다.
            </p>
            <div className="mt-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-[11px] font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900 dark:text-slate-300">
              <p>현재 모드：로컬 모드</p>
              <p className="mt-1">로그인 후 클라우드 동기화를 사용할 수 있습니다.</p>
              <p className="mt-1">Supabase URL 상태：{supabaseUrlStatusLabel}</p>
            </div>
            {user ? (
              <div className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs font-semibold text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
                <p>이미 로그인되었습니다.</p>
                <p className="mt-1 break-all">{email || "로그인 사용자"}</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 inline-flex h-9 items-center justify-center rounded-md border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <>
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
                {loginStep === "code" && (
                  <label className="mt-2 block">
                    <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
                      6자리 인증코드
                    </span>
                    <input
                      type="text"
                      value={otpCode}
                      onChange={(event) =>
                        setOtpCode(event.target.value.replace(/[^0-9a-zA-Z]/g, "").slice(0, 8))
                      }
                      placeholder="인증코드 입력"
                      className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
                    />
                    <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                      이메일로 받은 인증코드를 입력해주세요.
                    </p>
                  </label>
                )}
                {modalNotice && (
                  <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                    {modalNotice}
                  </p>
                )}
                <button
                  type="button"
                  onClick={() => void handleSendOtpCode()}
                  disabled={authModalState === "sending" || cooldownSeconds > 0}
                  className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Mail className="h-4 w-4" />
                  {authModalState === "sending"
                    ? "전송 중..."
                    : cooldownSeconds > 0
                      ? `다시 보내기까지 ${cooldownSeconds}초`
                      : loginStep === "code"
                        ? "인증코드 다시 보내기"
                        : "인증코드 보내기"}
                </button>
                {loginStep === "code" && (
                  <button
                    type="button"
                    onClick={() => void handleVerifyOtpCode()}
                    disabled={authModalState === "sending"}
                    className="mt-2 inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-slate-400 dark:border-dark-line dark:bg-slate-950 dark:text-slate-200 dark:disabled:text-slate-500"
                  >
                    {authModalState === "sending" ? "확인 중..." : "인증코드 확인"}
                  </button>
                )}
              </>
            )}
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
      {isGuideOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-3 py-4 sm:px-4">
          <div className="flex w-full max-w-2xl max-w-full flex-col overflow-hidden rounded-xl border border-line bg-white shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 dark:border-dark-line sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">Guide</p>
                <h3 className="mt-1 text-base font-bold text-ink dark:text-white">
                  처음 사용 가이드
                </h3>
              </div>
              <button
                type="button"
                onClick={handleCloseGuide}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-line bg-slate-50 text-slate-500 hover:text-slate-700 dark:border-dark-line dark:bg-slate-900 dark:text-slate-300"
                aria-label="가이드 닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] space-y-4 overflow-y-auto px-4 py-4 sm:px-5">
              <section className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900">
                <h4 className="text-sm font-bold text-ink dark:text-white">A. 이 사이트는 무엇인가요?</h4>
                <p className="mt-1 text-xs leading-6 text-slate-600 dark:text-slate-300">
                  KRX Insight는 한국 주식의 현재가, 일별 종가, 기술지표, AI 참고 분석을 제공하는
                  도구입니다.
                </p>
              </section>

              <section className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900">
                <h4 className="text-sm font-bold text-ink dark:text-white">B. 가격 데이터는 어떻게 보나요?</h4>
                <ul className="mt-1 space-y-1 text-xs leading-6 text-slate-600 dark:text-slate-300">
                  <li>- 현재가: KIS 기준</li>
                  <li>- 최근 종가: data.go.kr 일별 종가 기준</li>
                  <li>- KIS 실패 시 현재가 확인 불가로 표시</li>
                  <li>- data.go.kr 가격은 실시간 가격이 아님</li>
                </ul>
              </section>

              <section className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900">
                <h4 className="text-sm font-bold text-ink dark:text-white">C. 종목 분석은 어떻게 하나요?</h4>
                <ul className="mt-1 space-y-1 text-xs leading-6 text-slate-600 dark:text-slate-300">
                  <li>- 종목 검색</li>
                  <li>- 상세 페이지 이동</li>
                  <li>- AI 분석 리포트 확인</li>
                  <li>- 캔들차트 분석 참고</li>
                </ul>
              </section>

              <section className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900">
                <h4 className="text-sm font-bold text-ink dark:text-white">D. 내 보유종목은 어떻게 쓰나요?</h4>
                <ul className="mt-1 space-y-1 text-xs leading-6 text-slate-600 dark:text-slate-300">
                  <li>- /portfolio 에서 종목코드, 매수가, 수량 입력</li>
                  <li>- AI 보유 진단 확인</li>
                  <li>- 리스크 알림 확인</li>
                  <li>- 리포트 복사/이미지 저장</li>
                </ul>
              </section>

              <section className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900">
                <h4 className="text-sm font-bold text-ink dark:text-white">E. 클라우드 동기화는 무엇인가요?</h4>
                <ul className="mt-1 space-y-1 text-xs leading-6 text-slate-600 dark:text-slate-300">
                  <li>- 로그인하면 보유종목과 알림 조건을 클라우드에 저장 가능</li>
                  <li>- 로그인하지 않아도 로컬 모드 사용 가능</li>
                  <li>- Supabase 연결 실패 시 localStorage fallback</li>
                </ul>
              </section>

              <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
                <p className="text-xs leading-6 text-amber-900 dark:text-amber-200">
                  이 서비스는 투자 참고 정보이며, 매수/매도 추천이 아닙니다. 투자 결정은 본인의 판단과
                  책임입니다.
                </p>
                <p className="mt-1 text-[11px] text-amber-800 dark:text-amber-300">
                  中文提示：本工具用于参考分析，不构成投资建议。
                </p>
              </section>
            </div>

            <div className="border-t border-line px-4 py-3 dark:border-dark-line sm:px-5">
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={doNotShowGuideAgain}
                  onChange={(event) => setDoNotShowGuideAgain(event.target.checked)}
                  className="h-4 w-4 rounded border-line text-brand focus:ring-brand/20 dark:border-dark-line"
                />
                다시 보지 않기
              </label>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleCloseGuide}
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
