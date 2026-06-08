<<<<<<< HEAD
import { PricingPageClient } from "@/components/pricing-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PricingPage() {
  return <PricingPageClient />;
=======
import Link from "next/link";
import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "KRX Insight Pro | Pricing",
  description: "KRX Insight Free, Pro, Premium 요금제 비교"
};

type ValueCardProps = {
  title: string;
  body: string;
};

type Tier = {
  name: "Free" | "Pro" | "Premium";
  subtitle: string;
  monthly: string;
  yearly?: string;
  badge?: string;
  cta: string;
  ctaHref?: string;
  ctaMuted?: boolean;
  features: string[];
  highlighted?: boolean;
};

type CompareRow = {
  label: string;
  free: string;
  pro: string;
  premium: string;
};

type FaqItem = {
  question: string;
  answer: string;
};

function SectionCard({
  children,
  className = ""
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6 ${className}`.trim()}
    >
      {children}
    </section>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold uppercase tracking-normal text-brand">{eyebrow}</p>
      <h2 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function ValueCard({ title, body }: ValueCardProps) {
  return (
    <div className="rounded-xl border border-line bg-slate-50/80 p-4 shadow-soft dark:border-dark-line dark:bg-slate-900/50">
      <h3 className="text-lg font-bold text-ink dark:text-white">{title}</h3>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
        {body}
      </p>
    </div>
  );
}

function TierCard({
  name,
  subtitle,
  monthly,
  yearly,
  badge,
  cta,
  ctaHref,
  ctaMuted,
  features,
  highlighted
}: Tier) {
  const cardClass = highlighted
    ? "border-brand/30 bg-[linear-gradient(180deg,rgba(37,99,235,0.08),rgba(255,255,255,1))] dark:bg-[linear-gradient(180deg,rgba(37,99,235,0.14),rgba(15,23,42,0.98))]"
    : "bg-white dark:bg-dark-panel";

  const ctaClass = ctaMuted
    ? "border border-line bg-slate-50 text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
    : highlighted
      ? "bg-brand text-white shadow-soft hover:bg-blue-700"
      : "border border-line bg-white text-ink hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900/70";

  return (
    <div
      className={`rounded-2xl border p-5 shadow-soft transition hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-line sm:p-6 ${cardClass}`.trim()}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold uppercase tracking-normal text-brand">{name}</p>
          <h3 className="mt-2 text-2xl font-bold text-ink dark:text-white">{monthly}</h3>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            {subtitle}
          </p>
        </div>
        {badge ? (
          <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
            {badge}
          </span>
        ) : null}
      </div>

      {yearly ? (
        <div className="mt-4 rounded-xl border border-line bg-white/70 p-3 dark:border-dark-line dark:bg-slate-950/50">
          <p className="text-sm font-bold text-ink dark:text-white">{yearly}</p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            연간 결제 시 약 2개월 무료
          </p>
        </div>
      ) : null}

      <div className="mt-5">
        {ctaHref ? (
          <Link
            href={ctaHref}
            className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${ctaClass}`.trim()}
          >
            {cta}
          </Link>
        ) : (
          <button
            type="button"
            disabled
            className={`inline-flex min-h-12 w-full items-center justify-center rounded-xl px-4 py-3 text-sm font-bold transition ${ctaClass}`.trim()}
          >
            {cta}
          </button>
        )}
      </div>

      <ul className="mt-5 space-y-2">
        {features.map((feature) => (
          <li
            key={`${name}-${feature}`}
            className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300"
          >
            {feature}
          </li>
        ))}
      </ul>
    </div>
  );
}

function CompareTable({ rows }: { rows: CompareRow[] }) {
  return (
    <>
      <div className="hidden overflow-hidden rounded-2xl border border-line shadow-soft dark:border-dark-line lg:block">
        <table className="w-full border-collapse bg-white dark:bg-dark-panel">
          <thead>
            <tr className="border-b border-line bg-slate-50 dark:border-dark-line dark:bg-slate-900/60">
              <th className="px-4 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-300">
                기능
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-300">
                Free
              </th>
              <th className="px-4 py-3 text-left text-sm font-bold text-brand">Pro</th>
              <th className="px-4 py-3 text-left text-sm font-bold text-slate-500 dark:text-slate-300">
                Premium
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.label}
                className="border-b border-line last:border-b-0 dark:border-dark-line"
              >
                <th className="px-4 py-3 text-left text-sm font-bold text-ink dark:text-white">
                  {row.label}
                </th>
                <td className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  {row.free}
                </td>
                <td className="px-4 py-3 text-sm font-bold text-ink dark:text-white">{row.pro}</td>
                <td className="px-4 py-3 text-sm font-semibold text-slate-500 dark:text-slate-300">
                  {row.premium}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {rows.map((row) => (
          <div
            key={row.label}
            className="rounded-xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel"
          >
            <h3 className="text-base font-bold text-ink dark:text-white">{row.label}</h3>
            <dl className="mt-3 grid gap-2 text-sm">
              <div className="flex items-start justify-between gap-3">
                <dt className="font-bold text-slate-500 dark:text-slate-300">Free</dt>
                <dd className="text-right font-semibold text-ink dark:text-white">{row.free}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="font-bold text-brand">Pro</dt>
                <dd className="text-right font-bold text-ink dark:text-white">{row.pro}</dd>
              </div>
              <div className="flex items-start justify-between gap-3">
                <dt className="font-bold text-slate-500 dark:text-slate-300">Premium</dt>
                <dd className="text-right font-semibold text-ink dark:text-white">
                  {row.premium}
                </dd>
              </div>
            </dl>
          </div>
        ))}
      </div>
    </>
  );
}

const valueCards: ValueCardProps[] = [
  {
    title: "어제보다 위험해진 종목을 바로 확인",
    body: "보유종목과 관심종목 기준으로 오늘 먼저 확인해야 할 리스크 변화 구간을 빠르게 보여드립니다."
  },
  {
    title: "매수·보유·관망·감소 이유를 구조적으로 분석",
    body: "추세, 기술지표, 데이터 기준, 리스크 포인트를 한 문장 판단이 아니라 구조적인 근거로 정리합니다."
  },
  {
    title: "오늘 시장 분위기와 우선 확인 종목을 30초 안에 정리",
    body: "출근길에도 핵심만 빠르게 읽을 수 있도록 브리핑, 우선 종목, 경고 신호를 짧고 선명하게 제공합니다."
  }
];

const compareRows: CompareRow[] = [
  { label: "관심종목", free: "5개", pro: "30개", premium: "100개" },
  { label: "보유종목", free: "3개", pro: "20개", premium: "50개" },
  { label: "일일 AI 분석", free: "3회", pro: "50회", premium: "확장 예정" },
  { label: "리스크 기록", free: "최근 3일", pro: "최근 90일", premium: "365일" },
  { label: "시장 브리핑", free: "기본 AI 브리핑", pro: "전체 AI 브리핑", premium: "고급 브리핑" },
  { label: "공유 카드", free: "워터마크 포함", pro: "워터마크 없음", premium: "브랜드 커스텀 예정" },
  { label: "리스크 알림", free: "미지원", pro: "리스크 상승 알림", premium: "다중 알림 예정" },
  { label: "매매 근거", free: "전체 매매 근거 제한", pro: "전체 매매 근거", premium: "고급 수급 분석" },
  { label: "리포트", free: "기본 보기", pro: "히스토리 리포트 저장", premium: "PDF 내보내기" },
  { label: "확장 기능", free: "기본 사용", pro: "확장 사용", premium: "다중 포트폴리오 · 섹터/테마 레이더 · AI 종목 스크리너" }
];

const tiers: Tier[] = [
  {
    name: "Free",
    subtitle: "가볍게 시작하는 기본 요금제",
    monthly: "무료",
    badge: "기본",
    cta: "무료로 시작하기",
    ctaHref: "/",
    features: [
      "관심종목 5개",
      "보유종목 3개",
      "일일 AI 분석 3회",
      "리스크 기록 최근 3일",
      "기본 AI 브리핑"
    ]
  },
  {
    name: "Pro",
    subtitle: "매일 브리핑과 리스크 추적을 꾸준히 쓰는 사용자용",
    monthly: "월 9,900원",
    yearly: "연 99,000원",
    badge: "추천",
    cta: "베타 Pro 체험 신청",
    ctaHref: "/beta",
    highlighted: true,
    features: [
      "관심종목 30개",
      "보유종목 20개",
      "일일 AI 분석 50회",
      "리스크 기록 최근 90일",
      "전체 AI 브리핑",
      "전체 매매 근거",
      "리스크 상승 알림",
      "워터마크 없는 공유 카드",
      "히스토리 리포트 저장"
    ]
  },
  {
    name: "Premium",
    subtitle: "고급 포트폴리오 관리와 확장 분석을 위한 상위 플랜",
    monthly: "월 29,000원",
    badge: "Coming Soon",
    cta: "출시 알림 받기",
    ctaHref: "/beta",
    ctaMuted: true,
    features: [
      "관심종목 100개",
      "보유종목 50개",
      "리스크 기록 365일",
      "다중 포트폴리오",
      "섹터/테마 레이더",
      "AI 종목 스크리너",
      "PDF 리포트 내보내기",
      "고급 수급 분석"
    ]
  }
];

const faqs: FaqItem[] = [
  {
    question: "수익을 보장하나요?",
    answer:
      "아니요. KRX Insight는 투자 참고 정보를 정리하는 도구이며, 수익을 보장하거나 특정 종목의 상승을 약속하지 않습니다."
  },
  {
    question: "AI 분석은 투자 조언인가요?",
    answer:
      "아닙니다. AI 분석은 추세, 기술지표, 리스크 포인트를 정리한 참고 정보이며 투자 자문이나 매수·매도 추천이 아닙니다."
  },
  {
    question: "데이터는 어디에서 가져오나요?",
    answer:
      "주요 가격과 종목 분석 기준은 KIS 현재가와 data.go.kr 일별 종가 데이터를 함께 참고합니다. 데이터 상태는 연결 상황에 따라 지연될 수 있습니다."
  },
  {
    question: "Free와 Pro의 차이는 무엇인가요?",
    answer:
      "Free는 기본 브리핑과 소규모 포트폴리오 관리에 적합하고, Pro는 더 많은 종목 수와 리스크 기록, 전체 AI 근거, 알림과 저장 기능을 제공합니다."
  },
  {
    question: "언제 Pro로 업그레이드하는 것이 좋나요?",
    answer:
      "매일 아침 브리핑을 확인하고, 보유종목을 3개 이상 관리하거나 리스크 변화를 장기간 기록해두고 싶을 때 Pro가 더 잘 맞습니다."
  },
  {
    question: "결제는 언제 시작되나요?",
    answer:
      "현재는 베타 테스트 단계이며 실제 결제 기능은 아직 제공되지 않습니다. Pro 체험 신청과 출시 알림은 정식 출시 소식을 위한 안내 흐름입니다."
  }
];

export default function PricingPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="space-y-5 sm:space-y-6">
        <SectionCard className="overflow-hidden">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-center">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                KRX Insight Pro
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal text-ink dark:text-white sm:text-4xl">
                매일 아침, AI가 내 한국 주식 리스크를 체크합니다.
              </h1>
              <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                보유종목 리스크 변화 · AI 매매 근거 · 오늘의 시장 브리핑
              </p>
              <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="/beta"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl bg-brand px-5 py-3 text-sm font-bold text-white shadow-soft transition hover:bg-blue-700"
                >
                  베타 Pro 체험 신청
                </Link>
                <Link
                  href="/"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900/70"
                >
                  Free로 둘러보기
                </Link>
              </div>
              <p className="mt-3 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                현재는 Beta 테스트 단계입니다. 실제 결제 기능은 아직 제공되지 않습니다.
              </p>
            </div>

            <div className="rounded-2xl border border-line bg-slate-50/80 p-5 shadow-soft dark:border-dark-line dark:bg-slate-900/50">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                Beta 안내
              </p>
              <div className="mt-3 space-y-3">
                <div className="rounded-xl border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
                  <p className="text-sm font-bold text-ink dark:text-white">
                    Pro 알림 신청은 정식 출시 알림을 위한 신청입니다.
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
                  <p className="text-sm font-bold text-ink dark:text-white">
                    친구 초대 Pro 3일 체험은 Beta 리워드 성격으로 제공됩니다.
                  </p>
                </div>
                <div className="rounded-xl border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
                  <p className="text-sm font-bold text-ink dark:text-white">
                    향후 유료 기능은 별도 고지 후 제공됩니다.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Core Value"
            title="Pro가 더 잘 맞는 순간"
            description="매일 시장을 확인하고, 보유종목 리스크와 AI 근거를 체계적으로 보고 싶은 사용자를 위한 핵심 가치입니다."
          />
          <div className="mt-5 grid gap-3 lg:grid-cols-3">
            {valueCards.map((card) => (
              <ValueCard key={card.title} title={card.title} body={card.body} />
            ))}
          </div>
        </SectionCard>

        <SectionCard>
          <SectionHeading
            eyebrow="Plan Compare"
            title="Free / Pro / Premium 비교"
            description="현재 제공 범위와 앞으로 확장될 기능을 한눈에 비교해보세요."
          />
          <div className="mt-5">
            <CompareTable rows={compareRows} />
          </div>
        </SectionCard>

        <section className="grid gap-4 lg:grid-cols-3">
          {tiers.map((tier) => (
            <TierCard key={tier.name} {...tier} />
          ))}
        </section>

        <SectionCard>
          <SectionHeading
            eyebrow="FAQ"
            title="자주 묻는 질문"
            description="결제 시작 전 가장 많이 묻는 질문을 먼저 정리했습니다."
          />
          <div className="mt-5 space-y-3">
            {faqs.map((faq) => (
              <details
                key={faq.question}
                className="rounded-xl border border-line bg-slate-50/70 p-4 shadow-soft open:bg-white dark:border-dark-line dark:bg-slate-900/50 dark:open:bg-dark-panel"
              >
                <summary className="cursor-pointer list-none text-base font-bold text-ink dark:text-white">
                  {faq.question}
                </summary>
                <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {faq.answer}
                </p>
              </details>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="border-rose-200 bg-rose-50/70 dark:border-rose-900/40 dark:bg-rose-950/10">
          <p className="text-xs font-bold uppercase tracking-normal text-rose-600 dark:text-rose-300">
            Disclaimer
          </p>
          <p className="mt-3 text-base font-bold leading-7 text-ink dark:text-white">
            KRX Insight는 투자 판단을 돕는 AI 분석 도구입니다.
          </p>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            본 서비스는 투자 수익을 보장하지 않으며, 최종 투자 결정은 사용자 본인의
            책임입니다.
          </p>
          <Link
            href="/disclaimer"
            className="mt-4 inline-flex text-sm font-bold text-brand hover:underline"
          >
            자세한 투자 유의사항 보기
          </Link>
        </SectionCard>
      </div>
    </main>
  );
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
}
