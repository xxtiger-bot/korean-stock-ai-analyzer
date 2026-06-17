import { LocalHoldingsManager } from "@/components/portfolio/local-holdings-manager";
import { PortfolioRiskRadar } from "@/components/portfolio-risk-radar";
import { getStocksWithPreferredQuote, searchStocks } from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type PortfolioPageProps = {
  searchParams?: {
    add?: string | string[];
    name?: string | string[];
  };
};

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PortfolioPage({ searchParams }: PortfolioPageProps) {
  const allStocks = await searchStocks("");
  const rawStocks = Array.isArray(allStocks) ? allStocks : [];
  const safeStocks =
    rawStocks.length > 0 ? await getStocksWithPreferredQuote(rawStocks) : [];
  const initialSymbol = firstParam(searchParams?.add)?.trim().toUpperCase() ?? "";
  const initialStockName = firstParam(searchParams?.name)?.trim() ?? "";

  return (
    <div className="pb-8">
      <section className="mx-auto mt-4 w-full max-w-5xl px-3 sm:px-5 lg:px-6">
        <div className="rounded-lg border border-line bg-slate-50/80 px-4 py-3 dark:border-dark-line dark:bg-slate-900/50">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">로그인 안내</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            로그인하면 관심종목 관리와 향후 클라우드 동기화가 쉬워집니다.
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            클라우드 동기화와 리스크 기록은 순차적으로 제공됩니다.
          </p>
        </div>
      </section>
      <LocalHoldingsManager
        stocks={safeStocks}
        initialSymbol={initialSymbol}
        initialStockName={initialStockName}
      />
      <PortfolioRiskRadar stocks={safeStocks} />
    </div>
  );
}
