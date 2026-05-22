import { MarketDataDebugClient } from "@/components/market-data-debug-client";
import { getMarketDataDebugSnapshot } from "@/lib/market-data-debug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MarketDataDebugPage() {
  const snapshot = await getMarketDataDebugSnapshot();
  return <MarketDataDebugClient initialSnapshot={snapshot} />;
}

