import { DangerWarningList } from "@/components/danger-warning-list";
import { MarketBriefing } from "@/components/market-briefing";
import { OpportunityRadar } from "@/components/opportunity-radar";
import { PotentialRadar } from "@/components/potential-radar";
import { StockCardGrid } from "@/components/stock-card-grid";
import { StockSearch } from "@/components/stock-search";
import { StockTable } from "@/components/stock-table";
import { WatchlistPanel } from "@/components/watchlist-panel";
import {
  getMarketOverview,
  getDangerWarnings,
  getOpportunityRadar,
  getPotentialRadar,
  getPopularStocks,
  searchStocks
} from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [
    allStocks,
    popularStocks,
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
  const safeAllStocks = Array.isArray(allStocks) ? allStocks : [];
  const safePopularStocks = Array.isArray(popularStocks) ? popularStocks : [];
  const safeOpportunityRadar = Array.isArray(opportunityRadar) ? opportunityRadar : [];
  const safePotentialRadar = Array.isArray(potentialRadar) ? potentialRadar : [];
  const safeDangerWarnings = Array.isArray(dangerWarnings) ? dangerWarnings : [];
  const signals = Array.isArray(marketOverview?.signals) ? marketOverview.signals : [];
  const kospiStocks = safeAllStocks.filter((stock) => stock.market === "KOSPI").slice(0, 6);
  const kosdaqStocks = safeAllStocks.filter((stock) => stock.market === "KOSDAQ").slice(0, 6);

  return (
    <main className="mx-auto w-full max-w-7xl min-w-0 overflow-x-hidden px-3 py-3 sm:px-5 sm:py-4 lg:px-7">
      <section className="grid min-w-0 gap-3 xl:grid-cols-[minmax(0,0.92fr)_minmax(320px,0.58fr)]">
        <div className="grid min-w-0 gap-3">
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
        <div className="min-w-0">
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
        <WatchlistPanel stocks={safeAllStocks} />
        <div className="grid min-w-0 gap-3 xl:grid-cols-2">
          <StockTable title="KOSPI 주요 종목" stocks={kospiStocks} />
          <StockTable title="KOSDAQ 관심 종목" stocks={kosdaqStocks} />
        </div>
      </section>
    </main>
  );
}
