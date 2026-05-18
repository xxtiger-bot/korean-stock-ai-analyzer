import { notFound } from "next/navigation";
import { StockDetailClient } from "@/components/stock-detail-client";
import { getStockCandles, getStockDetail } from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeRouteCode(code: string) {
  return decodeURIComponent(code).trim().toUpperCase();
}

export default async function StockPage({ params }: { params: { code: string } }) {
  const code = normalizeRouteCode(params.code);

  const [stock, candles] = await Promise.all([
    getStockDetail(code),
    getStockCandles(code)
  ]);

  if (!stock || stock.symbol !== code) {
    notFound();
  }

  return (
    <StockDetailClient
      stock={stock}
      candles={candles}
    />
  );
}
