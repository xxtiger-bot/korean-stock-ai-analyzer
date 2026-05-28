import { DangerWarningList } from "@/components/danger-warning-list";
import { FeedbackTrigger } from "@/components/feedback-trigger";
import { HomeInteractionTracker } from "@/components/home-interaction-tracker";
import { MarketBriefing } from "@/components/market-briefing";
import { HomeBetaOnboarding } from "@/components/home-beta-onboarding";
import { OpportunityRadar } from "@/components/opportunity-radar";
import { PotentialRadar } from "@/components/potential-radar";
import { StockCardGrid } from "@/components/stock-card-grid";
import { StockSearch } from "@/components/stock-search";
import { StockTable } from "@/components/stock-table";
import { TodayMarketBrief } from "@/components/today-market-brief";
import { TodayInvestmentChecklist } from "@/components/today-investment-checklist";
import { WatchlistPanel } from "@/components/watchlist-panel";
import Link from "next/link";
import { BarChart3, Cloud, CloudOff, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import {
  type MarketOverview,
  getMarketOverview,
  getDangerWarnings,
  getOpportunityRadar,
  getPotentialRadar,
  getPopularStocks,
  getStocksWithPreferredQuote,
  searchStocks
} from "@/lib/stock-provider";

export const revalidate = 60;

const previewToneClass: Record<"brand" | "violet" | "emerald" | "amber", string> = {
  brand: "bg-brand/10 text-brand dark:bg-brand/15 dark:text-blue-200",
  violet: "bg-violet-100 text-violet-700 dark:bg-violet-900/35 dark:text-violet-200",
  emerald: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/35 dark:text-emerald-200",
  amber: "bg-amber-100 text-amber-700 dark:bg-amber-900/35 dark:text-amber-200"
};

const cardShellClass =
  "rounded-2xl border border-line/90 bg-white shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-line dark:bg-dark-panel";
const cardSubtleClass =
  "rounded-xl border border-line/90 bg-slate-50/90 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-dark-line dark:bg-slate-900/55";

const HOME_CRITICAL_TIMEOUT_MS = 3500;
const HOME_SECTION_TIMEOUT_MS = 1000;
const HOME_QUOTE_TIMEOUT_MS = 1200;

function withSoftTimeout<T>(promiseLike: Promise<T> | T, fallback: T, timeoutMs: number): Promise<T> {
  return Promise.race([
    Promise.resolve(promiseLike),
    new Promise<T>((resolve) => {
      setTimeout(() => resolve(fallback), timeoutMs);
    })
  ]).catch(() => fallback);
}

export default async function Home() {
  const [
    fetchedAllStocks,
    fetchedPopularStocks,
    marketOverview,
    opportunityRadar,
    potentialRadar,
    dangerWarnings
  ] = await Promise.all([
    withSoftTimeout(searchStocks(""), [], HOME_CRITICAL_TIMEOUT_MS),
    withSoftTimeout(getPopularStocks(), [], HOME_CRITICAL_TIMEOUT_MS),
    withSoftTimeout(
      getMarketOverview(),
      { indices: [], signals: [] } as MarketOverview,
      HOME_CRITICAL_TIMEOUT_MS
    ),
    withSoftTimeout(getOpportunityRadar(), [], HOME_SECTION_TIMEOUT_MS),
    withSoftTimeout(getPotentialRadar(), [], HOME_SECTION_TIMEOUT_MS),
    withSoftTimeout(getDangerWarnings(), [], HOME_SECTION_TIMEOUT_MS)
  ]);
  const rawAllStocks = Array.isArray(fetchedAllStocks) ? fetchedAllStocks : [];
  const rawPopularStocks = Array.isArray(fetchedPopularStocks) ? fetchedPopularStocks : [];

  // Home 성능 최적화: 첫 화면과 핵심 섹션에 노출되는 종목만 우선 시세 보정.
  const stockBySymbol = new Map(rawAllStocks.map((stock) => [stock.symbol, stock]));
  const quoteCandidateSymbols = new Set<string>();

  rawPopularStocks.slice(0, 3).forEach((stock) => {
    if (stock?.symbol) quoteCandidateSymbols.add(stock.symbol);
  });
  rawAllStocks.slice(0, 3).forEach((stock) => {
    if (stock?.symbol) quoteCandidateSymbols.add(stock.symbol);
  });

  const quoteCandidates = Array.from(quoteCandidateSymbols)
    .map((symbol) => stockBySymbol.get(symbol))
    .filter((stock): stock is NonNullable<typeof stock> => Boolean(stock));

  const quotedCandidates = await withSoftTimeout(
    getStocksWithPreferredQuote(quoteCandidates),
    quoteCandidates,
    HOME_QUOTE_TIMEOUT_MS
  );
  const quotedBySymbol = new Map(quotedCandidates.map((stock) => [stock.symbol, stock]));

  const safeAllStocks = rawAllStocks.map((stock) => quotedBySymbol.get(stock.symbol) ?? stock);
  const safePopularStocks = rawPopularStocks.map(
    (stock) => quotedBySymbol.get(stock.symbol) ?? stock
  );
  const safeOpportunityRadar = Array.isArray(opportunityRadar) ? opportunityRadar : [];
  const safePotentialRadar = Array.isArray(potentialRadar) ? potentialRadar : [];
  const safeDangerWarnings = Array.isArray(dangerWarnings) ? dangerWarnings : [];
  const signals = Array.isArray(marketOverview?.signals) ? marketOverview.signals : [];
  const kospiStocks = safeAllStocks.filter((stock) => stock.market === "KOSPI").slice(0, 6);
  const kosdaqStocks = safeAllStocks.filter((stock) => stock.market === "KOSDAQ").slice(0, 6);
  const mobilePopularStocks = safePopularStocks.slice(0, 3);
  const previewItems = [
    {
      title: "오늘 시장 브리핑",
      desc: "시장 방향과 우선 확인 종목을 한 줄 요약으로 빠르게 확인합니다.",
      tags: ["시장 방향", "TOP 3", "리스크 요약"],
      tone: "brand",
      href: "#home-morning-brief",
      cta: "브리핑 보기"
    },
    {
      title: "AI 종목 분석",
      desc: "기술지표, 리스크 포인트, 관찰 조건을 같은 화면에서 확인합니다.",
      tags: ["AI 점수", "지표 해석", "관찰 포인트"],
      tone: "violet",
      href: "/stocks/005930",
      cta: "분석 열기"
    },
    {
      title: "보유종목 진단",
      desc: "수익률 변화와 알림 근접 상태를 기준으로 보유 전략을 점검합니다.",
      tags: ["수익률", "리스크 변화", "알림 조건"],
      tone: "emerald",
      href: "/portfolio",
      cta: "보유종목 보기"
    },
    {
      title: "기회 레이더",
      desc: "오늘 확인할 기회·위험 신호를 데이터 기준으로 구분해 보여줍니다.",
      tags: ["레이더", "데이터 기준", "위험 구분"],
      tone: "amber",
      href: "#home-radar",
      cta: "레이더 보기"
    }
  ] as const;
  const quickModules = [
    { title: "오늘 시장 브리핑", desc: "시장 방향 요약", href: "#home-morning-brief", tone: "brand" },
    { title: "종목 검색", desc: "관심 종목 찾기", href: "#search", tone: "violet" },
    { title: "보유종목 진단", desc: "수익률·리스크 점검", href: "/portfolio", tone: "emerald" },
    { title: "AI 분석 예시", desc: "삼성전자 분석 보기", href: "/stocks/005930", tone: "amber" },
    { title: "기회 레이더", desc: "오늘의 기회 신호", href: "#home-radar", tone: "brand" },
    { title: "관심종목", desc: "추적 리스트 관리", href: "#home-interest", tone: "violet" }
  ] as const;
  const trustItems = [
    {
      icon: BarChart3,
      title: "데이터 출처",
      body: "장중 현재가와 시세 변동은 한국투자증권(KIS) API를 기준으로 표시하고, 일별 종가·이동평균·RSI·MACD·기준일 데이터는 data.go.kr(공공데이터포털) 자료로 산출합니다."
    },
    {
      icon: ShieldCheck,
      title: "로컬 모드 우선",
      body: "기본 모드는 로컬 우선으로 동작합니다. 로그인하지 않으면 보유종목·알림·체크리스트 데이터가 사용자 브라우저에만 저장되며, 클라우드로 자동 전송되지 않습니다."
    },
    {
      icon: Target,
      title: "투자 참고 정보",
      body: "분석 결과는 투자 판단을 돕는 참고 정보이며, 최종 의사결정과 책임은 사용자에게 있습니다."
    }
  ] as const;
  const userVoices = [
    {
      role: "베타 사용자",
      comment: "출근길에 오늘 시장 브리핑과 TOP 3를 먼저 확인하면, 장 시작 전에 점검 순서가 훨씬 빠르게 정리됩니다."
    },
    {
      role: "개인 투자자",
      comment: "보유종목 카드에서 리스크 변화와 알림 근접을 함께 보니, 흔들리지 않고 재평가 시점을 잡는 데 도움이 됐습니다."
    },
    {
      role: "베타 참여자",
      comment: "처음에는 로그인 없이 로컬 모드로 가볍게 써보고, 필요할 때만 동기화를 켤 수 있어 테스트 부담이 낮았습니다."
    }
  ] as const;

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-3 py-4 sm:px-5 sm:py-5 lg:px-7">
      <HomeInteractionTracker />
      <section className="md:hidden">
        <section className="mb-5 rounded-2xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-soft dark:border-dark-line dark:from-dark-panel dark:via-slate-900/70 dark:to-slate-950">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            KRX Insight
          </p>
          <h1 className="mt-2 text-[22px] font-bold tracking-tight text-ink dark:text-white">한국 주식 AI 분석 대시보드</h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            오늘 시장 브리핑, 종목 분석, 보유종목 리스크 진단을 한 화면에서 확인하세요.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href="#search"
              data-home-track="mobile-hero-start"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-4 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
            >
              지금 바로 무료 테스트 시작하기
            </a>
            <a
              href="/stocks/005930"
              data-home-track="mobile-hero-example"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              삼성전자 분석 예시 보기
            </a>
          </div>
        </section>

        <section className={`mb-5 p-4 ${cardShellClass}`}>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold tracking-tight text-ink dark:text-white">기능 바로가기</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-200">
              핵심 모듈
            </span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {quickModules.map((module) => (
              <Link
                key={`mobile-${module.title}`}
                href={module.href}
                data-home-track={`mobile-module-${module.title}`}
                className={`p-3 ${cardSubtleClass}`}
              >
                <p className="text-[13px] font-bold text-ink dark:text-white">{module.title}</p>
                <p className="mt-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">{module.desc}</p>
                <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${previewToneClass[module.tone]}`}>
                  이동
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <HomeBetaOnboarding compact />
        </section>

        <TodayMarketBrief
          signals={signals}
          stocks={safeAllStocks}
          sectionId="home-morning-brief"
        />

        <section className="mt-5">
          <TodayInvestmentChecklist stocks={safeAllStocks} sectionId="home-checklist" />
        </section>

        <section id="search" className="mt-5">
          <StockSearch stocks={safeAllStocks} />
        </section>

        <section id="home-interest" className="mt-5">
          <StockCardGrid title="인기 종목" stocks={mobilePopularStocks} />
        </section>

        <section className={`mt-5 p-4 ${cardShellClass}`}>
          <h2 className="text-lg font-bold tracking-tight text-ink dark:text-white">핵심 기능 미리보기</h2>
          <div className="mt-3 grid gap-2.5">
            {previewItems.map((item) => (
              <Link
                key={item.title}
                href={item.href}
                data-home-track={`mobile-preview-${item.title}`}
                className="group block rounded-xl border border-line bg-slate-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:border-dark-line dark:bg-slate-900/50"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-[15px] font-bold tracking-tight text-ink dark:text-white">{item.title}</h3>
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${previewToneClass[item.tone]}`}>
                    핵심
                  </span>
                </div>
                <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {item.desc}
                </p>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={`${item.title}-${tag}`}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
                <p className="mt-2 text-[12px] font-bold text-brand transition group-hover:text-blue-500">
                  {item.cta} →
                </p>
              </Link>
            ))}
          </div>
        </section>
      </section>

      <div className="hidden md:block">
      <section className="mb-5 rounded-3xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 p-5 shadow-soft dark:border-dark-line dark:from-dark-panel dark:via-slate-900/70 dark:to-slate-950 sm:p-6">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              KRX Insight
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink dark:text-white sm:text-[2.05rem]">한국 주식 AI 분석 대시보드</h1>
            <p className="mt-2.5 text-[15px] font-semibold leading-7 text-slate-600 dark:text-slate-300">
              오늘 시장 브리핑부터 종목 분석, 보유종목 리스크 점검까지 한 번에 확인할 수 있습니다.
            </p>
            <p className="mt-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400">
              data.go.kr 데이터는 일별 종가 기준이며 실시간 시세가 아닙니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#search"
                data-home-track="desktop-hero-start"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg dark:bg-brand dark:hover:bg-blue-500"
              >
                지금 바로 무료 테스트 시작하기
              </a>
              <a
                href="/stocks/005930"
                data-home-track="desktop-hero-example"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                삼성전자 분석 예시 보기
              </a>
              <FeedbackTrigger
                label="피드백 보내기"
                source="home-hero"
                className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
              />
            </div>
          </div>

          <aside className="relative overflow-hidden rounded-2xl border border-line/90 bg-white/95 p-4 shadow-[0_40px_88px_-36px_rgba(15,23,42,0.62)] ring-1 ring-slate-200/80 [contain:layout_paint_style] [content-visibility:auto] [contain-intrinsic-size:1px_520px] dark:border-dark-line/85 dark:bg-slate-900/80 dark:ring-slate-700/75">
            <div className="pointer-events-none absolute inset-px rounded-[15px] border border-white/70 dark:border-slate-600/45" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-white via-slate-100/70 to-transparent dark:from-slate-900 dark:via-slate-900/70" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.16),transparent_58%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.22),transparent_58%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.08),transparent_55%)] dark:bg-[radial-gradient(circle_at_bottom_left,rgba(15,23,42,0.25),transparent_55%)]" />
            <div className="relative -mx-4 -mt-4 mb-3 flex items-center gap-1.5 border-b border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-slate-100 px-4 py-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(148,163,184,0.2)] dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400 shadow-sm" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400 shadow-sm" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-sm" />
              <span className="ml-2 text-[11px] font-semibold tracking-tight text-slate-500 dark:text-slate-300">
                KRX Insight - Portfolio Dashboard
              </span>
              <span className="ml-auto rounded-full bg-brand/10 px-2 py-0.5 text-[10px] font-bold text-brand">
                BETA LIVE
              </span>
            </div>
            <div className="relative mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-brand">대시보드 미리보기</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                실시간 흐름
              </span>
            </div>
            <div className="relative rounded-xl border border-line/90 bg-gradient-to-b from-white to-slate-50/80 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.92),inset_0_-1px_0_rgba(148,163,184,0.2),0_18px_38px_-24px_rgba(15,23,42,0.48)] dark:border-dark-line dark:bg-gradient-to-b dark:from-dark-panel dark:to-slate-900/90">
              <div className="grid gap-2.5 sm:grid-cols-2">
                <div className="rounded-lg border border-slate-200/85 bg-slate-50/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),inset_0_-1px_0_rgba(148,163,184,0.16),0_10px_22px_-18px_rgba(15,23,42,0.38)] dark:border-slate-700 dark:bg-slate-900/70">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">시장 방향</span>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                      관망
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-slate-500/80 to-brand/90" />
                  </div>
                  <p className="mt-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400">
                    방향 강도 62%
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200/85 bg-slate-50/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),inset_0_-1px_0_rgba(148,163,184,0.16),0_10px_22px_-18px_rgba(15,23,42,0.38)] dark:border-slate-700 dark:bg-slate-900/70">
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">리스크 변화</p>
                  <p className="mt-1 text-sm font-bold text-slate-700 dark:text-slate-200">유지 관찰</p>
                  <div className="mt-2 flex items-end gap-1.5">
                    {[18, 23, 21, 27, 24, 31].map((height, index) => (
                      <div
                        key={`hero-mini-bar-${index}`}
                        className="w-2.5 rounded-sm bg-gradient-to-t from-brand/45 to-brand/90"
                        style={{ height: `${height}px` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
              <div className="mt-2.5 rounded-lg border border-slate-200/85 bg-slate-50/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),inset_0_-1px_0_rgba(148,163,184,0.16),0_10px_22px_-18px_rgba(15,23,42,0.38)] dark:border-slate-700 dark:bg-slate-900/70">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">오늘 먼저 확인할 종목</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">TOP 3</span>
                </div>
                <div className="mt-2 space-y-1.5">
                  {[
                    { name: "삼성전자", state: "유지 관찰" },
                    { name: "SK하이닉스", state: "관찰 필요" },
                    { name: "NAVER", state: "데이터 확인" }
                  ].map((item, index) => (
                    <div
                      key={item.name}
                      className="flex items-center justify-between rounded-lg border border-line bg-white px-2.5 py-2 text-xs shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-dark-line dark:bg-dark-panel"
                    >
                      <div className="flex items-center gap-2">
                        <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-slate-100 text-[10px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {index + 1}
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200">{item.name}</span>
                      </div>
                      <span className="text-[11px] font-bold text-slate-500">{item.state}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="mt-2.5 rounded-lg border border-slate-200/85 bg-slate-50/95 p-2.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.68),inset_0_-1px_0_rgba(148,163,184,0.16),0_10px_22px_-18px_rgba(15,23,42,0.38)] dark:border-slate-700 dark:bg-slate-900/70">
                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">시장 흐름 미니 차트</p>
                <div className="mt-1.5 rounded-md border border-slate-200/70 bg-white p-2 dark:border-slate-700 dark:bg-slate-900/70">
                  <svg
                    viewBox="0 0 220 64"
                    className="h-14 w-full text-brand/95"
                    preserveAspectRatio="none"
                    aria-hidden="true"
                  >
                    <polyline
                      points="0,42 26,38 52,41 78,32 104,36 130,24 156,28 182,18 208,20"
                      fill="none"
                      stroke="currentColor"
                      strokeOpacity="0.18"
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="0,42 26,38 52,41 78,32 104,36 130,24 156,28 182,18 208,20"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {[26, 78, 130, 182].map((x, idx) => (
                      <circle key={`hero-mini-point-${idx}`} cx={x} cy={[38, 32, 24, 18][idx]} r="1.6" fill="currentColor" />
                    ))}
                    <line x1="0" y1="50" x2="220" y2="50" stroke="#CBD5E1" strokeDasharray="4 4" strokeWidth="1" />
                  </svg>
                </div>
                <p className="mt-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  데이터 기준: KIS + data.go.kr
                </p>
              </div>
            </div>
          </aside>
        </div>
      </section>
      <section className="mb-5">
        <HomeBetaOnboarding />
      </section>
      <section className={`mb-5 p-4 ${cardShellClass}`}>
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink dark:text-white">기능 바로가기</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            홈 핵심 모듈
          </span>
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {quickModules.map((module) => (
            <Link
              key={`desktop-${module.title}`}
              href={module.href}
              data-home-track={`desktop-module-${module.title}`}
              className={`p-3 ${cardSubtleClass}`}
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-bold text-ink dark:text-white">{module.title}</p>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${previewToneClass[module.tone]}`}>이동</span>
              </div>
              <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{module.desc}</p>
            </Link>
          ))}
        </div>
      </section>
      <section className="mb-5">
        <TodayMarketBrief
          signals={signals}
          stocks={safeAllStocks}
          sectionId="home-morning-brief"
        />
      </section>
      <section className="mb-5">
        <TodayInvestmentChecklist stocks={safeAllStocks} sectionId="home-checklist" />
      </section>
      <section className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.58fr)]">
        <div id="home-market" className="grid min-w-0 gap-3 scroll-mt-32">
          <div className={`p-4 ${cardShellClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">
                  한국 시장
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-tight text-ink dark:text-white sm:text-[1.65rem]">
                  한국 주식 대시보드
                </h1>
                <p className="mt-1.5 max-w-2xl text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                  data.go.kr 데이터는 일별 종가 기준이며 실시간 시세가 아닙니다.
                </p>
              </div>
              <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <p className="text-[11px] font-bold text-slate-400">종목</p>
                  <p className="mt-0.5 text-base font-bold tracking-tight text-ink dark:text-white">
                    {safeAllStocks.length}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <p className="text-[11px] font-bold text-slate-400">KOSPI</p>
                  <p className="mt-0.5 text-base font-bold tracking-tight text-ink dark:text-white">
                    {kospiStocks.length}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <p className="text-[11px] font-bold text-slate-400">KOSDAQ</p>
                  <p className="mt-0.5 text-base font-bold tracking-tight text-ink dark:text-white">
                    {kosdaqStocks.length}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <MarketBriefing signals={signals} />
        </div>
        <div id="search" className="min-w-0 scroll-mt-32">
          <StockSearch stocks={safeAllStocks} />
        </div>
      </section>

      <section id="home-radar" className="mt-5 grid min-w-0 gap-4 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)] [content-visibility:auto] [contain-intrinsic-size:1px_900px]">
        <OpportunityRadar items={safeOpportunityRadar} />
        <StockCardGrid title="인기 종목" stocks={safePopularStocks} />
      </section>

      <section className="mt-5 grid min-w-0 gap-4 xl:grid-cols-2 [content-visibility:auto] [contain-intrinsic-size:1px_780px]">
        <PotentialRadar items={safePotentialRadar} />
        <DangerWarningList items={safeDangerWarnings} />
      </section>

      <section className={`mt-5 p-4 [content-visibility:auto] [contain-intrinsic-size:1px_620px] ${cardShellClass}`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-lg font-bold tracking-tight text-ink dark:text-white">핵심 기능 미리보기</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            주요 기능 4가지
          </span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {previewItems.map((item) => (
            <Link
              key={item.title}
              href={item.href}
              data-home-track={`desktop-preview-${item.title}`}
              className="group block rounded-xl border border-line bg-slate-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 dark:border-dark-line dark:bg-slate-900/50"
            >
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-[15px] font-bold tracking-tight text-ink dark:text-white">{item.title}</h3>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${previewToneClass[item.tone]}`}>
                  핵심
                </span>
              </div>
              <p className="mt-1.5 text-[13px] font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {item.desc}
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={`${item.title}-${tag}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[12px] font-bold text-brand transition group-hover:text-blue-500">
                {item.cta} →
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] [content-visibility:auto] [contain-intrinsic-size:1px_420px]">
        <article className={`p-4 ${cardShellClass}`}>
          <h2 className="text-lg font-bold tracking-tight text-ink dark:text-white">로컬 모드</h2>
          <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            <li>- 로그인 없이 바로 사용</li>
            <li>- 브라우저에만 저장</li>
            <li>- 빠르게 체험하기 적합</li>
            <li>- 개인정보 노출 부담이 낮음</li>
          </ul>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            <CloudOff className="h-3.5 w-3.5" />
            로컬 우선
          </div>
        </article>
        <article className={`p-4 ${cardShellClass}`}>
          <h2 className="text-lg font-bold tracking-tight text-ink dark:text-white">클라우드 동기화</h2>
          <ul className="mt-2 space-y-1.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            <li>- 로그인 후 사용</li>
            <li>- 관심종목 / 보유종목 / 리포트 동기화</li>
            <li>- 여러 기기에서 확인 가능</li>
            <li>- 장기 추적 사용자에게 적합</li>
          </ul>
          <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
            <Cloud className="h-3.5 w-3.5" />
            멀티 디바이스
          </div>
        </article>
      </section>

      <section className={`mt-5 p-4 [content-visibility:auto] [contain-intrinsic-size:1px_520px] ${cardShellClass}`}>
        <h2 className="text-lg font-bold tracking-tight text-ink dark:text-white">신뢰와 데이터 기준</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <article key={item.title} className={`p-3 ${cardSubtleClass}`}>
                <div className="inline-flex h-7 w-7 items-center justify-center rounded-md bg-brand/10 text-brand">
                  <Icon className="h-4 w-4" />
                </div>
                <h3 className="mt-2 text-sm font-bold text-ink dark:text-white">{item.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {item.body}
                </p>
              </article>
            );
          })}
        </div>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {userVoices.map((voice) => (
            <article key={voice.role} className={`p-3 ${cardSubtleClass}`}>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">{voice.role}</p>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-700 dark:text-slate-200">
                “{voice.comment}”
              </p>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-5 grid min-w-0 gap-4 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] [content-visibility:auto] [contain-intrinsic-size:1px_760px]">
        <WatchlistPanel
          stocks={safeAllStocks}
          sectionIds={{
            root: "home-interest",
            portfolio: "home-portfolio",
            alerts: "home-alerts"
          }}
        />
        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          <StockTable title="KOSPI 주요 종목" stocks={kospiStocks} />
          <StockTable title="KOSDAQ 관심 종목" stocks={kosdaqStocks} />
        </div>
      </section>

      <section className="mt-5 rounded-2xl border border-brand/25 bg-gradient-to-r from-white to-blue-50 p-5 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-brand/35 dark:from-dark-panel dark:to-slate-900">
        <h2 className="text-xl font-bold text-ink dark:text-white">지금 KRX Insight를 시작해보세요</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          종목 검색부터 AI 분석, 보유종목 진단까지 5분 안에 핵심 흐름을 확인할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <a
            href="#search"
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg dark:bg-brand dark:hover:bg-blue-500"
          >
            지금 바로 무료 테스트 시작하기
          </a>
          <FeedbackTrigger
            label="피드백 보내기"
            source="home-bottom-cta"
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
          />
        </div>
      </section>
      </div>
    </main>
  );
}
