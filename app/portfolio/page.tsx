import { PortfolioPageClient } from "@/components/portfolio-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PortfolioPage() {
  return <PortfolioPageClient />;
}
