import { PricingPageClient } from "@/components/pricing-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PricingPage() {
  return <PricingPageClient />;
}
