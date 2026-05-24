import { MyPagePageClient } from "@/components/mypage-page-client";
import { getMarketOverview } from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MyPage() {
  const marketOverview = await getMarketOverview();
  const signals = Array.isArray(marketOverview?.signals) ? marketOverview.signals : [];

  return <MyPagePageClient signals={signals} />;
}
