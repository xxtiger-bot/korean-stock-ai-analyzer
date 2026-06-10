import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Pricing | KRX Insight",
  description:
    "KRX Insight의 Free, Pro, Premium 플랜을 비교하고 베타 Pro 기능을 확인해보세요.",
};

type TierName = "Free" | "Pro" | "Premium";

type Plan = {
  name: TierName;
  badge: string;
  price: string;
  subprice: string;
  highlight?: string;
  description: string;
  features: string[];
  ctaLabel: string;
  ctaHref: string;
  emphasized?: boolean;
  disabled?: boolean;
};

type CompareRow = {
  feature: string;
  free: string;
  pro: string;
  premium: string;
};

const pageShellClass =
  "mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:px-8";
const cardShellClass =
  "rounded-2xl border border-line bg-white p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-line dark:bg-dark-panel";
const sectionTitleClass = "text-2xl font-semibold tracking-tight text-ink dark:text-white";
const sectionCopyClass = "text-sm leading-6 text-slate-600 dark:text-slate-300";

const valueCards = [
  {
    title: "어제보다 위험해진 종목을 바로 확인",
    description:
      "관심종목과 우선 확인 종목을 중심으로 리스크 상태를 먼저 정리해, 아침 체크 시간을 줄여드립니다.",
  },
  {
    title: "매수·보유·관망·감소 이유를 구조적으로 분석",
    description:
      "AI가 가격, 흐름, 데이터 기준을 함께 묶어 보여주어 단편적인 숫자보다 해석 가능한 근거를 제공합니다.",
  },
  {
    title: "오늘 시장 분위기와 우선 확인 종목을 30초 안에 정리",
    description:
      "일일 브리핑과 리스크 레이더를 통해 오늘 먼저 볼 종목과 보수적으로 볼 구간을 빠르게 파악할 수 있습니다.",
  },
] as const;

const plans: Plan[] = [
  {
    name: "Free",
    badge: "기본",
    price: "무료",
    subprice: "부담 없이 시작",
    description: "핵심 브리핑과 제한된 분석 횟수로 KRX Insight를 가볍게 체험할 수 있습니다.",
    features: [
      "관심종목 5개",
      "보유종목 3개",
      "일일 AI 분석 3회",
      "리스크 기록 최근 3일",
      "기본 AI 브리핑",
      "공유 카드 워터마크",
      "리스크 알림 미지원",
      "전체 매매 근거 제한",
    ],
    ctaLabel: "무료로 시작하기",
    ctaHref: "/",
  },
  {
    name: "Pro",
    badge: "추천",
    price: "월 9,900원",
    subprice: "연 99,000원",
    highlight: "연간 결제 시 약 2개월 무료",
    description: "매일 리스크를 추적하고 전체 AI 근거를 확인하려는 초기 사용자에게 맞춘 베타 Pro 플랜입니다.",
    features: [
      "관심종목 30개",
      "보유종목 20개",
      "일일 AI 분석 50회",
      "리스크 기록 최근 90일",
      "전체 AI 브리핑",
      "전체 매매 근거",
      "리스크 상승 알림",
      "워터마크 없는 공유 카드",
      "히스토리 리포트 저장",
    ],
    ctaLabel: "베타 Pro 체험 신청",
    ctaHref: "/pricing#beta-pro",
    emphasized: true,
  },
  {
    name: "Premium",
    badge: "준비 중",
    price: "월 29,000원",
    subprice: "Coming Soon",
    description: "여러 포트폴리오와 심화 분석을 원하는 사용자를 위한 차기 플랜입니다.",
    features: [
      "관심종목 100개",
      "보유종목 50개",
      "리스크 기록 365일",
      "다중 포트폴리오",
      "섹터/테마 레이더",
      "AI 종목 스크리너",
      "PDF 리포트 내보내기",
      "고급 수급 분석",
    ],
    ctaLabel: "출시 알림 받기",
    ctaHref: "/pricing#premium",
    disabled: true,
  },
];

const compareRows: CompareRow[] = [
  { feature: "관심종목", free: "5개", pro: "30개", premium: "100개" },
  { feature: "보유종목", free: "3개", pro: "20개", premium: "50개" },
  { feature: "일일 AI 분석", free: "3회", pro: "50회", premium: "제한 확대 예정" },
  { feature: "리스크 기록", free: "최근 3일", pro: "최근 90일", premium: "365일" },
  { feature: "AI 브리핑", free: "기본", pro: "전체", premium: "심화" },
  { feature: "매매 근거", free: "일부 제한", pro: "전체 확인", premium: "고급 분석 포함" },
  { feature: "리스크 알림", free: "미지원", pro: "상승 알림", premium: "고급 알림" },
  { feature: "공유 카드", free: "워터마크 포함", pro: "워터마크 제거", premium: "브랜드 커스텀 예정" },
  { feature: "리포트 저장", free: "미지원", pro: "히스토리 저장", premium: "PDF 내보내기" },
];

const faqs = [
  {
    question: "수익을 보장하나요?",
    answer:
      "아니요. KRX Insight는 리스크와 데이터 기준을 빠르게 정리해주는 보조 도구이며, 투자 수익을 보장하지 않습니다.",
  },
  {
    question: "AI 분석은 투자 조언인가요?",
    answer:
      "아니요. AI 분석은 참고 정보입니다. 최종 투자 판단은 항상 사용자 본인의 책임으로 이루어져야 합니다.",
  },
  {
    question: "데이터는 어디에서 가져오나요?",
    answer:
      "가격과 관련 기준 데이터는 KIS와 data.go.kr 기반 데이터를 참고합니다. 일부 데이터는 지연되거나 일시적으로 제한될 수 있습니다.",
  },
  {
    question: "Free와 Pro의 차이는 무엇인가요?",
    answer:
      "Pro는 더 많은 관심종목·보유종목 추적, 긴 리스크 기록, 전체 AI 근거, 리스크 상승 알림, 워터마크 없는 공유 기능을 제공합니다.",
  },
  {
    question: "언제 Pro로 업그레이드하는 것이 좋나요?",
    answer:
      "여러 종목을 매일 관리하거나, 리스크 상태를 장기적으로 추적하고 싶을 때 Pro가 더 적합합니다.",
  },
  {
    question: "결제는 언제 시작되나요?",
    answer:
      "현재는 베타 테스트 단계이며 실제 결제 기능은 아직 제공되지 않습니다. Pro 알림 신청은 정식 출시 안내를 위한 신청입니다.",
  },
] as const;

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex max-w-3xl flex-col gap-2">
      <h2 className={sectionTitleClass}>{title}</h2>
      <p className={sectionCopyClass}>{description}</p>
    </div>
  );
}

function PlanCard({ plan }: { plan: Plan }) {
  const buttonClass = plan.emphasized
    ? "bg-brand text-white shadow-lg shadow-brand/20 hover:bg-brand/90"
    : plan.disabled
      ? "bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500"
      : "bg-white text-ink hover:bg-slate-50 dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900";

  return (
    <article
      className={`${cardShellClass} flex h-full flex-col gap-5 ${
        plan.emphasized
          ? "border-brand/50 shadow-lg shadow-brand/10 dark:border-brand/40"
          : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <span
            className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
              plan.emphasized
                ? "bg-brand/10 text-brand"
                : plan.disabled
                  ? "bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400"
                  : "bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-300"
            }`}
          >
            {plan.badge}
          </span>
          <h3 className="text-xl font-semibold text-ink dark:text-white">{plan.name}</h3>
        </div>
        {plan.highlight ? (
          <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
            {plan.highlight}
          </span>
        ) : null}
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-semibold tracking-tight text-ink dark:text-white">{plan.price}</p>
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{plan.subprice}</p>
        <p className="pt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">{plan.description}</p>
      </div>

      <ul className="space-y-3 text-sm leading-6 text-slate-700 dark:text-slate-200">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-3">
            <span className="mt-1 h-2 w-2 rounded-full bg-brand/80" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      <Link
        href={plan.ctaHref}
        className={`mt-auto inline-flex min-h-12 items-center justify-center rounded-xl px-4 text-sm font-semibold transition ${buttonClass}`}
        aria-disabled={plan.disabled ? "true" : undefined}
      >
        {plan.ctaLabel}
      </Link>
    </article>
  );
}

function CompareCell({ children, emphasized = false }: { children: ReactNode; emphasized?: boolean }) {
  return (
    <td
      className={`px-4 py-4 text-sm leading-6 ${
        emphasized
          ? "font-semibold text-brand"
          : "text-slate-600 dark:text-slate-300"
      }`}
    >
      {children}
    </td>
  );
}

export default function PricingPage() {
  return (
    <main className={pageShellClass}>
      <section className={`${cardShellClass} overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-brand px-6 py-8 text-white shadow-xl shadow-slate-950/20 sm:px-8 sm:py-10`}>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-center">
          <div className="space-y-5">
            <span className="inline-flex rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
              KRX Insight Pro
            </span>
            <div className="space-y-3">
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                매일 아침, AI가 내 한국 주식 리스크를 체크합니다.
              </h1>
              <p className="text-base leading-7 text-white/80 sm:text-lg">
                보유종목 리스크 변화 · AI 매매 근거 · 오늘의 시장 브리핑
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <Link
                href="#beta-pro"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-white px-5 text-sm font-semibold text-slate-950 transition hover:bg-slate-100"
              >
                베타 Pro 체험 신청
              </Link>
              <Link
                href="/"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 px-5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                무료로 시작하기
              </Link>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/10 p-5 shadow-2xl shadow-slate-950/20 backdrop-blur">
            <p className="text-sm font-semibold text-white/80">Beta 안내</p>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-white/80">
              <li>현재는 Beta 테스트 단계입니다.</li>
              <li>실제 결제 기능은 아직 제공되지 않습니다.</li>
              <li>Pro 알림 신청은 정식 출시 안내를 위한 베타 흐름입니다.</li>
              <li>친구 초대 Pro 3일 체험은 베타 리워드 성격으로 제공됩니다.</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {valueCards.map((card) => (
          <article key={card.title} className={cardShellClass}>
            <h2 className="text-lg font-semibold text-ink dark:text-white">{card.title}</h2>
            <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{card.description}</p>
          </article>
        ))}
      </section>

      <section className="space-y-5">
        <SectionHeader
          title="Free / Pro / Premium 비교"
          description="현재 제공 중인 Free와 베타 Pro, 출시 예정인 Premium 기능을 한눈에 비교해보세요."
        />
        <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-line dark:divide-dark-line">
              <thead className="bg-slate-50 dark:bg-slate-900/60">
                <tr>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    기능
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Free
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-brand">
                    Pro
                  </th>
                  <th className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Premium
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line dark:divide-dark-line">
                {compareRows.map((row) => (
                  <tr key={row.feature}>
                    <th className="px-4 py-4 text-left text-sm font-semibold text-ink dark:text-white">{row.feature}</th>
                    <CompareCell>{row.free}</CompareCell>
                    <CompareCell emphasized>{row.pro}</CompareCell>
                    <CompareCell>{row.premium}</CompareCell>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section id="beta-pro" className="grid gap-5 lg:grid-cols-3">
        {plans.map((plan) => (
          <PlanCard key={plan.name} plan={plan} />
        ))}
      </section>

      <section className="space-y-5">
        <SectionHeader
          title="자주 묻는 질문"
          description="베타 단계에서 많이 묻는 질문과 현재 제공 범위를 정리했습니다."
        />
        <div className="grid gap-4">
          {faqs.map((item) => (
            <article key={item.question} className={cardShellClass}>
              <h3 className="text-base font-semibold text-ink dark:text-white">{item.question}</h3>
              <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">{item.answer}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={`${cardShellClass} border-slate-200/80 bg-slate-50/80 dark:border-dark-line dark:bg-slate-950/40`}>
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-ink dark:text-white">투자 유의사항</h2>
          <p className="text-sm leading-6 text-slate-700 dark:text-slate-200">
            KRX Insight는 투자 판단을 돕는 AI 분석 도구입니다. 본 서비스는 투자 수익을 보장하지 않으며,
            최종 투자 결정은 사용자 본인의 책임입니다.
          </p>
          <Link
            href="/disclaimer"
            className="inline-flex min-h-11 items-center rounded-xl border border-line bg-white px-4 text-sm font-semibold text-ink transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900"
          >
            자세한 투자 유의사항 보기
          </Link>
        </div>
      </section>
    </main>
  );
}
