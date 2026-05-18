import { NextResponse } from "next/server";
import { searchStocks } from "@/lib/stock-provider";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const keyword = searchParams.get("keyword") ?? "";
  const results = await searchStocks(keyword);

  return NextResponse.json({
    results: results.slice(0, 12)
  });
}
