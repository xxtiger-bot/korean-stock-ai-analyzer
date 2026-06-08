<<<<<<< HEAD
import { PortfolioPageClient } from "@/components/portfolio-page-client";
import { getMarketOverview } from "@/lib/stock-provider";
=======
import { PortfolioRiskRadar } from "@/components/portfolio-risk-radar";
import { searchStocks } from "@/lib/stock-provider";
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PortfolioPage() {
<<<<<<< HEAD
  const marketOverview = await getMarketOverview();
  const signals = Array.isArray(marketOverview?.signals) ? marketOverview.signals : [];

  return <PortfolioPageClient signals={signals} />;
=======
  const allStocks = await searchStocks("");
  const safeStocks = Array.isArray(allStocks) ? allStocks : [];

  return <PortfolioRiskRadar stocks={safeStocks} />;
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
}
