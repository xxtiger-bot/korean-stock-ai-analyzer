import { notFound } from "next/navigation";
import { StockDetailClient } from "@/components/stock-detail-client";
import {
  getForeignOwnership,
  getRealtimeQuote,
  getStockCandles,
  getStockDetail,
  validateQuoteAgainstClose
} from "@/lib/stock-provider";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function normalizeRouteCode(code: string) {
  return decodeURIComponent(code).trim().toUpperCase();
}

export default async function StockPage({ params }: { params: { code: string } }) {
  const code = normalizeRouteCode(params.code);

  const [stock, candles, realtimeQuote, foreignOwnership] = await Promise.all([
    getStockDetail(code),
    getStockCandles(code),
    getRealtimeQuote(code),
    getForeignOwnership(code)
  ]);

  if (!stock || stock.symbol !== code) {
    notFound();
  }
  const priceGuard = validateQuoteAgainstClose(realtimeQuote?.price, stock.price);
  const safeRealtimeQuote = priceGuard.status === "critical" ? null : realtimeQuote;

  return (
    <StockDetailClient
      stock={stock}
      candles={candles}
      realtimeQuote={safeRealtimeQuote}
      foreignOwnership={foreignOwnership}
      priceGuard={priceGuard}
    />
  );
}
