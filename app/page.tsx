import { DangerWarningList } from "@/components/danger-warning-list";
import { FeedbackTrigger } from "@/components/feedback-trigger";
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
import { BarChart3, Cloud, CloudOff, ShieldCheck, Sparkles, Target, TrendingUp } from "lucide-react";
import {
  getMarketOverview,
  getDangerWarnings,
  getOpportunityRadar,
  getPotentialRadar,
  getPopularStocks,
  getStocksWithPreferredQuote,
  searchStocks
} from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [
    fetchedAllStocks,
    fetchedPopularStocks,
    marketOverview,
    opportunityRadar,
    potentialRadar,
    dangerWarnings
  ] = await Promise.all([
    searchStocks(""),
    getPopularStocks(),
    getMarketOverview(),
    getOpportunityRadar(),
    getPotentialRadar(),
    getDangerWarnings()
  ]);
  const allStocks = await getStocksWithPreferredQuote(
    Array.isArray(fetchedAllStocks) ? fetchedAllStocks : []
  );
  const popularStocks = await getStocksWithPreferredQuote(
    Array.isArray(fetchedPopularStocks) ? fetchedPopularStocks : []
  );

  const safeAllStocks = Array.isArray(allStocks) ? allStocks : [];
  const safePopularStocks = Array.isArray(popularStocks) ? popularStocks : [];
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
      desc: "시장 방향과 우선 확인 종목을 빠르게 요약합니다.",
      tags: ["시장 방향", "TOP 3", "리스크 요약"]
    },
    {
      title: "AI 종목 분석",
      desc: "기술지표와 리스크 포인트를 한 화면에서 확인합니다.",
      tags: ["AI 점수", "지표 해석", "관찰 포인트"]
    },
    {
      title: "보유종목 진단",
      desc: "수익률과 리스크 변화를 기준으로 보유 상태를 점검합니다.",
      tags: ["수익률", "리스크 변화", "알림 조건"]
    },
    {
      title: "기회 레이더",
      desc: "오늘 확인할 기회/위험 신호를 데이터 기반으로 정리합니다.",
      tags: ["레이더", "데이터 기준", "위험 구분"]
    }
  ] as const;
  const trustItems = [
    {
      icon: BarChart3,
      title: "데이터 출처",
      body: "KIS 현재가와 data.go.kr 일별 종가를 함께 참고합니다."
    },
    {
      icon: ShieldCheck,
      title: "로컬 모드 우선",
      body: "로그인 없이도 핵심 기능을 사용하고 브라우저에만 저장할 수 있습니다."
    },
    {
      icon: Target,
      title: "투자 참고 정보",
      body: "매수/매도 추천이 아닌 참고 정보 중심 분석 경험을 제공합니다."
    }
  ] as const;

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
      <section className="md:hidden">
        <section className="mb-3 rounded-2xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 p-4 shadow-soft dark:border-dark-line dark:from-dark-panel dark:via-slate-900/70 dark:to-slate-950">
          <p className="inline-flex items-center gap-1.5 rounded-full bg-brand/10 px-2.5 py-1 text-[11px] font-bold text-brand">
            <Sparkles className="h-3.5 w-3.5" />
            KRX Insight
          </p>
          <h1 className="mt-2 text-xl font-bold text-ink dark:text-white">한국 주식 AI 분석 대시보드</h1>
          <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
            오늘 시장 브리핑, 종목 분석, 보유종목 리스크 진단을 한 화면에서 확인하세요.
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <a
              href="#search"
              className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-4 text-sm font-bold text-white shadow-md transition hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
            >
              지금 바로 무료 테스트 시작하기
            </a>
            <a
              href="/stocks/005930"
              className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              삼성전자 분석 예시 보기
            </a>
          </div>
        </section>

        <section className="mb-3">
          <HomeBetaOnboarding compact />
        </section>

        <TodayMarketBrief
          signals={signals}
          stocks={safeAllStocks}
          sectionId="home-morning-brief"
        />

        <section className="mt-3">
          <TodayInvestmentChecklist stocks={safeAllStocks} sectionId="home-checklist" />
        </section>

        <section id="search" className="mt-3">
          <StockSearch stocks={safeAllStocks} />
        </section>

        <section id="home-interest" className="mt-3">
          <StockCardGrid title="인기 종목" stocks={mobilePopularStocks} />
        </section>

        <section className="mt-3 rounded-2xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <h2 className="text-base font-bold text-ink dark:text-white">핵심 기능 미리보기</h2>
          <div className="mt-3 grid gap-2.5">
            {previewItems.map((item) => (
              <article
                key={item.title}
                className="rounded-xl border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
              >
                <h3 className="text-sm font-bold text-ink dark:text-white">{item.title}</h3>
                <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {item.desc}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {item.tags.map((tag) => (
                    <span
                      key={`${item.title}-${tag}`}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <div className="hidden md:block">
      <section className="mb-3 rounded-3xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 p-5 shadow-soft dark:border-dark-line dark:from-dark-panel dark:via-slate-900/70 dark:to-slate-950 sm:p-6">
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_410px]">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              KRX Insight
            </p>
            <h1 className="mt-2 text-2xl font-bold text-ink dark:text-white sm:text-3xl">한국 주식 AI 분석 대시보드</h1>
            <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
              오늘 시장 브리핑부터 종목 분석, 보유종목 리스크 점검까지 한 번에 확인할 수 있습니다.
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              data.go.kr 데이터는 일별 종가 기준이며 실시간 시세가 아닙니다.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href="#search"
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg dark:bg-brand dark:hover:bg-blue-500"
              >
                지금 바로 무료 테스트 시작하기
              </a>
              <a
                href="/stocks/005930"
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

          <aside className="rounded-2xl border border-line bg-white/95 p-4 shadow-soft dark:border-dark-line dark:bg-slate-900/75">
            <div className="mb-2 flex items-center justify-between">
              <p className="text-xs font-bold text-brand">대시보드 미리보기</p>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                LIVE
              </span>
            </div>
            <div className="rounded-xl border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
              <div className="flex items-center justify-between">
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
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                <div className="h-full w-[71%] rounded-full bg-brand" />
              </div>
              <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                데이터 기준: KIS + data.go.kr
              </p>
            </div>
          </aside>
        </div>
      </section>
      <section className="mb-3">
        <HomeBetaOnboarding />
      </section>
      <section className="mb-3">
        <TodayMarketBrief
          signals={signals}
          stocks={safeAllStocks}
          sectionId="home-morning-brief"
        />
      </section>
      <section className="mb-3">
        <TodayInvestmentChecklist stocks={safeAllStocks} sectionId="home-checklist" />
      </section>
      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.58fr)]">
        <div id="home-market" className="grid min-w-0 gap-3 scroll-mt-32">
          <div className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-normal text-brand">
                  한국 시장
                </p>
                <h1 className="mt-1 text-xl font-bold tracking-normal text-ink dark:text-white sm:text-2xl">
                  한국 주식 대시보드
                </h1>
                <p className="mt-1 max-w-2xl text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
                  data.go.kr 데이터는 일별 종가 기준이며 실시간 시세가 아닙니다.
                </p>
              </div>
              <div className="grid w-full grid-cols-3 gap-2 text-center sm:w-auto">
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <p className="text-[11px] font-bold text-slate-400">종목</p>
                  <p className="mt-0.5 text-sm font-bold text-ink dark:text-white">
                    {safeAllStocks.length}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <p className="text-[11px] font-bold text-slate-400">KOSPI</p>
                  <p className="mt-0.5 text-sm font-bold text-ink dark:text-white">
                    {kospiStocks.length}
                  </p>
                </div>
                <div className="rounded-md bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                  <p className="text-[11px] font-bold text-slate-400">KOSDAQ</p>
                  <p className="mt-0.5 text-sm font-bold text-ink dark:text-white">
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

      <section className="mt-3 grid min-w-0 gap-3 2xl:grid-cols-[minmax(0,1.15fr)_minmax(360px,0.85fr)]">
        <OpportunityRadar items={safeOpportunityRadar} />
        <StockCardGrid title="인기 종목" stocks={safePopularStocks} />
      </section>

      <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-2">
        <PotentialRadar items={safePotentialRadar} />
        <DangerWarningList items={safeDangerWarnings} />
      </section>

      <section className="mt-3 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink dark:text-white">핵심 기능 미리보기</h2>
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            주요 기능 4가지
          </span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {previewItems.map((item) => (
            <article
              key={item.title}
              className="rounded-xl border border-line bg-slate-50 p-3 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-dark-line dark:bg-slate-900/50"
            >
              <h3 className="text-sm font-bold text-ink dark:text-white">{item.title}</h3>
              <p className="mt-1 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                {item.desc}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={`${item.title}-${tag}`}
                    className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <h2 className="text-base font-bold text-ink dark:text-white">로컬 모드</h2>
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
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <h2 className="text-base font-bold text-ink dark:text-white">클라우드 동기화</h2>
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

      <section className="mt-3 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-base font-bold text-ink dark:text-white">신뢰와 데이터 기준</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          {trustItems.map((item) => {
            const Icon = item.icon;
            return (
              <article
                key={item.title}
                className="rounded-xl border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
              >
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
      </section>

      <section className="mt-3 grid min-w-0 gap-3 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)]">
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

      <section className="mt-3 rounded-2xl border border-brand/25 bg-gradient-to-r from-white to-blue-50 p-5 shadow-soft dark:border-brand/35 dark:from-dark-panel dark:to-slate-900">
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
