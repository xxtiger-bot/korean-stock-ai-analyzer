import { DangerWarningList } from "@/components/danger-warning-list";
import { MarketBriefing } from "@/components/market-briefing";
import { OpportunityRadar } from "@/components/opportunity-radar";
import { PotentialRadar } from "@/components/potential-radar";
import { StockCardGrid } from "@/components/stock-card-grid";
import { StockSearch } from "@/components/stock-search";
import { StockTable } from "@/components/stock-table";
import { TodayMarketBrief } from "@/components/today-market-brief";
import { TodayInvestmentChecklist } from "@/components/today-investment-checklist";
import { WatchlistPanel } from "@/components/watchlist-panel";
import {
  getMarketOverview,
  getDangerWarnings,
  getOpportunityRadar,
  getPotentialRadar,
  getPopularStocks,
  getStocksWithPreferredQuote,
  searchStocks
} from "@/lib/stock-provider";
import { formatPercent } from "@/lib/format";
import type { MarketSignal } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatMarketSignalValue(signal: MarketSignal) {
  const safeValue = Number.isFinite(signal.value) ? signal.value : null;
  if (safeValue === null) return "데이터 없음";
  if (signal.code === "KRW/USD") {
    return `${safeValue.toLocaleString("ko-KR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}원`;
  }
  if (signal.code === "심리 지수") {
    return `${Math.round(safeValue)}점`;
  }
  return safeValue.toLocaleString("ko-KR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
  const mobileSignals = signals.slice(0, 3);
  const kospiStocks = safeAllStocks.filter((stock) => stock.market === "KOSPI").slice(0, 6);
  const kosdaqStocks = safeAllStocks.filter((stock) => stock.market === "KOSDAQ").slice(0, 6);
  const mobilePopularStocks = safePopularStocks.slice(0, 3);

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
      <section className="md:hidden">
        <TodayMarketBrief
          signals={signals}
          stocks={safeAllStocks}
          sectionId="home-morning-brief"
        />

        <section className="mt-3">
          <TodayInvestmentChecklist stocks={safeAllStocks} sectionId="home-checklist" />
        </section>

        <section id="home-market" className="mt-3 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-xs font-bold tracking-normal text-brand">시장 요약</p>
              <h2 className="mt-1 text-base font-bold text-ink dark:text-white">오늘의 핵심 지표</h2>
            </div>
            <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
              data.go.kr 기준
            </span>
          </div>
          <div className="mt-3 grid gap-2">
            {mobileSignals.map((signal) => (
              <article key={`mobile-signal-${signal.code}`} className="rounded-md border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/60">
                <p className="text-[11px] font-bold text-slate-400">{signal.code}</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{formatMarketSignalValue(signal)}</p>
                <p className={`mt-1 text-xs font-bold ${signal.change >= 0 ? "text-red-600 dark:text-red-300" : "text-blue-600 dark:text-blue-300"}`}>
                  {signal.change > 0 ? "+" : ""}
                  {signal.change.toFixed(signal.code === "심리 지수" ? 0 : 2)} · {formatPercent(signal.changeRate)}
                </p>
              </article>
            ))}
          </div>
          <details className="mt-3 rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
            <summary className="cursor-pointer list-none text-xs font-bold text-slate-600 dark:text-slate-300">
              시장 요약 자세히 보기
            </summary>
            <div className="mt-3">
              <MarketBriefing signals={signals} />
            </div>
          </details>
        </section>

        <section id="search" className="mt-3">
          <StockSearch stocks={safeAllStocks} />
        </section>

        <section className="mt-3">
          <StockCardGrid title="인기 종목" stocks={mobilePopularStocks} />
        </section>
      </section>

      <div className="hidden md:block">
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
      </div>
    </main>
  );
}
