import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Beaker, Sparkles } from "lucide-react";
import { BetaReferralBanner } from "@/components/beta-referral-banner";
import { FeedbackTrigger } from "@/components/feedback-trigger";

const testerProfiles = [
  "한국 주식 투자자",
  "보유종목 관리가 필요한 사용자",
  "매일 시장 브리핑을 받고 싶은 사용자",
  "관심종목과 리스크 변화를 한눈에 보고 싶은 사용자"
];

const betaFeatures = [
  "오늘 시장 브리핑",
  "AI 종목 분석",
  "보유종목 진단",
  "리스크 변화 추적",
  "관심종목 클라우드 동기화",
  "AI 리포트 저장",
  "피드백 제출"
];

const howToUseSteps = [
  "관심종목 또는 보유종목 추가",
  "오늘 시장 브리핑과 AI 분석 확인",
  "피드백을 보내 개선에 참여"
];

export const metadata: Metadata = {
  title: "KRX Insight 베타 테스트 | Korean Stock AI Analyzer",
  description:
    "한국 주식 AI 분석, 보유종목 진단, 리스크 변화 추적을 테스트할 수 있는 KRX Insight 베타 페이지"
};

type BetaPageProps = {
  searchParams?: {
    ref?: string | string[];
  };
};

function firstQueryValue(value: string | string[] | undefined) {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : "";
  }
  return typeof value === "string" ? value : "";
}

export default function BetaPage({ searchParams }: BetaPageProps) {
  const referralCode = firstQueryValue(searchParams?.ref);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <section className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
          <Beaker className="h-3.5 w-3.5" />
          Beta Program
        </div>
        <h1 className="mt-3 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          KRX Insight 베타 테스트
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          한국 주식 AI 분석과 보유종목 리스크 진단을 테스트해보세요.
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          한국 주식 현재가, AI 분석, 보유종목 진단, 리스크 변화 추적을 한 곳에서 확인할 수 있는 투자 참고 도구입니다.
        </p>
        <BetaReferralBanner referralCode={referralCode} />
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            무료로 테스트하기
          </Link>
          <FeedbackTrigger
            label="피드백 보내기"
            source="beta-hero"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          />
          <Link
            href="/pricing#pro"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            Pro 알림 신청
          </Link>
        </div>
      </section>

      <section className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <h2 className="text-lg font-bold text-ink dark:text-white">테스트 대상</h2>
          <ul className="mt-3 grid gap-2">
            {testerProfiles.map((item) => (
              <li
                key={item}
                className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300"
              >
                {item}
              </li>
            ))}
          </ul>
        </article>

        <article className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <h2 className="text-lg font-bold text-ink dark:text-white">테스트 기능</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {betaFeatures.map((feature) => (
              <div
                key={feature}
                className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300"
              >
                {feature}
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-lg font-bold text-ink dark:text-white">사용 방법</h2>
        <ol className="mt-3 grid gap-2">
          {howToUseSteps.map((step, index) => (
            <li
              key={step}
              className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-300"
            >
              {index + 1}. {step}
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-soft dark:border-amber-900/60 dark:bg-amber-950/30 sm:p-6">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-amber-700 dark:text-amber-200" />
          <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">베타 테스트 안내</h2>
        </div>
        <p className="mt-3 text-sm font-semibold leading-6 text-amber-900 dark:text-amber-100">
          현재 KRX Insight는 MVP 베타 테스트 단계입니다.
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-amber-900 dark:text-amber-100">
          일부 데이터는 지연되거나 API 상태에 따라 확인이 필요할 수 있습니다.
        </p>
        <p className="mt-1 text-sm font-semibold leading-6 text-amber-900 dark:text-amber-100">
          이 서비스는 투자 참고 정보이며, 매수/매도 추천이 아닙니다.
        </p>
      </section>

      <section className="mt-4 rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-lg font-bold text-ink dark:text-white">지금 바로 베타 테스트에 참여해보세요</h2>
        <div className="mt-4 grid gap-2 sm:grid-cols-3">
          <Link
            href="/"
            className="inline-flex h-11 items-center justify-center gap-1 rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            지금 테스트하기
            <ArrowRight className="h-4 w-4" />
          </Link>
          <FeedbackTrigger
            label="피드백 보내기"
            source="beta-cta"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          />
          <Link
            href="/pricing#pro"
            className="inline-flex h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            요금제 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
