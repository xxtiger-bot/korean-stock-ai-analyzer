import OpenAI from "openai";
import { NextResponse } from "next/server";
import { DISCLAIMER } from "@/lib/insights";
import {
  getForeignOwnership,
  getStockCandles,
  getStockDetail,
  getTechnicalIndicators
} from "@/lib/stock-provider";
import type {
  AiReport,
  Candle,
  ForeignOwnershipData,
  Stock,
  TechnicalPoint
} from "@/lib/types";

type ReportContext = {
  stock: {
    name: string;
    code: string;
    market: string;
    price: number;
    changeRate: number;
    volume: number;
    marketCap: number;
    dataSource: string;
    date?: string;
  };
  technical: {
    ma5: number | null;
    ma20: number | null;
    ma60: number | null;
    rsi: number | null;
    macd: number;
    macdSignal: number;
    macdHistogram: number;
    supportPrice: number;
    resistancePrice: number;
    high20: number;
    low20: number;
    ma20Gap: number;
  };
  recentCandles: Array<{
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
  }>;
  foreignOwnership: {
    ratio: number | null;
    holdingQty: number | null;
    limitQty: number | null;
    exhaustionRate: number | null;
    source: string;
    updatedAt?: string;
  };
};

const DATA_BASIS_NOTICE =
  "본 분석은 data.go.kr 일별 종가 데이터를 기준으로 생성되었습니다.";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function safeNumber(value: number | null | undefined, fallback = 0) {
  return Number.isFinite(value) ? Number(value) : fallback;
}

function toText(value: unknown, fallback: string): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  if (typeof value === "boolean") return value ? "확인됨" : "미확인";
  if (Array.isArray(value)) {
    const text = value.map((item) => toText(item, "")).filter(Boolean).join("\n");
    return text || fallback;
  }
  if (isRecord(value)) {
    const text = Object.values(value).map((item) => toText(item, "")).filter(Boolean).join("\n");
    return text || fallback;
  }
  return fallback;
}

function toTextList(value: unknown, fallback: string[]) {
  if (Array.isArray(value)) {
    const list = value.map((item) => toText(item, "")).filter(Boolean).slice(0, 6);
    return list.length > 0 ? list : fallback;
  }
  if (typeof value === "string") return [value];
  if (isRecord(value)) {
    const list = Object.values(value).map((item) => toText(item, "")).filter(Boolean).slice(0, 6);
    return list.length > 0 ? list : fallback;
  }
  return fallback;
}

function formatKRW(value: number) {
  return `${Math.round(safeNumber(value)).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number) {
  const safeValue = safeNumber(value);
  const sign = safeValue > 0 ? "+" : "";
  return `${sign}${safeValue.toFixed(2)}%`;
}

function formatNumber(value: number) {
  return Math.round(safeNumber(value)).toLocaleString("ko-KR");
}

function percentGap(price: number, baseline: number | null) {
  const safeBaseline = safeNumber(baseline);
  if (!safeBaseline) return 0;
  return ((safeNumber(price) - safeBaseline) / safeBaseline) * 100;
}

function getDataSource(stock: Stock) {
  const tags = Array.isArray(stock.tags) ? stock.tags : [];
  return tags.some((tag) => tag.toLowerCase() === "data.go.kr") ? "data.go.kr" : "mock";
}

function getMacdLabel(point: TechnicalPoint) {
  if (point.macdHistogram > 0) return "강세 우위";
  if (point.macdHistogram < 0) return "약세 우위";
  return "중립";
}

function getRsiLabel(rsi: number | null) {
  if (rsi === null) return "확인 필요";
  if (rsi >= 70) return "단기 과열권";
  if (rsi <= 30) return "침체권";
  if (rsi >= 55) return "상승 탄력 우위";
  if (rsi <= 45) return "회복 확인 필요";
  return "중립권";
}

function createReportContext(
  stock: Stock,
  candles: Candle[],
  technicalSeries: TechnicalPoint[],
  foreignOwnership: ForeignOwnershipData | null
): ReportContext {
  const latest = technicalSeries[technicalSeries.length - 1];
  const recent20 = technicalSeries.slice(-20);
  const high20 = Math.max(...recent20.map((item) => item.high).filter(Number.isFinite), latest.close);
  const low20 = Math.min(...recent20.map((item) => item.low).filter(Number.isFinite), latest.close);
  const supportPrice = stock.supportPrice || low20 || latest.close;
  const resistancePrice = stock.resistancePrice || high20 || latest.close;

  return {
    stock: {
      name: stock.koreanName,
      code: stock.symbol,
      market: stock.market,
      price: safeNumber(stock.price),
      changeRate: safeNumber(stock.changeRate),
      volume: safeNumber(stock.volume),
      marketCap: safeNumber(stock.marketCap),
      dataSource: getDataSource(stock),
      date: stock.date
    },
    technical: {
      ma5: latest.ma5,
      ma20: latest.ma20,
      ma60: latest.ma60,
      rsi: latest.rsi,
      macd: latest.macd,
      macdSignal: latest.macdSignal,
      macdHistogram: latest.macdHistogram,
      supportPrice,
      resistancePrice,
      high20,
      low20,
      ma20Gap: percentGap(latest.close, latest.ma20)
    },
    recentCandles: candles.slice(-10).map((item) => ({
      date: item.date,
      open: item.open,
      high: item.high,
      low: item.low,
      close: item.close,
      volume: item.volume
    })),
    foreignOwnership: {
      ratio:
        typeof foreignOwnership?.foreignOwnershipRatio === "number" &&
        Number.isFinite(foreignOwnership.foreignOwnershipRatio)
          ? foreignOwnership.foreignOwnershipRatio
          : null,
      holdingQty:
        typeof foreignOwnership?.foreignHoldingQty === "number" &&
        Number.isFinite(foreignOwnership.foreignHoldingQty)
          ? foreignOwnership.foreignHoldingQty
          : null,
      limitQty:
        typeof foreignOwnership?.foreignLimitQty === "number" &&
        Number.isFinite(foreignOwnership.foreignLimitQty)
          ? foreignOwnership.foreignLimitQty
          : null,
      exhaustionRate:
        typeof foreignOwnership?.foreignExhaustionRate === "number" &&
        Number.isFinite(foreignOwnership.foreignExhaustionRate)
          ? foreignOwnership.foreignExhaustionRate
          : null,
      source: foreignOwnership?.source ?? "KIS 확인 필요",
      updatedAt: foreignOwnership?.updatedAt
    }
  };
}

function createLocalReport(context: ReportContext): AiReport {
  const { stock, technical, foreignOwnership } = context;
  const latestCandle = context.recentCandles[context.recentCandles.length - 1];
  const firstCandle = context.recentCandles[0];
  const recentMove = firstCandle ? percentGap(latestCandle.close, firstCandle.close) : 0;
  const aboveMa20 = technical.ma20 ? stock.price >= technical.ma20 : false;
  const aboveMa60 = technical.ma60 ? stock.price >= technical.ma60 : false;
  const nearSupport = stock.price <= technical.supportPrice * 1.03;
  const nearResistance = stock.price >= technical.resistancePrice * 0.97;
  const foreignRatioText =
    foreignOwnership.ratio === null ? "확인 필요" : `${foreignOwnership.ratio.toFixed(2)}%`;
  const hasHighForeignRatio =
    foreignOwnership.ratio !== null && foreignOwnership.ratio >= 20;
  const hasLowForeignRatio =
    foreignOwnership.ratio !== null && foreignOwnership.ratio <= 5;
  const rsiText =
    technical.rsi === null || !Number.isFinite(technical.rsi) ? "N/A" : technical.rsi.toFixed(1);
  const macdLabel = getMacdLabel({
    ...latestCandle,
    ma5: technical.ma5,
    ma20: technical.ma20,
    ma60: technical.ma60,
    rsi: technical.rsi,
    macd: technical.macd,
    macdSignal: technical.macdSignal,
    macdHistogram: technical.macdHistogram
  });

  return {
    trend: `${DATA_BASIS_NOTICE} ${stock.name}(${stock.code})는 ${stock.market} 종목으로 최근 종가 ${formatKRW(
      stock.price
    )}, 일별 등락률 ${formatPercent(stock.changeRate)}를 기록했습니다. 최근 K선 기준 10거래일 변화율은 ${formatPercent(
      recentMove
    )}이며, MA20 대비 위치는 ${formatPercent(technical.ma20Gap)}입니다. 기준일은 ${
      stock.date ?? "확인 필요"
    }이며, 데이터 출처는 ${stock.dataSource}입니다.`,
    technical: `MA5 ${technical.ma5 ? formatKRW(technical.ma5) : "확인 필요"}, MA20 ${
      technical.ma20 ? formatKRW(technical.ma20) : "확인 필요"
    }, MA60 ${technical.ma60 ? formatKRW(technical.ma60) : "확인 필요"}입니다. RSI는 ${rsiText}로 ${getRsiLabel(
      technical.rsi
    )}이며, MACD는 ${macdLabel} 상태입니다. 외국인 보유율은 ${foreignRatioText} (${foreignOwnership.source})로 수급 참고 지표입니다. 20일 고점은 ${formatKRW(
      technical.high20
    )}, 20일 저점은 ${formatKRW(technical.low20)}입니다.`,
    risk: `${nearResistance ? "최근 종가가 20일 고점권에 가까워 단기 변동성 확대를 신중하게 관찰해야 합니다. " : ""}${
      nearSupport ? "최근 종가가 20일 저점권에 가까워 지지 확인이 필요합니다. " : ""
    }거래량은 ${formatNumber(stock.volume)}주이며, 시가총액은 ${formatKRW(
      stock.marketCap
    )}입니다. 가격이 ${aboveMa20 ? "MA20 위" : "MA20 아래"}에 있고 ${
      aboveMa60 ? "MA60 위" : "MA60 아래"
    }에 있어 추세 확인과 리스크 관리가 함께 필요합니다. ${
      hasHighForeignRatio
        ? `외국인 보유율 ${foreignRatioText}로 수급 안정 참고 요인이 있으나 변화율 재확인이 필요합니다.`
        : hasLowForeignRatio
          ? `외국인 보유율 ${foreignRatioText}로 수급 변동 가능성을 신중하게 관찰해야 합니다.`
          : "외국인 보유율 변화는 후속 관찰 항목으로 확인 필요합니다."
    }`,
    watchPoints: [
      `참고 지지권 ${formatKRW(technical.supportPrice)} 부근에서 종가가 유지되는지 관찰`,
      `참고 저항권 ${formatKRW(technical.resistancePrice)} 부근에서 거래량이 증가하거나 둔화되는지 확인`,
      `MA20 ${technical.ma20 ? formatKRW(technical.ma20) : "확인 필요"} 기준 이탈 또는 재회복 여부 관찰`,
      `RSI ${rsiText}가 과열권 또는 회복권으로 이동하는지 확인`,
      `외국인 보유율(${foreignRatioText})과 소진율(${foreignOwnership.exhaustionRate === null ? "확인 필요" : `${foreignOwnership.exhaustionRate.toFixed(2)}%`}) 변화 여부 추적`
    ],
    shortTermCheckPoints: [
      `최근 K선 종가가 MA5 ${technical.ma5 ? formatKRW(technical.ma5) : "확인 필요"} 위에서 유지되는지 확인`,
      `MACD 히스토그램 ${safeNumber(technical.macdHistogram).toFixed(2)}의 방향성이 2~3거래일 이어지는지 관찰`,
      `거래량 ${formatNumber(stock.volume)}주가 최근 흐름 대비 확대되는지 참고`,
      `20일 범위 ${formatKRW(technical.low20)}~${formatKRW(technical.high20)} 안에서 변동성이 커지는지 점검`
    ],
    risks: [
      nearResistance
        ? "최근 종가가 20일 고점권에 가까워 단기 변동성 확대를 신중하게 관찰해야 합니다."
        : "20일 고점권 과열 신호는 제한적으로 관찰됩니다.",
      nearSupport
        ? "최근 종가가 20일 저점권에 가까워 지지 확인이 필요합니다."
        : "20일 저점권 이탈 위험은 제한적으로 관찰됩니다.",
      `가격이 ${aboveMa20 ? "MA20 위" : "MA20 아래"}에 있고 ${
        aboveMa60 ? "MA60 위" : "MA60 아래"
      }에 있어 추세 확인과 리스크 관리가 함께 필요합니다.`,
      hasHighForeignRatio
        ? `외국인 보유율 ${foreignRatioText}는 수급 안정 참고 요인이지만 일별 변화 재평가가 필요합니다.`
        : hasLowForeignRatio
          ? `외국인 보유율 ${foreignRatioText}로 수급 공백 가능성을 신중하게 관찰해야 합니다.`
          : "외국인 보유율 데이터 변화는 확인 필요 상태입니다."
    ]
  };
}

function ensureDataBasisNotice(report: AiReport): AiReport {
  return {
    ...report,
    trend: report.trend.includes(DATA_BASIS_NOTICE)
      ? report.trend
      : `${DATA_BASIS_NOTICE} ${report.trend}`
  };
}

function normalizeReport(report: unknown, fallback: AiReport): AiReport {
  const source = isRecord(report) ? report : {};
  const risks = toTextList(source.risks ?? source.risk, fallback.risks);

  return {
    trend: toText(source.trend, fallback.trend),
    technical: toText(source.technical, fallback.technical),
    risk: toText(source.risk ?? source.risks, risks.join("\n") || fallback.risk),
    risks,
    watchPoints: toTextList(source.watchPoints, fallback.watchPoints),
    shortTermCheckPoints: toTextList(
      source.shortTermCheckPoints,
      fallback.shortTermCheckPoints
    )
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => null);
    const symbol = String(isRecord(body) ? body.symbol ?? "" : "").trim().toUpperCase();

    const [stock, candles, technicalSeries, foreignOwnership] = await Promise.all([
      getStockDetail(symbol),
      getStockCandles(symbol),
      getTechnicalIndicators(symbol),
      getForeignOwnership(symbol)
    ]);

    if (!stock) {
      return NextResponse.json(
        {
          source: "local",
          generatedAt: new Date().toISOString(),
          report: normalizeReport(null, createEmptyReport("종목 정보를 찾을 수 없습니다."))
        },
        { status: 200 }
      );
    }

    if (!Array.isArray(candles) || candles.length === 0 || !Array.isArray(technicalSeries) || technicalSeries.length === 0) {
      return NextResponse.json(
        {
          source: "local",
          generatedAt: new Date().toISOString(),
          report: normalizeReport(null, createEmptyReport("분석할 일별 종가 데이터가 부족합니다."))
        },
        { status: 200 }
      );
    }

    const context = createReportContext(stock, candles, technicalSeries, foreignOwnership);
    const fallback = ensureDataBasisNotice(createLocalReport(context));

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        source: "local",
        generatedAt: new Date().toISOString(),
        report: fallback
      });
    }

    try {
      const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      const completion = await client.chat.completions.create({
        model: process.env.OPENAI_MODEL || "gpt-4o-mini",
        temperature: 0.25,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "당신은 한국 주식 핀테크 SaaS의 증권 분석 리포트 작성자입니다. 반드시 엄격한 JSON만 반환하세요. 키는 trend, technical, risk, risks, watchPoints, shortTermCheckPoints입니다. risks, watchPoints, shortTermCheckPoints는 반드시 문자열 배열입니다. trend, technical, risk는 반드시 문자열입니다. 모든 문장은 자연스러운 한국어로 작성하세요. stock.price는 실시간 시세가 아니라 data.go.kr 일별 최근 종가입니다. 리포트에는 반드시 '본 분석은 data.go.kr 일별 종가 데이터를 기준으로 생성되었습니다.' 문장을 포함하세요. foreignOwnership 정보를 활용해 외국인 보유율의 높고 낮음, 그리고 이후 변화 관찰 필요성을 반드시 반영하세요. 거래 실행 유도, 단정적 판단, 목표가, 수익 보장 표현은 금지합니다. 관찰, 신중, 확인 필요, 리스크 관리, 참고 정보라는 표현을 사용하세요."
          },
          {
            role: "user",
            content: JSON.stringify({
              requiredSections: [
                "추세 요약",
                "기술적 근거",
                "리스크",
                "관찰 포인트",
                "단기 체크 포인트",
                "면책 문구"
              ],
              context,
              dataBasisNotice: DATA_BASIS_NOTICE,
              disclaimer: DISCLAIMER
            })
          }
        ]
      });

      const content = completion.choices[0]?.message?.content;
      if (!content) throw new Error("Empty OpenAI response");

      const parsed = JSON.parse(content) as unknown;
      const report = ensureDataBasisNotice(normalizeReport(parsed, fallback));

      return NextResponse.json({
        source: "openai",
        generatedAt: new Date().toISOString(),
        report
      });
    } catch {
      return NextResponse.json({
        source: "local",
        generatedAt: new Date().toISOString(),
        report: fallback
      });
    }
  } catch {
    const fallback = createEmptyReport("리포트 생성 중 오류가 발생했습니다.");

    return NextResponse.json({
      source: "local",
      generatedAt: new Date().toISOString(),
      report: fallback
    });
  }
}

function createEmptyReport(message: string): AiReport {
  return {
    trend: `${DATA_BASIS_NOTICE} ${message}`,
    technical: "기술적 근거를 표시할 데이터가 부족합니다.",
    risk: "리스크 정보를 표시할 데이터가 부족합니다.",
    risks: ["리스크 정보를 표시할 데이터가 부족합니다."],
    watchPoints: ["데이터 상태를 확인한 뒤 다시 시도해 주세요."],
    shortTermCheckPoints: ["일별 종가 데이터가 정상적으로 수집되는지 확인해 주세요."]
  };
}
