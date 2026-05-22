import { NextResponse } from "next/server";

import { getMarketDataDebugSnapshot } from "@/lib/market-data-debug";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const snapshot = await getMarketDataDebugSnapshot();
    return NextResponse.json(snapshot, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: "시장 데이터 진단 생성에 실패했습니다.",
        error: error instanceof Error ? error.message : "unknown error"
      },
      { status: 500 }
    );
  }
}

