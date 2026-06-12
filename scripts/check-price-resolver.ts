import {
  resolveStockDisplayPrice,
  type ResolvedPriceConfidence,
  type ResolvedPriceKind,
  type ResolvedPriceSource
} from "../lib/market/price-resolver";

type ExpectedResult = {
  priceKind: ResolvedPriceKind;
  source: ResolvedPriceSource;
  aiConfidence: ResolvedPriceConfidence;
  basisKo: string;
};

type PriceResolverCase = {
  symbol: string;
  name: string;
  expected: ExpectedResult;
  input: Parameters<typeof resolveStockDisplayPrice>[0];
};

function runCase(testCase: PriceResolverCase) {
  const result = resolveStockDisplayPrice(testCase.input);
  const pass =
    result.priceKind === testCase.expected.priceKind &&
    result.source === testCase.expected.source &&
    result.aiConfidence === testCase.expected.aiConfidence &&
    result.basisKo === testCase.expected.basisKo;

  console.log(
    [
      `symbol=${testCase.symbol}`,
      `name=${testCase.name}`,
      `expected=${testCase.expected.priceKind}`,
      `actual=${result.priceKind}`,
      `source=${result.source}`,
      `basis=${result.basisKo}`,
      `ai=${result.aiConfidence}`,
      `pass=${pass ? "PASS" : "FAIL"}`
    ].join(" | ")
  );

  return pass;
}

const cases: PriceResolverCase[] = [
  {
    symbol: "005930",
    name: "KIS 005930 = 299000 => kis_current",
    expected: {
      priceKind: "kis_current",
      source: "KIS",
      aiConfidence: "high",
      basisKo: "KIS 기준"
    },
    input: {
      symbol: "005930",
      kisQuote: { price: 299000, updatedAt: "2026-06-11 10:00" },
      kisQuoteSource: "KIS",
      dailyClose: { price: 302500, baseDate: "2026-06-10", updatedAt: "2026-06-10" },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 302500,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "005930",
    name: "KIS null, externalReference 005930 = 299000 => external_reference",
    expected: {
      priceKind: "external_reference",
      source: "Yahoo",
      aiConfidence: "medium",
      basisKo: "외부 참고 기준"
    },
    input: {
      symbol: "005930",
      kisQuote: null,
      kisQuoteSource: "none",
      externalReferencePrice: 299000,
      externalReferenceSource: "Yahoo",
      externalReferenceUpdatedAt: "2026-06-11 10:05",
      dailyClose: { price: 302500, baseDate: "2026-06-10", updatedAt: "2026-06-10" },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 302500,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "005930",
    name: "KIS null, externalReference null, data.go.kr 005930 = 302500 => recent_close",
    expected: {
      priceKind: "recent_close",
      source: "data.go.kr",
      aiConfidence: "medium",
      basisKo: "data.go.kr 기준"
    },
    input: {
      symbol: "005930",
      kisQuote: null,
      kisQuoteSource: "none",
      externalReferencePrice: null,
      externalReferenceSource: "none",
      dailyClose: { price: 302500, baseDate: "2026-06-10", updatedAt: "2026-06-10" },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 302500,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "005930",
    name: "Suspicious externalReference 005930 = 600000 => recent_close",
    expected: {
      priceKind: "recent_close",
      source: "data.go.kr",
      aiConfidence: "medium",
      basisKo: "data.go.kr 기준"
    },
    input: {
      symbol: "005930",
      kisQuote: null,
      kisQuoteSource: "none",
      externalReferencePrice: 600000,
      externalReferenceSource: "Yahoo",
      externalReferenceUpdatedAt: "2026-06-11 10:10",
      dailyClose: { price: 302500, baseDate: "2026-06-10", updatedAt: "2026-06-10" },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 302500,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "000660",
    name: "000660 externalReference = 2101000 => external_reference",
    expected: {
      priceKind: "external_reference",
      source: "TradingView",
      aiConfidence: "medium",
      basisKo: "외부 참고 기준"
    },
    input: {
      symbol: "000660",
      kisQuote: null,
      kisQuoteSource: "none",
      externalReferencePrice: 2101000,
      externalReferenceSource: "TradingView",
      externalReferenceUpdatedAt: "2026-06-11 10:15",
      dailyClose: { price: 2363000, baseDate: "2026-06-10", updatedAt: "2026-06-10" },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 2363000,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "035420",
    name: "035420 externalReference = 224000 => external_reference",
    expected: {
      priceKind: "external_reference",
      source: "Google",
      aiConfidence: "medium",
      basisKo: "외부 참고 기준"
    },
    input: {
      symbol: "035420",
      kisQuote: null,
      kisQuoteSource: "none",
      externalReferencePrice: 224000,
      externalReferenceSource: "Google",
      externalReferenceUpdatedAt: "2026-06-11 10:20",
      dailyClose: { price: 255500, baseDate: "2026-06-10", updatedAt: "2026-06-10" },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 255500,
      cachedPriceSource: "cache",
      market: "KOSDAQ"
    }
  }
];

const failed = cases.map(runCase).filter((pass) => !pass).length;

if (failed > 0) {
  console.error(`\n${failed} case(s) failed.`);
  process.exit(1);
}

console.log("\nAll price resolver checks passed.");
