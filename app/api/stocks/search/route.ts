import { NextResponse } from "next/server";
import { getStocksWithPreferredQuote, searchStocks } from "@/lib/stock-provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") ?? "";
  const results = await searchStocks(keyword);
  const normalizedResults = await getStocksWithPreferredQuote(
    Array.isArray(results) ? results : []
  );

  return NextResponse.json({
    results: normalizedResults.slice(0, 12)
  });
}
