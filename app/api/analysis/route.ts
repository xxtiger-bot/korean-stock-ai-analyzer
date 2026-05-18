import OpenAI from "openai";
import { NextResponse } from "next/server";
import { DISCLAIMER } from "@/lib/insights";
import { getStockCandles, getStockDetail, getTechnicalIndicators } from "@/lib/stock-provider";
import type { AiReport, Candle, Stock, TechnicalPoint } from "@/lib/types";

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
};

function formatKRW(value: number) {
  return `${Math.round(value).toLocaleString("ko-KR")}원`;
}

function formatPercent(value: number) {
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatNumber(value: number) {
  return Math.round(value).toLocaleString("ko-KR");
}

function percentGap(price: number, baseline: number | null) {
  if (!baseline) return 0;
  return ((price - baseline) / baseline) * 100;
}

function getDataSource(stock: Stock) {
  return stock.tags.some((tag) => tag.toLowerCase() === "data.go.kr") ? "data.go.kr" : "mock";
}

function getMacdLabel(point: TechnicalPoint) {
  if (point.macdHistogram > 0) return "강세 우위";
  if (point.macdHistogram < 0) return "약세 우위";
  return "중립";
}

function getRsiLabel(rsi: number | null) {
  if (rsi === null) return "확인 필요";
  if (rsi >= 70) return "단기 과열권";
  if (rsi <= 30) return "과매도권";
  if (rsi >= 55) return "상승 탄력 우위";
  if (rsi <= 45) return "회복 확인 필요";
  return "중립권";
}

function createReportContext(
  stock: Stock,
  candles: Candle[],
  technicalSeries: TechnicalPoint[]
): ReportContext {
  const latest = technicalSeries[technicalSeries.length - 1];
  const recent20 = technicalSeries.slice(-20);
  const high20 = Math.max(...recent20.map((item) => item.high));
  const low20 = Math.min(...recent20.map((item) => item.low));
  const supportPrice = stock.supportPrice || low20 || latest.close;
  const resistancePrice = stock.resistancePrice || high20 || latest.close;

  return {
    stock: {
      name: stock.koreanName,
      code: stock.symbol,
      market: stock.market,
      price: stock.price,
      changeRate: stock.changeRate,
      volume: stock.volume,
      marketCap: stock.marketCap,
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
    }))
  };
}

function createLocalReport(context: ReportContext): AiReport {
  const { stock, technical } = context;
  const latestCandle = context.recentCandles[context.recentCandles.length - 1];
  const firstCandle = context.recentCandles[0];
  const recentMove = firstCandle ? percentGap(latestCandle.close, firstCandle.close) : 0;
  const aboveMa20 = technical.ma20 ? stock.price >= technical.ma20 : false;
  const aboveMa60 = technical.ma60 ? stock.price >= technical.ma60 : false;
  const nearSupport = stock.price <= technical.supportPrice * 1.03;
  const nearResistance = stock.price >= technical.resistancePrice * 0.97;
  const rsiText = technical.rsi === null ? "N/A" : technical.rsi.toFixed(1);
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
    trend: `${stock.name}(${stock.code})는 ${stock.market} 종목으로 현재가 ${formatKRW(
      stock.price
    )}, 당일 등락률 ${formatPercent(stock.changeRate)}를 기록했습니다. 최근 K선 기준 10거래일 변화율은 ${formatPercent(
      recentMove
    )}이며, MA20 대비 위치는 ${formatPercent(technical.ma20Gap)}입니다. 데이터 출처는 ${stock.dataSource}입니다.`,
    technical: `MA5 ${technical.ma5 ? formatKRW(technical.ma5) : "확인 필요"}, MA20 ${
      technical.ma20 ? formatKRW(technical.ma20) : "확인 필요"
    }, MA60 ${technical.ma60 ? formatKRW(technical.ma60) : "확인 필요"}입니다. RSI는 ${rsiText}로 ${getRsiLabel(
      technical.rsi
    )}이며, MACD는 ${macdLabel} 상태입니다. 20일 고점은 ${formatKRW(
      technical.high20
    )}, 20일 저점은 ${formatKRW(technical.low20)}입니다.`,
    risk: `${nearResistance ? "현재가가 20일 고점권에 가까워 단기 변동성 확대를 신중하게 관찰해야 합니다. " : ""}${
      nearSupport ? "현재가가 20일 저점권에 가까워 지지 확인이 필요합니다. " : ""
    }거래량은 ${formatNumber(stock.volume)}주이며, 시가총액은 ${formatKRW(
      stock.marketCap
    )}입니다. 가격이 ${aboveMa20 ? "MA20 위" : "MA20 아래"}에 있고 ${
      aboveMa60 ? "MA60 위" : "MA60 아래"
    }에 있어 추세 확인과 리스크 관리가 함께 필요합니다.`,
    watchPoints: [
      `참고 지지권 ${formatKRW(technical.supportPrice)} 부근에서 종가가 유지되는지 관찰`,
      `참고 저항권 ${formatKRW(technical.resistancePrice)} 부근에서 거래량이 증가하거나 둔화되는지 확인`,
      `MA20 ${technical.ma20 ? formatKRW(technical.ma20) : "확인 필요"} 기준 이탈 또는 재회복 여부 관찰`,
      `RSI ${rsiText}가 과열권 또는 회복권으로 이동하는지 확인`
    ],
    shortTermCheckPoints: [
      `최근 K선 종가가 MA5 ${technical.ma5 ? formatKRW(technical.ma5) : "확인 필요"} 위에서 유지되는지 확인`,
      `MACD 히스토그램 ${technical.macdHistogram.toFixed(2)}의 방향성이 2~3거래일 이어지는지 관찰`,
      `거래량 ${formatNumber(stock.volume)}주가 최근 흐름 대비 확대되는지 참고`,
      `20일 범위 ${formatKRW(technical.low20)}~${formatKRW(technical.high20)} 안에서 변동성이 커지는지 점검`
    ]
  };
}

function normalizeList(value: unknown, fallback: string[]) {
  return Array.isArray(value) && value.length > 0
    ? value.filter((item): item is string => typeof item === "string").slice(0, 6)
    : fallback;
}

function normalizeReport(report: Partial<AiReport>, fallback: AiReport): AiReport {
  return {
    trend: report.trend || fallback.trend,
    technical: report.technical || fallback.technical,
    risk: report.risk || fallback.risk,
    watchPoints: normalizeList(report.watchPoints, fallback.watchPoints),
    shortTermCheckPoints: normalizeList(
      report.shortTermCheckPoints,
      fallback.shortTermCheckPoints
    )
  };
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const symbol = String(body?.symbol ?? "").trim().toUpperCase();

  const [stock, candles, technicalSeries] = await Promise.all([
    getStockDetail(symbol),
    getStockCandles(symbol),
    getTechnicalIndicators(symbol)
  ]);

  if (!stock) {
    return NextResponse.json({ message: "Unknown symbol" }, { status: 404 });
  }

  if (!candles || candles.length === 0 || technicalSeries.length === 0) {
    return NextResponse.json({ message: "No market data" }, { status: 404 });
  }

  const context = createReportContext(stock, candles, technicalSeries);
  const fallback = createLocalReport(context);

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
            "당신은 한국 주식 핀테크 SaaS의 증권 분석 리포트 작성자입니다. 반드시 엄격한 JSON만 반환하세요. 키는 trend, technical, risk, watchPoints, shortTermCheckPoints입니다. 모든 문장은 자연스러운 한국어로 작성하세요. 매수, 매도, 추천, 목표가, 수익 보장 표현은 금지합니다. 관찰, 신중, 확인 필요, 리스크 관리, 참고 정보라는 표현을 사용하세요."
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
            disclaimer: DISCLAIMER
          })
        }
      ]
    });

    const content = completion.choices[0]?.message?.content;
    if (!content) throw new Error("Empty OpenAI response");

    const parsed = JSON.parse(content) as Partial<AiReport>;

    return NextResponse.json({
      source: "openai",
      generatedAt: new Date().toISOString(),
      report: normalizeReport(parsed, fallback)
    });
  } catch {
    return NextResponse.json({
      source: "local",
      generatedAt: new Date().toISOString(),
      report: fallback
    });
  }
}
