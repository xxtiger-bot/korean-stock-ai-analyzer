import { LocalHoldingsManager } from "@/components/portfolio/local-holdings-manager";
import { PortfolioRiskRadar } from "@/components/portfolio-risk-radar";
import { searchStocks } from "@/lib/stock-provider";

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
  const safeStocks = Array.isArray(allStocks) ? allStocks : [];
  const initialSymbol = firstParam(searchParams?.add)?.trim().toUpperCase() ?? "";
  const initialStockName = firstParam(searchParams?.name)?.trim() ?? "";

  return (
    <div className="pb-8">
      <LocalHoldingsManager
        stocks={safeStocks}
        initialSymbol={initialSymbol}
        initialStockName={initialStockName}
      />
      <PortfolioRiskRadar stocks={safeStocks} />
    </div>
  );
}
