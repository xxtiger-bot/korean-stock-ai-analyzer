"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Copy,
  Flame,
  Gift,
  MessageSquareText,
  RefreshCcw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";

type MissionActionType = "link" | "feedback";

type Mission = {
  id: string;
  title: string;
  description: string;
  buttonText: string;
  actionType: MissionActionType;
  href?: string;
};

type FeedbackCategory = "사용성" | "데이터" | "로그인" | "모바일" | "기능 제안" | "기타";

const MISSION_STORAGE_KEY = "krx_beta_test_mission";
const REF_STORAGE_KEY = "krx_referral_code";

const missions: Mission[] = [
  {
    id: "search",
    title: "종목 검색하기",
    description: "관심 있는 한국 주식을 검색해보세요.",
    buttonText: "검색하러 가기",
    actionType: "link",
    href: "/#search"
  },
  {
    id: "ai-analysis",
    title: "AI 분석 확인하기",
    description: "삼성전자 예시로 AI 분석 구조를 확인해보세요.",
    buttonText: "예시 보기",
    actionType: "link",
    href: "/stocks/005930"
  },
  {
    id: "watchlist",
    title: "관심종목 추가하기",
    description: "관심종목을 추가하고 추적해보세요.",
    buttonText: "관심종목 보기",
    actionType: "link",
    href: "/stocks/005930"
  },
  {
    id: "portfolio",
    title: "보유종목 등록하기",
    description: "보유종목을 등록하면 리스크 변화를 추적할 수 있습니다.",
    buttonText: "보유종목 등록",
    actionType: "link",
    href: "/portfolio"
  },
  {
    id: "feedback",
    title: "피드백 남기기",
    description: "불편한 점과 개선 의견을 알려주세요.",
    buttonText: "피드백 보내기",
    actionType: "feedback"
  }
];

const betaFeatureCards = [
  {
    icon: BarChart3,
    title: "오늘의 AI 주식 브리핑",
    body: "매일 먼저 확인할 종목과 리스크 포인트를 짧게 정리합니다."
  },
  {
    icon: Target,
    title: "관심/보유 종목 리스크 레이더",
    body: "관심/보유 종목 기준으로 우선 확인 대상을 빠르게 볼 수 있습니다."
  },
  {
    icon: Sparkles,
    title: "AI 매매 근거",
    body: "추세, 기술지표, 데이터 기준을 함께 보며 보조 분석을 확인할 수 있습니다."
  },
  {
    icon: ShieldCheck,
    title: "가격 출처 확인",
    body: "현재가와 최근 종가 기준을 구분해 표시하며, 데이터 상태를 함께 확인할 수 있습니다."
  },
  {
    icon: Copy,
    title: "공유 카드",
    body: "브리핑과 리스크 요약을 복사해 팀원이나 지인과 간단히 공유할 수 있습니다."
  },
  {
    icon: Gift,
    title: "Pro Beta 기능 안내",
    body: "Free와 Pro 차이, 리스크 추적 범위, 베타 체험 안내를 미리 확인할 수 있습니다."
  }
] as const;

const testerProfiles = [
  {
    icon: Star,
    title: "관심종목 중심 사용자",
    body: "한국 주식을 관심종목으로 관리하며 빠르게 확인하고 싶은 사용자에게 적합합니다."
  },
  {
    icon: Flame,
    title: "리스크 점검 우선 사용자",
    body: "매일 종목 리스크를 짧은 시간 안에 먼저 확인하고 싶은 사용자에게 맞습니다."
  },
  {
    icon: Target,
    title: "직접 판단하는 투자자",
    body: "AI 분석을 참고하되 최종 판단은 직접 내리는 투자자에게 잘 맞습니다."
  },
  {
    icon: Gift,
    title: "초기 Pro 관심 사용자",
    body: "Pro 기능과 베타 체험 흐름을 미리 확인해보고 싶은 초기 사용자에게 적합합니다."
  }
] as const;

const betaNotices = [
  "현재 베타 단계입니다.",
  "일부 데이터는 지연되거나 제공되지 않을 수 있습니다.",
  "AI 분석은 투자 조언이 아닙니다.",
  "최종 투자 판단은 사용자 본인의 책임입니다."
] as const;

function readMissionState(): Record<string, boolean> {
  if (typeof window === "undefined") {
    return {};
  }
  try {
    const raw = window.localStorage.getItem(MISSION_STORAGE_KEY);
    if (!raw) {
      return {};
    }
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") {
      return {};
    }
    const next: Record<string, boolean> = {};
    for (const mission of missions) {
      next[mission.id] = Boolean((parsed as Record<string, unknown>)[mission.id]);
    }
    return next;
  } catch {
    return {};
  }
}

function writeMissionState(next: Record<string, boolean>) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore localStorage write failure.
  }
}

function createFeedbackId() {
  return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ActionLinkButton({ href, text }: { href: string; text: string }) {
  return (
    <Link
      href={href}
      className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900 sm:text-sm"
    >
      {text}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

export default function BetaPage() {
  const [missionState, setMissionState] = useState<Record<string, boolean>>({});
  const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
  const [feedbackEmail, setFeedbackEmail] = useState("");
  const [feedbackCategory, setFeedbackCategory] = useState<FeedbackCategory>("사용성");
  const [feedbackRating, setFeedbackRating] = useState(5);
  const [feedbackMessage, setFeedbackMessage] = useState("");
  const [feedbackStatus, setFeedbackStatus] = useState("");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [refNotice, setRefNotice] = useState(false);

  useEffect(() => {
    setMissionState(readMissionState());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    if (!ref) {
      return;
    }
    const safeRef = ref.trim();
    if (!safeRef) {
      return;
    }
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(REF_STORAGE_KEY, safeRef);
      } catch {
        // ignore storage failure
      }
    }
    setRefNotice(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.title = "KRX Insight 베타 테스트 | Korean Stock AI Analyzer";
    const desc =
      "한국 주식 AI 분석, 오늘 시장 브리핑, 보유종목 리스크 진단을 무료로 테스트할 수 있는 KRX Insight 베타 페이지";
    const existing = document.querySelector('meta[name="description"]');
    if (existing) {
      existing.setAttribute("content", desc);
      return;
    }
    const meta = document.createElement("meta");
    meta.setAttribute("name", "description");
    meta.setAttribute("content", desc);
    document.head.appendChild(meta);
  }, []);

  useEffect(() => {
    async function hydrateUserEmail() {
      if (!supabase) {
        return;
      }
      try {
        const {
          data: { user }
        } = await supabase.auth.getUser();
        if (typeof user?.email === "string") {
          setFeedbackEmail(user.email);
        }
      } catch {
        // ignore
      }
    }
    void hydrateUserEmail();
  }, []);

  const completedCount = useMemo(
    () => missions.reduce((acc, mission) => (missionState[mission.id] ? acc + 1 : acc), 0),
    [missionState]
  );
  const totalCount = missions.length;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const progressPercent = Math.max(0, Math.min(100, Math.round((completedCount / totalCount) * 100)));
  const allComplete = completedCount === totalCount;

  function toggleMission(id: string) {
    setMissionState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeMissionState(next);
      return next;
    });
  }

  function resetMissionState() {
    const next: Record<string, boolean> = {};
    writeMissionState(next);
    setMissionState(next);
  }

  function openFeedbackModal() {
    setFeedbackStatus("");
    setIsFeedbackOpen(true);
  }

  async function submitFeedback() {
    if (feedbackSubmitting) {
      return;
    }

    const safeMessage = feedbackMessage.trim();
    if (!safeMessage) {
      setFeedbackStatus("메시지를 입력해주세요.");
      return;
    }

    if (!Number.isFinite(feedbackRating) || feedbackRating < 1 || feedbackRating > 5) {
      setFeedbackStatus("만족도는 1부터 5 사이로 입력해주세요.");
      return;
    }

    if (!supabase) {
      setFeedbackStatus("피드백 기능이 아직 설정되지 않았습니다.");
      return;
    }

    setFeedbackSubmitting(true);
    setFeedbackStatus("피드백을 전송 중입니다...");

    try {
      const {
        data: { user }
      } = await supabase.auth.getUser();

      const { error } = await supabase.from("user_feedback").insert({
        id: createFeedbackId(),
        user_id: user?.id ?? null,
        email: feedbackEmail.trim() || user?.email || null,
        page: "/beta",
        rating: feedbackRating,
        category: feedbackCategory,
        message: safeMessage
      });

      if (error) {
        setFeedbackStatus("피드백 제출에 실패했습니다. 잠시 후 다시 시도해주세요.");
        setFeedbackSubmitting(false);
        return;
      }

      setFeedbackStatus("피드백이 접수되었습니다. 감사합니다.");
      setFeedbackMessage("");
      setFeedbackSubmitting(false);
    } catch {
      setFeedbackStatus("피드백 제출에 실패했습니다. 잠시 후 다시 시도해주세요.");
      setFeedbackSubmitting(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
      <div className="space-y-4">
        {refNotice ? (
          <section className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand dark:border-brand/40 dark:bg-brand/15">
            초대 링크로 방문했습니다. 로그인하면 초대한 사용자에게 Pro 리워드가 지급됩니다.
          </section>
        ) : null}

        <section className="rounded-2xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 p-5 shadow-soft dark:border-dark-line dark:from-dark-panel dark:via-slate-900/70 dark:to-slate-950 sm:p-6">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                <Flame className="h-3.5 w-3.5" />
                Beta Program
              </p>
              <h1 className="mt-3 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
                KRX Insight 베타 테스트
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200 sm:text-base">
                매일 아침, AI가 내 한국 주식 리스크를 체크하는 AI 투자 보조 도구를 먼저
                사용해보세요.
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
                관심종목과 우선 확인 종목을 중심으로 하루 시작 전 빠르게 점검할 수 있습니다.
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {["오늘 시장 브리핑", "AI 종목 분석", "보유종목 리스크 추적"].map((badge) => (
                  <span
                    key={badge}
                    className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200"
                  >
                    {badge}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link
                  href="/"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
                >
                  <Rocket className="h-4 w-4" />
                  무료로 테스트 시작하기
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <Gift className="h-4 w-4" />
                  Pro Beta 보기
                </Link>
                <Link
                  href="/disclaimer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <ShieldCheck className="h-4 w-4" />
                  투자 유의사항 보기
                </Link>
                <button
                  type="button"
                  onClick={openFeedbackModal}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <MessageSquareText className="h-4 w-4" />
                  피드백 보내기
                </button>
              </div>
            </div>

            <aside className="rounded-2xl border border-line bg-white/90 p-4 dark:border-dark-line dark:bg-slate-900/70">
              <p className="text-xs font-bold text-brand">제품 미리보기</p>
              <h2 className="mt-1 text-sm font-bold text-ink dark:text-white">오늘 시장 브리핑</h2>

              <div className="mt-3 rounded-xl border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">시장 방향</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    관망
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {["삼성전자", "SK하이닉스", "NAVER"].map((name, idx) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-2.5 py-2 text-xs dark:bg-slate-900/70"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                      <span className="text-[11px] font-bold text-slate-500">TOP {idx + 1}</span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/70">
                  <div className="flex items-end gap-1.5">
                    {[26, 38, 31, 44, 36, 48].map((h, index) => (
                      <div
                        key={`bar-${index}`}
                        className="w-3 rounded-sm bg-brand/80"
                        style={{ height: `${h}px` }}
                      />
                    ))}
                  </div>
                  <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    리스크 변화: 유지 관찰
                  </p>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  데이터 기준: KIS + data.go.kr
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">테스트 가능한 기능</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            베타 테스트에서 직접 확인할 수 있는 핵심 기능입니다.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-ink dark:text-white">오늘 시장 브리핑</h3>
                  <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-bold text-mint">
                    관망
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  시장 방향 + 한 줄 브리핑 + TOP 3
                </p>
                <div className="mt-2 space-y-1.5">
                  {["삼성전자", "SK하이닉스", "NAVER"].map((name) => (
                    <div
                      key={name}
                      className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                    >
                      {name}
                    </div>
                  ))}
                </div>
              </div>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">
                KOSPI/KOSDAQ 흐름과 오늘 먼저 확인할 종목을 요약합니다.
              </p>
            </article>

            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                <h3 className="text-sm font-bold text-ink dark:text-white">AI 종목 분석</h3>
                <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  삼성전자 · 005930
                </p>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full w-[72%] rounded-full bg-brand" />
                </div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {["기술지표", "리스크", "관찰 포인트"].map((chip) => (
                    <span
                      key={chip}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">
                기술지표, 수급, 리스크 포인트를 참고용으로 정리합니다.
              </p>
            </article>

            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                <h3 className="text-sm font-bold text-ink dark:text-white">보유종목 리스크 진단</h3>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <div className="rounded-md bg-slate-50 p-2 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    수익률 +2.4%
                  </div>
                  <div className="rounded-md bg-slate-50 p-2 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200">
                    리스크 변화 유지
                  </div>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  알림 조건 근접 항목 확인
                </p>
              </div>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">
                내 보유종목의 수익률, 알림 조건, 리스크 변화를 추적합니다.
              </p>
            </article>

            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                <h3 className="text-sm font-bold text-ink dark:text-white">관심종목 클라우드 동기화</h3>
                <div className="mt-2 space-y-1.5">
                  {["삼성전자", "NAVER", "LG화학"].map((name) => (
                    <div
                      key={name}
                      className="rounded-md bg-slate-50 px-2 py-1 text-xs font-semibold text-slate-700 dark:bg-slate-900/70 dark:text-slate-200"
                    >
                      {name}
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  로그인 후 동기화 · 여러 기기에서 확인 가능
                </p>
              </div>
              <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-300">
                로그인 후 관심종목을 여러 기기에서 확인할 수 있습니다.
              </p>
            </article>

            {betaFeatureCards.slice(3).map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45"
                >
                  <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                    <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
                      <Icon className="h-4.5 w-4.5" />
                    </div>
                    <h3 className="mt-3 text-sm font-bold text-ink dark:text-white">{card.title}</h3>
                    <p className="mt-2 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                      {card.body}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">5분 테스트 미션</h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                아래 5가지만 확인하면 KRX Insight의 핵심 기능을 빠르게 테스트할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={resetMissionState}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-dark-line dark:text-slate-300 dark:hover:bg-slate-900/70"
            >
              <RefreshCcw className="h-4 w-4" />
              진행 상황 초기화
            </button>
          </div>

          <div className="mt-4 rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/55">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-bold text-ink dark:text-white">
                {completedCount}/{totalCount} 완료
              </p>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                남은 미션 {remainingCount}개
              </p>
            </div>
            <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-brand transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <div className="mt-4 grid gap-3">
            {missions.map((mission, index) => {
              const done = Boolean(missionState[mission.id]);
              return (
                <article
                  key={mission.id}
                  className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      aria-label={`${mission.title} 완료 체크`}
                      aria-pressed={done}
                      onClick={() => toggleMission(mission.id)}
                      className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition ${
                        done
                          ? "border-brand bg-brand text-white"
                          : "border-slate-300 bg-white text-transparent hover:border-brand dark:border-slate-600 dark:bg-slate-900"
                      }`}
                    >
                      <Check className="h-4 w-4" />
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">
                          STEP {index + 1}
                        </p>
                        {done ? (
                          <span className="rounded-full bg-mint/15 px-2 py-0.5 text-[11px] font-bold text-mint">
                            완료
                          </span>
                        ) : null}
                      </div>
                      <h3 className="mt-0.5 text-sm font-bold text-ink dark:text-white sm:text-base">
                        {mission.title}
                      </h3>
                      <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                        {mission.description}
                      </p>
                    </div>

                    {mission.actionType === "feedback" ? (
                      <button
                        type="button"
                        onClick={openFeedbackModal}
                        className="inline-flex h-11 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900 sm:text-sm"
                      >
                        {mission.buttonText}
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    ) : (
                      <ActionLinkButton href={mission.href ?? "/"} text={mission.buttonText} />
                    )}
                  </div>
                </article>
              );
            })}
          </div>

          {allComplete ? (
            <div className="mt-4 rounded-xl border border-mint/40 bg-mint/10 p-4">
              <h3 className="text-base font-bold text-ink">베타 테스트 미션 완료!</h3>
              <p className="mt-1 text-sm text-slate-700">
                피드백을 남겨주시면 제품 개선에 큰 도움이 됩니다.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={openFeedbackModal}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                >
                  <MessageSquareText className="h-4 w-4" />
                  피드백 보내기
                </button>
                <Link
                  href="/pricing#pro"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Gift className="h-4 w-4" />
                  Pro 알림 신청
                </Link>
                <Link
                  href="/mypage"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Copy className="h-4 w-4" />
                  친구에게 공유하기
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">
            이런 분께 적합합니다
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {testerProfiles.map((card) => {
              const Icon = card.icon;
              return (
                <article
                  key={card.title}
                  className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45"
                >
                  <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    <Icon className="h-4.5 w-4.5" />
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold text-ink dark:text-white sm:text-base">
                    {card.title}
                  </h3>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{card.body}</p>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">
            테스트 시 유의사항
          </h2>
          <div className="mt-4 grid gap-3">
            {betaNotices.map((notice, index) => (
              <article
                key={notice}
                className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45"
              >
                <div className="flex items-start gap-3">
                  <div className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
                    {index === 0 ? (
                      <BadgeCheck className="h-4.5 w-4.5" />
                    ) : index === 1 ? (
                      <BarChart3 className="h-4.5 w-4.5" />
                    ) : index === 2 ? (
                      <ShieldCheck className="h-4.5 w-4.5" />
                    ) : (
                      <CheckCircle2 className="h-4.5 w-4.5" />
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                    {notice}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">베타 참여 혜택</h2>
          <ul className="mt-3 space-y-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">
            <li>- 친구를 초대하면 Pro 3일 체험권을 받을 수 있습니다.</li>
            <li>- 좋은 피드백은 정식 출시 기능 개선에 우선 반영됩니다.</li>
            <li>- Pro 알림 신청자는 정식 출시 소식을 먼저 받을 수 있습니다.</li>
          </ul>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/mypage"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Star className="h-4 w-4" />
              내 초대 링크 보기
            </Link>
            <Link
              href="/pricing#pro"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
            >
              <Gift className="h-4 w-4" />
              Pro 알림 신청
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-brand/25 bg-gradient-to-r from-white to-blue-50 p-5 shadow-soft dark:border-brand/35 dark:from-dark-panel dark:to-slate-900 sm:p-6">
          <h2 className="text-xl font-bold text-ink dark:text-white">지금 KRX Insight를 테스트해보세요</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Daily AI Trading Desk, 리스크 레이더, AI 근거와 가격 출처를 직접 확인해보세요.
          </p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
            >
              <Search className="h-4 w-4" />
              무료로 테스트 시작하기
            </Link>
            <Link
              href="/pricing"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Gift className="h-4 w-4" />
              Pro Beta 보기
            </Link>
            <Link
              href="/disclaimer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <ShieldCheck className="h-4 w-4" />
              투자 유의사항 보기
            </Link>
            <button
              type="button"
              onClick={openFeedbackModal}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <MessageSquareText className="h-4 w-4" />
              피드백 보내기
            </button>
          </div>
        </section>
      </div>

      {isFeedbackOpen ? (
        <div
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/50 px-4 py-6"
          onClick={() => setIsFeedbackOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-ink dark:text-white">피드백 보내기</h3>
              <button
                type="button"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-line text-slate-600 hover:bg-slate-100 dark:border-dark-line dark:text-slate-300 dark:hover:bg-slate-900"
                onClick={() => setIsFeedbackOpen(false)}
                aria-label="닫기"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              테스트 경험을 남겨주시면 제품 개선에 반영하겠습니다.
            </p>

            <div className="mt-4 grid gap-3">
              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-500">이메일(선택)</span>
                <input
                  type="email"
                  value={feedbackEmail}
                  onChange={(event) => setFeedbackEmail(event.target.value)}
                  className="h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none ring-brand/40 transition focus:ring-2 dark:border-dark-line dark:bg-slate-900 dark:text-white"
                  placeholder="you@example.com"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold text-slate-500">만족도</span>
                  <input
                    type="number"
                    min={1}
                    max={5}
                    value={feedbackRating}
                    onChange={(event) => setFeedbackRating(Number(event.target.value))}
                    className="h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none ring-brand/40 transition focus:ring-2 dark:border-dark-line dark:bg-slate-900 dark:text-white"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-xs font-bold text-slate-500">카테고리</span>
                  <select
                    value={feedbackCategory}
                    onChange={(event) =>
                      setFeedbackCategory(event.target.value as FeedbackCategory)
                    }
                    className="h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink outline-none ring-brand/40 transition focus:ring-2 dark:border-dark-line dark:bg-slate-900 dark:text-white"
                  >
                    {["사용성", "데이터", "로그인", "모바일", "기능 제안", "기타"].map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <label className="grid gap-1.5">
                <span className="text-xs font-bold text-slate-500">메시지</span>
                <textarea
                  value={feedbackMessage}
                  onChange={(event) => setFeedbackMessage(event.target.value)}
                  className="min-h-28 rounded-lg border border-line bg-white px-3 py-2 text-sm text-ink outline-none ring-brand/40 transition focus:ring-2 dark:border-dark-line dark:bg-slate-900 dark:text-white"
                  placeholder="불편했던 점이나 개선 아이디어를 자유롭게 남겨주세요."
                />
              </label>
            </div>

            {feedbackStatus ? (
              <p className="mt-3 text-xs font-semibold text-slate-600 dark:text-slate-300">
                {feedbackStatus}
              </p>
            ) : null}

            <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setIsFeedbackOpen(false)}
                className="inline-flex h-11 items-center justify-center rounded-lg border border-line px-4 text-sm font-bold text-slate-700 hover:bg-slate-50 dark:border-dark-line dark:text-slate-200 dark:hover:bg-slate-900"
              >
                닫기
              </button>
              <button
                type="button"
                disabled={feedbackSubmitting}
                onClick={() => {
                  void submitFeedback();
                }}
                className="inline-flex h-11 items-center justify-center rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-brand dark:hover:bg-blue-500"
              >
                {feedbackSubmitting ? "전송 중..." : "피드백 제출"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
