import { MarketBriefing } from "@/components/market-briefing";
import { OpportunityRadar } from "@/components/opportunity-radar";
import { StockCardGrid } from "@/components/stock-card-grid";
import { StockSearch } from "@/components/stock-search";
import { StockTable } from "@/components/stock-table";
import { WatchlistPanel } from "@/components/watchlist-panel";
import {
  getMarketOverview,
  getOpportunityRadar,
  getPopularStocks,
  searchStocks
} from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function Home() {
  const [allStocks, popularStocks, marketOverview, opportunityRadar] = await Promise.all([
    searchStocks(""),
    getPopularStocks(),
    getMarketOverview(),
    getOpportunityRadar()
  ]);
  const safeAllStocks = Array.isArray(allStocks) ? allStocks : [];
  const safePopularStocks = Array.isArray(popularStocks) ? popularStocks : [];
  const safeOpportunityRadar = Array.isArray(opportunityRadar) ? opportunityRadar : [];
  const signals = Array.isArray(marketOverview?.signals) ? marketOverview.signals : [];
  const kospiStocks = safeAllStocks.filter((stock) => stock.market === "KOSPI").slice(0, 6);
  const kosdaqStocks = safeAllStocks.filter((stock) => stock.market === "KOSDAQ").slice(0, 6);

  return (
    <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8">
      <section className="mb-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-normal text-brand">
                한국 시장
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
                한국 주식 대시보드
              </h1>
              <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                KRX 주요 종목, 환율, 시장 심리와 AI 기술 분석을 한 화면에서 확인합니다.
              </p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                <p className="text-xs font-bold text-slate-400">종목</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{safeAllStocks.length}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                <p className="text-xs font-bold text-slate-400">KOSPI</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{kospiStocks.length}</p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-900/60">
                <p className="text-xs font-bold text-slate-400">KOSDAQ</p>
                <p className="mt-1 text-sm font-bold text-ink dark:text-white">{kosdaqStocks.length}</p>
              </div>
            </div>
          </div>
        </div>
        <WatchlistPanel stocks={safeAllStocks} />
      </section>

      <div className="grid gap-5">
        <MarketBriefing signals={signals} />
        <OpportunityRadar items={safeOpportunityRadar} />
        <StockSearch stocks={safeAllStocks} />
        <StockCardGrid title="인기 종목" stocks={safePopularStocks} />
        <div className="grid gap-5 xl:grid-cols-2">
          <StockTable title="KOSPI 주요 종목" stocks={kospiStocks} />
          <StockTable title="KOSDAQ 관심 종목" stocks={kosdaqStocks} />
        </div>
      </div>
    </main>
  );
}
