"use client";

import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Mail, Search, UserCircle2, X } from "lucide-react";
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
type CooldownReason = "success" | "rateLimit" | null;
type AuthLoginStep = "email" | "code";

type GuideSection = {
  id: string;
  title: string;
  description: string;
  bullets?: string[];
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    id: "about",
    title: "A. 이 사이트는 무엇인가요?",
    description:
      "KRX Insight는 한국 주식의 현재가, 일별 종가, 기술지표, AI 참고 분석을 제공하는 도구입니다."
  },
  {
    id: "price",
    title: "B. 가격 데이터는 어떻게 보나요?",
    description: "현재가와 최근 종가의 출처를 구분해서 확인하세요.",
    bullets: [
      "현재가: KIS 기준",
      "최근 종가: data.go.kr 일별 종가 기준",
      "KIS 실패 시 현재가 확인 불가로 표시",
      "data.go.kr 가격은 실시간 가격이 아님"
    ]
  },
  {
    id: "analysis",
    title: "C. 종목 분석은 어떻게 하나요?",
    description: "검색 후 상세 페이지에서 AI 분석과 차트 해석을 확인할 수 있습니다.",
    bullets: ["종목 검색", "상세 페이지 이동", "AI 분석 리포트 확인", "캔들차트 분석 참고"]
  },
  {
    id: "portfolio",
    title: "D. 내 보유종목은 어떻게 쓰나요?",
    description: "/portfolio에서 보유종목을 등록하고 진단과 알림을 확인할 수 있습니다.",
    bullets: [
      "종목코드, 매수가, 수량 입력",
      "AI 보유 진단 확인",
      "리스크 알림 확인",
      "리포트 복사/이미지 저장"
    ]
  },
  {
    id: "cloud",
    title: "E. 클라우드 동기화는 무엇인가요?",
    description: "로그인하면 보유종목과 알림 조건을 클라우드에 저장할 수 있습니다.",
    bullets: [
      "로그인 시 클라우드 동기화 가능",
      "비로그인 상태에서도 로컬 모드 사용 가능",
      "Supabase 연결 실패 시 localStorage fallback"
    ]
  }
];

function getUserDisplayLabel(
  user: { email?: string | null; user_metadata?: unknown; app_metadata?: unknown } | null
) {
  if (!user) return "로그인 사용자";

  const safeEmail = typeof user.email === "string" ? user.email.trim() : "";
  if (safeEmail) return safeEmail;

  const metadata = user.user_metadata as Record<string, unknown> | null;
  const appMetadata = user.app_metadata as Record<string, unknown> | null;
  const providerFromMeta = typeof metadata?.provider === "string" ? metadata.provider.toLowerCase() : "";
  const providerFromAppMeta =
    typeof appMetadata?.provider === "string" ? appMetadata.provider.toLowerCase() : "";
  const provider = providerFromAppMeta || providerFromMeta;

  if (provider === "kakao") return "Kakao 사용자";

  const nameCandidates = [
    typeof metadata?.name === "string" ? metadata.name.trim() : "",
    typeof metadata?.full_name === "string" ? metadata.full_name.trim() : "",
    typeof metadata?.nickname === "string" ? metadata.nickname.trim() : ""
  ];

  const displayName = nameCandidates.find((value) => Boolean(value));
  if (displayName) return displayName;

  return "로그인 사용자";
}

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
    signInWithOAuthProvider,
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
  const [oauthLoadingProvider, setOauthLoadingProvider] = useState<"google" | "kakao" | null>(
    null
  );
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [doNotShowGuideAgain, setDoNotShowGuideAgain] = useState(false);
  const [guideOpenSections, setGuideOpenSections] = useState<string[]>(["about"]);

  const email = typeof user?.email === "string" ? user.email : "";
  const userDisplayLabel = getUserDisplayLabel(user);
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
        setAuthState(cooldownReason === "rateLimit" ? "rateLimited" : "cooldown");
      } else {
        setAuthState("idle");
      }
    }
  }, [authModalState, cooldownReason, cooldownSeconds, setAuthState, user]);

  useEffect(() => {
    void syncEmailCooldownFromStorage();
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
  }, [emailCooldownUntil, setAuthState, user]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const shouldLockScroll = isGuideOpen || isLoginModalOpen;
    if (!shouldLockScroll) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isGuideOpen, isLoginModalOpen]);

  function startEmailCooldown(seconds: number, reason: Exclude<CooldownReason, null>) {
    if (typeof window === "undefined") return;
    const safeSeconds =
      Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : AUTH_EMAIL_COOLDOWN_SECONDS;
    const until = Date.now() + safeSeconds * 1000;
    setCooldownReason(reason);
    setEmailCooldownUntil(until);
    setCooldownSeconds(safeSeconds);
    setAuthState(reason === "rateLimit" ? "rateLimited" : "cooldown");
    console.log(`[auth] cooldown reason: ${reason}`);
    try {
      window.localStorage.setItem(AUTH_EMAIL_COOLDOWN_KEY, String(until));
      window.localStorage.setItem(AUTH_EMAIL_COOLDOWN_REASON_KEY, reason);
    } catch {
      // localStorage may be blocked in restricted contexts.
    }
  }

  function clearEmailCooldown() {
    if (typeof window === "undefined") return;
    setEmailCooldownUntil(0);
    setCooldownSeconds(0);
    setCooldownReason(null);
    console.log("[auth] cooldown reason: none");
    try {
      window.localStorage.removeItem(AUTH_EMAIL_COOLDOWN_KEY);
      window.localStorage.removeItem(AUTH_EMAIL_COOLDOWN_REASON_KEY);
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
        reasonRaw === "rateLimit" || reasonRaw === "success" ? reasonRaw : null;

      if (!Number.isFinite(parsed) || parsed <= Date.now()) {
        clearEmailCooldown();
        return false;
      }

      if (!safeReason) {
        clearEmailCooldown();
        return false;
      }

      setCooldownReason(safeReason);
      setEmailCooldownUntil(parsed);
      setCooldownSeconds(Math.max(1, Math.ceil((parsed - Date.now()) / 1000)));
      console.log(`[auth] cooldown reason: ${safeReason}`);
      return true;
    } catch {
      clearEmailCooldown();
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
      const reasonRaw =
        typeof window !== "undefined" ? window.localStorage.getItem(AUTH_EMAIL_COOLDOWN_REASON_KEY) : null;
      const safeReason: CooldownReason =
        reasonRaw === "rateLimit" || reasonRaw === "success" ? reasonRaw : null;
      setAuthState(safeReason === "rateLimit" ? "rateLimited" : "cooldown");
    } else {
      setAuthState("idle");
    }
  }

  function handleOpenGuide() {
    setIsGuideOpen(true);
    setGuideOpenSections(["about"]);
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

  function toggleGuideSection(sectionId: string) {
    setGuideOpenSections((current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      if (safeCurrent.includes(sectionId)) {
        return safeCurrent.filter((id) => id !== sectionId);
      }
      return [...safeCurrent, sectionId];
    });
  }

  function handleContinueLocalMode() {
    setIsLoginModalOpen(false);
    setModalNotice("");
    setOtpCode("");
    setLoginStep("email");
    setAuthState("idle");
    setAuthNotice("로컬 모드로 계속 사용합니다.");
  }

  function handleResetCooldown() {
    clearEmailCooldown();
    setAuthState("idle");
    setModalNotice("인증코드 전송 대기 상태로 초기화되었습니다.");
  }

  async function handleSendOtpCode() {
    if (user) {
      setAuthState("loggedIn");
      return;
    }
    if (cooldownSeconds > 0 || authModalState === "sending") {
      return;
    }
    console.log("[auth] send otp clicked");
    console.log(`[auth] supabase url: ${supabaseUrl || "(empty)"}`);
    setModalNotice("");
    setAuthState("sending");
    try {
      const result = await sendEmailOtpCode(loginEmail);
      console.log(`[auth] response status: ${result.statusCode ?? 0}`);
      if (!result.ok) {
        const rawMessage = result.message ?? "인증코드 요청에 실패했습니다.";
        console.log(`[auth] supabase response status/error: ${result.statusCode ?? 0} ${rawMessage}`);
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
          startEmailCooldown(AUTH_EMAIL_RATE_LIMIT_COOLDOWN_SECONDS, "rateLimit");
        } else {
          clearEmailCooldown();
          setAuthState("error");
        }
        return;
      }

      const successMessage = result.message ?? "인증코드를 이메일로 보냈습니다.";
      setModalNotice(successMessage);
      setAuthNotice(successMessage);
      setAuthState("sent");
      setLoginStep("code");
      startEmailCooldown(AUTH_EMAIL_COOLDOWN_SECONDS, "success");
    } catch {
      console.log("[auth] supabase response status/error: network");
      const message = "Supabase 연결에 실패했습니다. 네트워크를 확인해주세요.";
      setModalNotice(message);
      setAuthNotice(message);
      clearEmailCooldown();
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

  async function handleOAuthLogin(provider: "google" | "kakao") {
    if (user) {
      setAuthState("loggedIn");
      return;
    }
    if (oauthLoadingProvider) return;
    console.log(`[auth] oauth provider: ${provider}`);
    setModalNotice("");
    setOauthLoadingProvider(provider);
    try {
      const result = await signInWithOAuthProvider(provider);
      if (!result.ok) {
        const isConfigMessage =
          result.message === "소셜 로그인 설정을 확인해주세요." ||
          result.message === "카카오 로그인 설정을 확인해주세요.";
        const message: string =
          isConfigMessage
            ? result.message ?? "소셜 로그인 설정을 확인해주세요."
            : "소셜 로그인에 실패했습니다. 다시 시도해주세요.";
        setModalNotice(message);
        setAuthNotice(message);
        return;
      }
      setModalNotice("소셜 로그인 페이지로 이동합니다.");
    } catch {
      const message = "소셜 로그인에 실패했습니다. 다시 시도해주세요.";
      setModalNotice(message);
      setAuthNotice(message);
    } finally {
      setOauthLoadingProvider(null);
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
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-2 px-3 py-2 sm:px-6 lg:px-8">
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
        <div className="flex min-w-0 items-center justify-end gap-2">
          <Link
            href="/#home-search"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-slate-50 text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200 md:hidden"
            aria-label="검색"
            title="검색"
          >
            <Search className="h-4 w-4" />
          </Link>
          {user ? (
            <>
              <Link
                href="/mypage"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-slate-50 text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200 md:hidden"
                aria-label="내 계정"
                title="내 계정"
              >
                <UserCircle2 className="h-4 w-4" />
              </Link>
              <div className="hidden max-w-[260px] items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 md:inline-flex">
                <span className="truncate">{userDisplayLabel}</span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="rounded-md border border-line bg-white px-2 py-1 text-[11px] font-bold text-slate-600 hover:text-brand dark:border-dark-line dark:bg-slate-900 dark:text-slate-300"
                >
                  로그아웃
                </button>
              </div>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleOpenLogin}
                data-auth-login-trigger="true"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-line bg-slate-50 text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-slate-400 dark:border-dark-line dark:bg-dark-panel dark:text-slate-200 dark:disabled:text-slate-500 md:h-9 md:w-auto md:px-3"
              >
                <span className="md:hidden">
                  <UserCircle2 className="h-4 w-4" />
                </span>
                <span className="hidden md:inline">로그인</span>
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
            className="hidden h-9 items-center justify-center rounded-lg border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200 md:inline-flex"
          >
            사용 가이드
          </button>
          <Link
            href="/pricing"
            className="hidden h-9 items-center justify-center rounded-lg border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200 md:inline-flex"
          >
            요금제
          </Link>
          <Link
            href="/portfolio"
            className="hidden items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 md:inline-flex"
          >
            <BriefcaseBusiness className="h-4 w-4 text-brand" />
            <span>내 보유종목</span>
          </Link>
          <Link
            href="/mypage"
            className="hidden items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 md:inline-flex"
          >
            <UserCircle2 className="h-4 w-4 text-brand" />
            <span>내 계정</span>
          </Link>
          <div className="hidden md:block">
            <ThemeToggle />
          </div>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4 py-4"
          onClick={() => setIsLoginModalOpen(false)}
        >
          <div
            className="w-[calc(100vw-32px)] max-w-[420px] max-h-[85vh] overflow-y-auto rounded-xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-bold tracking-normal text-brand">로그인</p>
                <h3 className="mt-1 text-base font-bold text-ink dark:text-white">이메일 인증 로그인</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsLoginModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-slate-50 text-slate-500 hover:text-slate-700 dark:border-dark-line dark:bg-slate-900 dark:text-slate-300"
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
                <p className="mt-1 break-all">{userDisplayLabel}</p>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-2 inline-flex h-11 items-center justify-center rounded-md border border-emerald-300 bg-white px-3 text-xs font-bold text-emerald-700 hover:text-emerald-800 dark:border-emerald-800 dark:bg-slate-900 dark:text-emerald-200"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <>
                <section className="mt-3">
                  <p className="text-xs font-bold text-ink dark:text-white">간편 로그인</p>
                  <div className="mt-2 grid gap-2">
                    <button
                      type="button"
                      onClick={() => void handleOAuthLogin("google")}
                      disabled={Boolean(oauthLoadingProvider) || authModalState === "sending"}
                      className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-slate-400 dark:border-dark-line dark:bg-slate-950 dark:text-slate-200 dark:disabled:text-slate-500"
                    >
                      {oauthLoadingProvider === "google"
                        ? "Google 로그인 연결 중..."
                        : "Google로 계속하기"}
                    </button>
                    <button
                      type="button"
                      disabled={true}
                      className="inline-flex h-11 w-full items-center justify-center rounded-md border border-yellow-300 bg-[#FEE500] px-3 text-sm font-bold text-[#3C1E1E] opacity-60 disabled:cursor-not-allowed"
                    >
                      Kakao 로그인 준비 중
                    </button>
                  </div>
                  <p className="mt-2 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
                    Kakao 로그인은 이메일 권한 설정 후 제공될 예정입니다.
                  </p>
                </section>

                <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  또는 이메일 인증코드로 로그인
                </p>

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
                      이메일 인증코드
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      maxLength={8}
                      value={otpCode}
                      onChange={(event) =>
                        setOtpCode(event.target.value.replace(/[^0-9]/g, "").slice(0, 8))
                      }
                      placeholder="6~8자리 숫자 코드 입력"
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
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  쿨다운 상태: {cooldownReason ?? "없음"}
                </p>
                <button
                  type="button"
                  onClick={() => void handleSendOtpCode()}
                  disabled={authModalState === "sending" || cooldownSeconds > 0}
                  className="mt-3 inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
                >
                  <Mail className="h-4 w-4" />
                  {authModalState === "sending"
                    ? "전송 중..."
                    : cooldownSeconds > 0
                      ? cooldownReason === "rateLimit"
                        ? `3분 후 다시 시도 · ${cooldownSeconds}초`
                        : `다시 보내기까지 ${cooldownSeconds}초`
                      : loginStep === "code"
                        ? "인증코드 다시 보내기"
                        : "인증코드 보내기"}
                </button>
                {loginStep === "code" && (
                  <button
                    type="button"
                    onClick={() => void handleVerifyOtpCode()}
                    disabled={authModalState === "sending"}
                    className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand disabled:cursor-not-allowed disabled:text-slate-400 dark:border-dark-line dark:bg-slate-950 dark:text-slate-200 dark:disabled:text-slate-500"
                  >
                    {authModalState === "sending" ? "확인 중..." : "인증코드 확인"}
                  </button>
                )}
              </>
            )}
            <button
              type="button"
              onClick={handleContinueLocalMode}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
            >
              클라우드 로그인 없이 계속 사용
            </button>
            <button
              type="button"
              onClick={handleOpenGuide}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200 md:hidden"
            >
              사용 가이드 보기
            </button>
            <button
              type="button"
              onClick={handleResetCooldown}
              className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-dashed border-line bg-transparent px-2 text-[11px] font-semibold text-slate-500 hover:text-brand dark:border-dark-line dark:text-slate-400"
            >
              쿨다운 초기화
            </button>
          </div>
        </div>
      )}
      {isGuideOpen && (
        <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 px-3 py-3 md:items-center md:px-4">
          <div className="flex max-h-[85vh] w-full max-w-2xl max-w-full flex-col overflow-hidden rounded-t-xl border border-line bg-white shadow-soft dark:border-dark-line dark:bg-dark-panel md:rounded-xl">
            <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3 dark:border-dark-line sm:px-5">
              <div className="min-w-0">
                <p className="text-xs font-bold tracking-normal text-brand">사용 가이드</p>
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

            <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4 sm:px-5">
              {(Array.isArray(GUIDE_SECTIONS) ? GUIDE_SECTIONS : []).map((section) => {
                const isOpen = (Array.isArray(guideOpenSections) ? guideOpenSections : []).includes(
                  section.id
                );
                return (
                  <section
                    key={section.id}
                    className="rounded-lg border border-line bg-slate-50 dark:border-dark-line dark:bg-slate-900"
                  >
                    <button
                      type="button"
                      onClick={() => toggleGuideSection(section.id)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left"
                    >
                      <h4 className="text-sm font-bold text-ink dark:text-white">{section.title}</h4>
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
                        {isOpen ? "접기" : "열기"}
                      </span>
                    </button>
                    {isOpen ? (
                      <div className="border-t border-line px-3 py-3 text-xs leading-6 text-slate-600 dark:border-dark-line dark:text-slate-300">
                        <p>{section.description}</p>
                        {Array.isArray(section.bullets) && section.bullets.length > 0 ? (
                          <ul className="mt-1 space-y-1">
                            {section.bullets.map((bullet) => (
                              <li key={`${section.id}-${bullet}`}>- {bullet}</li>
                            ))}
                          </ul>
                        ) : null}
                      </div>
                    ) : null}
                  </section>
                );
              })}

              <section className="rounded-lg border border-amber-200 bg-amber-50 p-3 dark:border-amber-900/60 dark:bg-amber-950/40">
                <p className="text-xs leading-6 text-amber-900 dark:text-amber-200">
                  이 서비스는 투자 참고 정보이며, 매수/매도 추천이 아닙니다. 투자 결정은 본인의 판단과
                  책임입니다.
                </p>
              </section>
            </div>

            <div className="shrink-0 border-t border-line px-4 py-3 dark:border-dark-line sm:px-5">
              <div className="mt-1 flex flex-col gap-2 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setDoNotShowGuideAgain((prev) => !prev)}
                  className={`inline-flex h-10 w-full items-center justify-center rounded-md border px-4 text-sm font-semibold sm:w-auto ${
                    doNotShowGuideAgain
                      ? "border-brand bg-blue-50 text-brand dark:bg-blue-950/30"
                      : "border-line bg-white text-slate-700 dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
                  }`}
                >
                  다시 보지 않기
                </button>
                <button
                  type="button"
                  onClick={handleCloseGuide}
                  className="inline-flex h-10 w-full items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200 sm:w-auto"
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
