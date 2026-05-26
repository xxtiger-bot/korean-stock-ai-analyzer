"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  BarChart3,
  Check,
  ChevronRight,
  Cloud,
  CloudOff,
  Gift,
  LineChart,
  Lock,
  MessageSquareText,
  RefreshCcw,
  Rocket,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  TrendingUp,
  Users
} from "lucide-react";
import { FeedbackTrigger } from "@/components/feedback-trigger";

type MissionAction = "link" | "feedback";

type Mission = {
  id: string;
  title: string;
  description: string;
  actionLabel: string;
  actionType: MissionAction;
  href?: string;
};

type PreviewCard = {
  title: string;
  description: string;
  mockLines: string[];
  tags: string[];
  href: string;
};

const MISSION_STORAGE_KEY = "krx_beta_test_mission";
const REF_STORAGE_KEY = "krx_referral_code";

const missions: Mission[] = [
  {
    id: "search",
    title: "종목 검색하기",
    description: "관심 있는 한국 주식을 검색해보세요.",
    actionLabel: "검색하러 가기",
    actionType: "link",
    href: "/#search"
  },
  {
    id: "ai-analysis",
    title: "AI 분석 확인하기",
    description: "삼성전자 예시로 AI 분석 구조를 확인해보세요.",
    actionLabel: "예시 보기",
    actionType: "link",
    href: "/stocks/005930"
  },
  {
    id: "watchlist",
    title: "관심종목 추가하기",
    description: "관심종목을 추가하고 추적해보세요.",
    actionLabel: "관심종목 보기",
    actionType: "link",
    href: "/stocks/005930"
  },
  {
    id: "portfolio",
    title: "보유종목 등록하기",
    description: "보유종목을 등록하면 리스크 변화를 추적할 수 있습니다.",
    actionLabel: "보유종목 등록",
    actionType: "link",
    href: "/portfolio"
  },
  {
    id: "feedback",
    title: "피드백 남기기",
    description: "불편한 점과 개선 의견을 알려주세요.",
    actionLabel: "피드백 보내기",
    actionType: "feedback"
  }
];

const previewCards: PreviewCard[] = [
  {
    title: "오늘 시장 브리핑",
    description: "시장 방향과 오늘 먼저 확인할 종목을 빠르게 파악합니다.",
    mockLines: ["시장 방향: 관망", "TOP 3: 삼성전자 · SK하이닉스 · NAVER", "리스크 변화: 유지 관찰"],
    tags: ["시장 요약", "TOP 3", "한 줄 브리핑"],
    href: "/"
  },
  {
    title: "AI 종목 분석",
    description: "기술지표와 리스크 포인트를 한 화면에서 확인합니다.",
    mockLines: ["삼성전자 · 005930", "AI 분석 점수: 74", "관찰 포인트: 거래량 재확인"],
    tags: ["AI 점수", "기술지표", "관찰 포인트"],
    href: "/stocks/005930"
  },
  {
    title: "보유종목 리스크 진단",
    description: "수익률과 리스크 변화를 바탕으로 보유 상태를 점검합니다.",
    mockLines: ["보유 건강 점수: 82", "리스크 변화: 하락", "알림 조건 근접: 1개"],
    tags: ["수익률", "리스크 변화", "알림 근접"],
    href: "/portfolio"
  },
  {
    title: "기회 레이더",
    description: "데이터 기반으로 오늘 눈여겨볼 후보를 정리합니다.",
    mockLines: ["거래량 이슈: 2종목", "추세 확인 필요: 3종목", "데이터 기준: KIS + data.go.kr"],
    tags: ["기회 레이더", "데이터 기반", "리스크 구분"],
    href: "/"
  },
  {
    title: "관심종목 동기화",
    description: "로그인 후 관심종목을 여러 기기에서 이어서 확인합니다.",
    mockLines: ["관심종목: 5개", "클라우드 동기화 상태: 정상", "로컬 모드 fallback 지원"],
    tags: ["클라우드", "멀티 디바이스", "fallback"],
    href: "/mypage"
  },
  {
    title: "AI 리포트 저장",
    description: "오늘의 분석 결과를 저장하고 다시 확인할 수 있습니다.",
    mockLines: ["오늘 리포트 저장: 1회", "최근 리포트: 3건", "리포트 공유: 복사/이미지"],
    tags: ["리포트", "저장", "공유"],
    href: "/portfolio#reports"
  }
];

const trustCards = [
  {
    icon: BarChart3,
    title: "데이터 출처",
    body: "KIS 현재가와 data.go.kr 일별 종가 데이터를 함께 참고합니다."
  },
  {
    icon: Target,
    title: "투자 참고 정보",
    body: "매수/매도 추천이 아니라 투자 판단을 돕는 참고 정보입니다."
  },
  {
    icon: Lock,
    title: "로컬 모드 우선",
    body: "로그인 없이도 주요 기능을 체험할 수 있으며, 데이터는 브라우저에 저장됩니다."
  },
  {
    icon: BadgeCheck,
    title: "베타 투명성",
    body: "현재 MVP 베타 단계이며 일부 데이터는 지연되거나 확인이 필요할 수 있습니다."
  }
] as const;

const userVoices = [
  {
    role: "베타 테스터",
    comment: "시장 브리핑이 짧고 명확해서 아침 점검 시간이 줄었습니다."
  },
  {
    role: "개인 투자자",
    comment: "보유종목 리스크 변화를 한눈에 볼 수 있어 관찰 흐름이 좋아졌습니다."
  }
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
    // localStorage 저장 실패 시에도 페이지 동작은 유지합니다.
  }
}

function ActionLinkButton({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900 sm:text-sm"
    >
      {label}
      <ChevronRight className="h-3.5 w-3.5" />
    </Link>
  );
}

function ScreenshotCard({ card }: { card: PreviewCard }) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
      <div className="rounded-xl border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400">UI PREVIEW</p>
          <span className="rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-bold text-brand">
            SCREEN
          </span>
        </div>
        <div className="mt-2 space-y-1.5">
          {card.mockLines.map((line) => (
            <div
              key={`${card.title}-${line}`}
              className="rounded-md border border-line bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
            >
              {line}
            </div>
          ))}
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div className="h-full w-[62%] rounded-full bg-brand" />
        </div>
      </div>
      <h3 className="mt-3 text-sm font-bold text-ink dark:text-white sm:text-base">{card.title}</h3>
      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{card.description}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {card.tags.map((tag) => (
          <span
            key={`${card.title}-${tag}`}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {tag}
          </span>
        ))}
      </div>
      <Link
        href={card.href}
        className="mt-3 inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900 sm:text-sm"
      >
        미리보기 열기
        <ChevronRight className="h-3.5 w-3.5" />
      </Link>
    </article>
  );
}

export default function BetaPage() {
  const [missionState, setMissionState] = useState<Record<string, boolean>>({});
  const [showRefNotice, setShowRefNotice] = useState(false);

  useEffect(() => {
    setMissionState(readMissionState());
    if (typeof window === "undefined") {
      return;
    }
    const params = new URLSearchParams(window.location.search);
    const ref = params.get("ref");
    const safeRef = typeof ref === "string" ? ref.trim() : "";
    if (!safeRef) {
      return;
    }
    try {
      window.localStorage.setItem(REF_STORAGE_KEY, safeRef);
    } catch {
      // localStorage 저장 실패는 무시합니다.
    }
    setShowRefNotice(true);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") {
      return;
    }
    document.title = "KRX Insight 베타 테스트 | Korean Stock AI Analyzer";
    const description =
      "한국 주식 AI 분석, 오늘 시장 브리핑, 보유종목 리스크 진단을 무료로 테스트할 수 있는 KRX Insight 베타 페이지";
    const meta = document.querySelector('meta[name="description"]');
    if (meta) {
      meta.setAttribute("content", description);
    } else {
      const created = document.createElement("meta");
      created.setAttribute("name", "description");
      created.setAttribute("content", description);
      document.head.appendChild(created);
    }
  }, []);

  const completedCount = useMemo(
    () => missions.reduce((acc, mission) => (missionState[mission.id] ? acc + 1 : acc), 0),
    [missionState]
  );
  const totalCount = missions.length;
  const remainingCount = Math.max(0, totalCount - completedCount);
  const progressPercent = Math.max(
    0,
    Math.min(100, Math.round((completedCount / totalCount) * 100))
  );
  const allComplete = completedCount === totalCount;

  function toggleMission(id: string) {
    setMissionState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      writeMissionState(next);
      return next;
    });
  }

  function resetMission() {
    const next: Record<string, boolean> = {};
    writeMissionState(next);
    setMissionState(next);
  }

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="space-y-6 sm:space-y-7">
        {showRefNotice ? (
          <section className="rounded-xl border border-brand/30 bg-brand/10 px-4 py-3 text-sm font-semibold text-brand dark:border-brand/40 dark:bg-brand/15">
            초대 링크로 방문했습니다. 로그인하면 초대한 사용자에게 Pro 리워드가 지급됩니다.
          </section>
        ) : null}

        <section className="rounded-3xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 p-5 shadow-soft dark:border-dark-line dark:from-dark-panel dark:via-slate-900/70 dark:to-slate-950 sm:p-7">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <div className="min-w-0">
              <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
                <Sparkles className="h-3.5 w-3.5" />
                Beta Program
              </p>
              <h1 className="mt-3 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-4xl">
                KRX Insight 베타 테스트
              </h1>
              <p className="mt-2 text-sm leading-6 text-slate-700 dark:text-slate-200 sm:text-base">
                한국 주식 AI 분석, 오늘 시장 브리핑, 보유종목 리스크 진단을 무료로 테스트해보세요.
              </p>
              <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:text-base">
                5분이면 관심종목 검색부터 AI 분석, 보유종목 리스크 점검까지 확인할 수 있습니다.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {["오늘 시장 브리핑", "AI 종목 분석", "보유종목 리스크 추적"].map((item) => (
                  <span
                    key={item}
                    className="inline-flex items-center rounded-full bg-white/90 px-3 py-1 text-xs font-bold text-slate-700 shadow-sm dark:bg-slate-800 dark:text-slate-200"
                  >
                    {item}
                  </span>
                ))}
              </div>

              <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
                <Link
                  href="/#search"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
                >
                  <Rocket className="h-4 w-4" />
                  지금 바로 무료 테스트 시작하기
                </Link>
                <Link
                  href="/stocks/005930"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
                >
                  <TrendingUp className="h-4 w-4" />
                  삼성전자 분석 예시 보기
                </Link>
                <FeedbackTrigger
                  label="피드백 보내기"
                  source="beta-hero"
                  className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
                />
              </div>
            </div>

            <aside className="rounded-2xl border border-line bg-white/90 p-4 shadow-soft dark:border-dark-line dark:bg-slate-900/70">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-brand">PRODUCT PREVIEW</p>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                  LIVE MOCKUP
                </span>
              </div>
              <h2 className="mt-2 text-sm font-bold text-ink dark:text-white">오늘 시장 브리핑</h2>

              <div className="mt-3 rounded-xl border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">시장 방향</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    관망
                  </span>
                </div>
                <div className="mt-3 space-y-2">
                  {["삼성전자", "SK하이닉스", "NAVER"].map((name, index) => (
                    <div
                      key={name}
                      className="flex items-center justify-between rounded-lg border border-line bg-slate-50 px-2.5 py-2 text-xs dark:border-dark-line dark:bg-slate-900/70"
                    >
                      <span className="font-semibold text-slate-700 dark:text-slate-200">{name}</span>
                      <span className="text-[11px] font-bold text-slate-500">TOP {index + 1}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg bg-slate-50 p-2.5 dark:bg-slate-900/70">
                  <div className="flex items-end gap-1.5">
                    {[24, 30, 26, 34, 28, 38].map((height, index) => (
                      <div
                        key={`preview-bar-${index}`}
                        className="w-3 rounded-sm bg-brand/85"
                        style={{ height: `${height}px` }}
                      />
                    ))}
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                    <span>리스크 변화: 유지 관찰</span>
                    <LineChart className="h-3.5 w-3.5" />
                  </div>
                </div>
                <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  데이터 기준: KIS + data.go.kr
                </p>
              </div>
            </aside>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">핵심 기능 미리보기</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              4~6개 핵심 화면
            </span>
          </div>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            베타 테스트에서 실제로 확인할 수 있는 주요 흐름을 먼저 살펴보세요.
          </p>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {previewCards.map((card) => (
              <ScreenshotCard key={card.title} card={card} />
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">5분 테스트 미션</h2>
              <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                아래 5가지만 완료하면 KRX Insight의 핵심 흐름을 빠르게 체험할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={resetMission}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-dark-line dark:text-slate-300 dark:hover:bg-slate-900/70"
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
                      <FeedbackTrigger
                        label={mission.actionLabel}
                        source="beta-mission"
                        className="inline-flex min-h-11 items-center justify-center gap-1 rounded-lg border border-line bg-white px-3 text-xs font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900 sm:text-sm"
                      />
                    ) : (
                      <ActionLinkButton href={mission.href ?? "/"} label={mission.actionLabel} />
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
                <FeedbackTrigger
                  label="피드백 보내기"
                  source="beta-mission-complete"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800"
                />
                <Link
                  href="/pricing#pro"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Gift className="h-4 w-4" />
                  Pro 알림 신청
                </Link>
                <Link
                  href="/mypage"
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  <Users className="h-4 w-4" />
                  친구에게 공유하기
                </Link>
              </div>
            </div>
          ) : null}
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">처음 사용 가이드</h2>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
            처음 방문했다면 아래 순서대로 진행하면 빠르게 적응할 수 있습니다.
          </p>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <p className="text-xs font-bold text-brand">STEP 1</p>
              <h3 className="mt-1 text-sm font-bold text-ink dark:text-white">종목 검색</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                관심 종목 코드를 검색하고 상세 화면에서 흐름을 확인하세요.
              </p>
            </article>
            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <p className="text-xs font-bold text-brand">STEP 2</p>
              <h3 className="mt-1 text-sm font-bold text-ink dark:text-white">보유종목 등록</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                매수가와 수량을 등록하면 리스크 변화 추적과 알림 점검이 가능합니다.
              </p>
            </article>
            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <p className="text-xs font-bold text-brand">STEP 3</p>
              <h3 className="mt-1 text-sm font-bold text-ink dark:text-white">피드백 전달</h3>
              <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                불편했던 지점을 피드백으로 남겨주시면 베타 개선에 빠르게 반영됩니다.
              </p>
            </article>
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">
            왜 믿고 테스트할 수 있나요?
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {trustCards.map((card) => {
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

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {userVoices.map((voice, index) => (
              <article
                key={`${voice.role}-${index}`}
                className="rounded-xl border border-line bg-white p-4 dark:border-dark-line dark:bg-slate-900/40"
              >
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{voice.role}</p>
                <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">“{voice.comment}”</p>
              </article>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">
            로컬 모드와 클라우드 동기화
          </h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <div className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                <CloudOff className="h-3.5 w-3.5" />
                로컬 모드
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                <li>- 로그인 없이 바로 사용</li>
                <li>- 브라우저에만 저장</li>
                <li>- 기기 변경 시 동기화 안 됨</li>
                <li>- 빠르게 체험하기 적합</li>
              </ul>
            </article>

            <article className="rounded-xl border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/45">
              <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-2.5 py-1 text-xs font-bold text-brand">
                <Cloud className="h-3.5 w-3.5" />
                클라우드 동기화
              </div>
              <ul className="mt-3 space-y-1.5 text-sm text-slate-600 dark:text-slate-300">
                <li>- 로그인 후 사용</li>
                <li>- 관심종목 / 보유종목 / 리포트 동기화</li>
                <li>- 여러 기기에서 확인 가능</li>
                <li>- 장기 사용에 적합</li>
              </ul>
            </article>
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
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Star className="h-4 w-4" />
              내 초대 링크 보기
            </Link>
            <Link
              href="/pricing#pro"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
            >
              <Gift className="h-4 w-4" />
              Pro 알림 신청
            </Link>
          </div>
        </section>

        <section className="rounded-2xl border border-brand/25 bg-gradient-to-r from-white to-blue-50 p-5 shadow-soft dark:border-brand/35 dark:from-dark-panel dark:to-slate-900 sm:p-6">
          <h2 className="text-xl font-bold text-ink dark:text-white">지금 KRX Insight를 테스트해보세요</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            5분이면 시장 브리핑, AI 분석, 보유종목 진단 흐름을 확인할 수 있습니다.
          </p>
          <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap">
            <Link
              href="/#search"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-ink px-5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
            >
              <Search className="h-4 w-4" />
              지금 바로 무료 테스트 시작하기
            </Link>
            <FeedbackTrigger
              label="피드백 보내기"
              source="beta-bottom-cta"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-200 dark:hover:bg-slate-900"
            />
          </div>
          <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
            이 페이지의 내용은 투자 참고를 위한 제품 소개이며, 매수/매도 추천이 아닙니다.
          </p>
        </section>
      </div>
    </main>
  );
}

