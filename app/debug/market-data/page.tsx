import type { Metadata } from "next";
import { MarketDataDebugClient } from "@/components/market-data-debug-client";
import { getMarketDataDebugSnapshot } from "@/lib/market-data-debug";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false
  }
};

export default async function MarketDataDebugPage() {
  const snapshot = await getMarketDataDebugSnapshot();
  return <MarketDataDebugClient initialSnapshot={snapshot} />;
}
