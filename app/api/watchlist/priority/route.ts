import { NextResponse } from "next/server";
import { getWatchlistPriority } from "@/lib/stock-provider";
import { DISCLAIMER, type RiskLevel } from "@/lib/insights";
import { formatKRW, formatPercent } from "@/lib/format";
import type { Stock } from "@/lib/types";

export const dynamic = "force-dynamic";

type WatchlistPriorityItem = {
  stock: Stock;
  priority: number;
  riskLevel: RiskLevel;
  reasons: string[];
  focus: string;
  whyToday: string;
  briefingLine: string;
  dataSource?: string;
};

function getDataSource(stock: Stock) {
  return stock.tags.some((tag) => tag.toLowerCase() === "data.go.kr") ? "data.go.kr" : "mock";
}

function generatedAt() {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date());
}

function isHighRisk(level: RiskLevel) {
  return level === "매우 높음" || level === "높음" || level === "위험 높음" || level === "신중 관찰";
}

function createDailyReport(items: WatchlistPriorityItem[]) {
  if (items.length === 0) {
    return [
      "오늘 우선 확인 종목 TOP 3",
      "- 관심종목을 추가하면 오늘 우선 확인해야 할 종목을 자동으로 정리해드립니다.",
      "",
      "주요 변동 요약",
      "- 아직 분석할 관심종목이 없습니다.",
      "",
      "리스크가 높아진 종목",
      "- 해당 없음",
      "",
      "관심 유지 종목",
      "- 해당 없음",
      "",
      "내일 체크 포인트",
      "- 관심종목 추가 후 MA20, RSI, 거래량 변화가 함께 움직이는지 참고 관찰합니다.",
      "",
      "면책 문구",
      DISCLAIMER
    ].join("\n");
  }

  const top = items.slice(0, 3);
  const highRisk = items.filter((item) => isHighRisk(item.riskLevel)).slice(0, 3);
  const keepWatching = items.filter((item) => !isHighRisk(item.riskLevel)).slice(0, 3);
  const highRiskLines =
    highRisk.length > 0
      ? highRisk.map(
          (item) =>
            `- ${item.stock.koreanName}: ${item.riskLevel} 구간입니다. ${item.focus}`
        )
      : ["- 매우 높은 리스크 신호가 두드러진 종목은 없습니다."];
  const keepWatchingLines =
    keepWatching.length > 0
      ? keepWatching.map(
          (item) =>
            `- ${item.stock.koreanName}: ${item.reasons.slice(0, 2).join(", ")} 흐름을 참고 관찰합니다.`
        )
      : ["- 관심 유지 종목은 우선순위 상위 종목 변화를 먼저 확인합니다."];

  return [
    "오늘 우선 확인 종목 TOP 3",
    ...top.map(
      (item, index) =>
        `${index + 1}. ${item.stock.koreanName}(${item.stock.symbol}) · ${item.priority}점 · ${item.riskLevel} · ${item.focus}`
    ),
    "",
    "주요 변동 요약",
    ...items.slice(0, 5).map(
      (item) =>
        `- ${item.stock.koreanName}: 최근 종가 ${formatKRW(item.stock.price)}, 등락률 ${formatPercent(
          item.stock.changeRate
        )}, ${item.stock.date ? `${item.stock.date} 기준, ` : ""}${item.reasons.slice(0, 2).join(", ")}`
    ),
    "",
    "리스크가 높아진 종목",
    ...highRiskLines,
    "",
    "관심 유지 종목",
    ...keepWatchingLines,
    "",
    "내일 체크 포인트",
    "- MA20 위/아래 위치가 유지되는지 확인합니다.",
    "- RSI 70 이상 과열권 또는 35 이하 침체권 진입 여부를 참고 관찰합니다.",
    "- 거래량 확대가 가격 유지와 함께 나타나는지 확인합니다.",
    "",
    "면책 문구",
    DISCLAIMER
  ].join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { symbols?: unknown };
    const symbols = Array.isArray(body.symbols)
      ? body.symbols
          .filter((symbol): symbol is string => typeof symbol === "string")
          .map((symbol) => symbol.trim().toUpperCase())
          .filter(Boolean)
      : [];
    const codes = Array.from(new Set(symbols));
    const priorities = ((await getWatchlistPriority(codes)) ?? []) as WatchlistPriorityItem[];
    const enriched = priorities.map((item) => ({
      ...item,
      dataSource: getDataSource(item.stock)
    }));

    return NextResponse.json({
      generatedAt: generatedAt(),
      dataSource: enriched.some((item) => item.dataSource === "data.go.kr")
        ? "data.go.kr"
        : "mock",
      priorities: enriched,
      report: createDailyReport(enriched)
    });
  } catch (error) {
    console.error(
      "[watchlist-priority] Failed to generate watchlist priority.",
      error instanceof Error ? error.message : error
    );

    return NextResponse.json({
      generatedAt: generatedAt(),
      dataSource: "mock",
      priorities: [],
      report: createDailyReport([])
    });
  }
}
