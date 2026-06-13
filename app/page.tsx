import Link from "next/link";

import { DangerWarningList } from "@/components/danger-warning-list";
import { FeedbackTrigger } from "@/components/feedback-trigger";
import { HomeInteractionTracker } from "@/components/home-interaction-tracker";
import { MarketBriefing } from "@/components/market-briefing";
import { HomeBetaOnboarding } from "@/components/home-beta-onboarding";
import { OpportunityRadar } from "@/components/opportunity-radar";
import { PotentialRadar } from "@/components/potential-radar";
import { ShareCard } from "@/components/share/share-card";
import { StockCardGrid } from "@/components/stock-card-grid";
import { StockSearch } from "@/components/stock-search";
import { StockTable } from "@/components/stock-table";
import { TodayMarketBrief } from "@/components/today-market-brief";
import { TodayInvestmentChecklist } from "@/components/today-investment-checklist";
import { WatchlistPanel } from "@/components/watchlist-panel";
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
import type { Stock } from "@/lib/types";

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

  // Home 성능 최적화: 첫 화면과 추천 카드에 노출되는 종목만 우선 시세 보정.
  const quoteCandidateMap = new Map<string, Stock>();

  [...rawPopularStocks.slice(0, 8), ...rawAllStocks.slice(0, 12)].forEach((stock) => {
    if (stock?.symbol && !quoteCandidateMap.has(stock.symbol)) {
      quoteCandidateMap.set(stock.symbol, stock);
    }
  });

  ["005930", "000660", "035420"].forEach((symbol) => {
    const fromAllStocks = rawAllStocks.find((stock) => stock.symbol === symbol);
    const fromPopularStocks = rawPopularStocks.find((stock) => stock.symbol === symbol);
    const candidate = fromAllStocks ?? fromPopularStocks;
    if (candidate && !quoteCandidateMap.has(symbol)) {
      quoteCandidateMap.set(symbol, candidate);
    }
  });

  const quoteCandidates = Array.from(quoteCandidateMap.values());

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
  const dailyDeskPriorityItems = safeOpportunityRadar.slice(0, 3);

  const getPriorityStatus = (riskLevel?: string | null) => {
    if (riskLevel === "매우 높음" || riskLevel === "높음" || riskLevel === "위험 높음") {
      return "리스크 확인";
    }
    if (riskLevel === "보통" || riskLevel === "신중 관찰" || riskLevel === "관찰") {
      return "관망";
    }
    return "관심";
  };
  const riskSummaryStatuses = safeOpportunityRadar.map((item) =>
    getPriorityStatus(typeof item?.riskLevel === "string" ? item.riskLevel : undefined)
  );
  const riskCount = riskSummaryStatuses.filter((status) => status === "리스크 확인").length;
  const watchCount = riskSummaryStatuses.filter((status) => status === "관망").length;
  const interestCount = riskSummaryStatuses.filter((status) => status === "관심").length;
  const todayLabel = new Intl.DateTimeFormat("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
      <section className="grid min-w-0 gap-3">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0 max-w-3xl">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                KRX Insight
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
                오늘의 AI 주식 브리핑
              </h1>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
                매일 아침, AI가 내 한국 주식 리스크를 체크합니다.
              </p>
            </div>
            <div className="rounded-full border border-line bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              아침 점검
            </div>
          </div>

          <div className="mt-5 grid gap-3 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
            <div className="grid gap-3">
              <div className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">
                  AI 오늘의 한 줄 전략
                </p>
                <p className="mt-2 text-lg font-bold leading-8 text-ink dark:text-white">
                  오늘은 추격매수보다 리스크 관리가 우선입니다.
                </p>
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                  먼저 확인할 종목과 리스크 상태를 가볍게 정리한 뒤 움직이는 편이 좋습니다.
                </p>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
                <Link
                  href="#watchlist-desk"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg bg-ink px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
                >
                  관심종목 추가하기
                </Link>
                <Link
                  href="/stocks/005930"
                  className="inline-flex min-h-12 items-center justify-center rounded-lg border border-line bg-white px-5 py-3 text-sm font-bold text-ink transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900/80"
                >
                  AI 분석 보러가기
                </Link>
              </div>
              <div className="rounded-lg border border-line bg-white/80 px-4 py-3 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel/70 dark:text-slate-300">
                로그인하면 관심종목 관리와 향후 클라우드 동기화가 쉬워집니다.
              </div>
            </div>

            <div className="grid gap-3">
              <div className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                내 리스크 요약
              </p>
              {riskSummaryStatuses.length > 0 ? (
                <>
                  <p className="mt-2 text-xl font-bold leading-8 text-ink dark:text-white">
                    오늘 우선 확인 종목 {riskSummaryStatuses.length}개
                  </p>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                    리스크 확인 {riskCount}개 · 관망 {watchCount}개 · 관심 {interestCount}개
                  </p>
                </>
              ) : (
                <p className="mt-2 text-lg font-bold leading-8 text-ink dark:text-white">
                  관심종목을 추가하면 AI가 매일 리스크 변화를 정리해드립니다.
                </p>
              )}
            </div>

              <div className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-bold uppercase tracking-normal text-brand">
                    오늘 우선 확인할 종목
                  </p>
                  {dailyDeskPriorityItems.length > 0 ? (
                    <span className="rounded-full border border-line bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                      TOP {dailyDeskPriorityItems.length}
                    </span>
                  ) : null}
                </div>
                {dailyDeskPriorityItems.length > 0 ? (
                  <div className="mt-3 grid gap-3">
                    {dailyDeskPriorityItems.map((item, index) => {
                      const stockName = item?.stock?.koreanName ?? item?.stock?.name ?? "종목명 확인 필요";
                      const symbol = item?.stock?.symbol ?? "코드 확인 필요";
                      const riskLevel =
                        typeof item?.riskLevel === "string" ? item.riskLevel : undefined;
                      const aiSummary =
                        typeof item?.aiSummary === "string" && item.aiSummary.trim().length > 0
                          ? item.aiSummary
                          : "우선 확인이 필요한 흐름이 감지되었습니다.";

                      return (
                        <div
                          key={`${symbol}-${index}`}
                          className="rounded-lg border border-line bg-white p-3 shadow-soft dark:border-dark-line dark:bg-dark-panel"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="truncate text-base font-bold text-ink dark:text-white">
                                {stockName}
                              </p>
                              <p className="mt-1 text-xs font-semibold text-slate-400">{symbol}</p>
                            </div>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:bg-slate-900/70 dark:text-slate-300">
                              {getPriorityStatus(riskLevel)}
                            </span>
                          </div>
                          <p className="mt-3 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                            {aiSummary}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-2 text-lg font-bold leading-8 text-ink dark:text-white">
                    관심종목과 보유종목을 기준으로 우선 확인 종목이 표시됩니다.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="mt-4">
            <ShareCard
              title="오늘의 AI 주식 브리핑"
              subtitle="매일 아침, AI가 내 한국 주식 리스크를 체크합니다."
              statusLabel="Daily Desk"
              mainText="오늘은 추격매수보다 리스크 관리가 우선입니다."
              items={[
                `오늘 우선 확인 종목 ${riskSummaryStatuses.length}개`,
                `리스크 확인 ${riskCount}개`,
                `관망 ${watchCount}개`,
                `관심 ${interestCount}개`
              ]}
              dateLabel={todayLabel}
              sourceLabel="관심/우선 확인 종목 기준"
              disclaimer="AI 보조 분석이며, 투자 조언이 아닙니다."
              ctaText="KRX Insight에서 오늘의 흐름을 더 확인하세요."
              triggerLabel="오늘의 브리핑 공유하기"
            />
          </div>
        </div>
      </section>

      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.58fr)]">
        <div className="grid min-w-0 gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                데이터 안내
              </p>
              <h2 className="mt-2 text-lg font-bold text-ink dark:text-white">
                일부 시장 지표는 준비 중입니다.
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                종목별 현재가는 상세 페이지에서 확인할 수 있습니다.
              </p>
            </div>
            <div className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                로그인 안내
              </p>
              <h2 className="mt-2 text-lg font-bold text-ink dark:text-white">
                관심종목 관리가 더 쉬워집니다.
              </h2>
              <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                클라우드 동기화와 리스크 기록은 순차적으로 제공됩니다.
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">
                  시장 확인
                </p>
                <h2 className="mt-1 text-lg font-bold tracking-tight text-ink dark:text-white sm:text-xl">
                  한국 시장 요약
                </h2>
                <p className="mt-1.5 max-w-2xl text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                  일별 지수와 주요 종목 흐름을 가볍게 확인할 수 있습니다.
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
    </main>
  );
}
