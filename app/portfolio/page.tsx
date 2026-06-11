import { LocalHoldingsManager } from "@/components/portfolio/local-holdings-manager";
import { PortfolioRiskRadar } from "@/components/portfolio-risk-radar";
import { searchStocks } from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortfolioPage() {
  const allStocks = await searchStocks("");
  const safeStocks = Array.isArray(allStocks) ? allStocks : [];

  return (
    <div className="pb-8">
      <LocalHoldingsManager stocks={safeStocks} />
      <PortfolioRiskRadar stocks={safeStocks} />
    </div>
  );
}
