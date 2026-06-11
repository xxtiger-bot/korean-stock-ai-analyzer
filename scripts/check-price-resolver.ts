import { resolveStockDisplayPrice, type ResolvedPriceKind, type ResolvedPriceSource, type ResolvedPriceConfidence } from "../lib/market/price-resolver";

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

  return { pass, result };
}

const cases: PriceResolverCase[] = [
  {
    symbol: "005930",
    name: "005930 valid KIS current price at 322000",
    expected: {
      priceKind: "kis_current",
      source: "KIS",
      aiConfidence: "high",
      basisKo: "KIS 기준"
    },
    input: {
      symbol: "005930",
      kisQuote: {
        price: 322000,
        updatedAt: "2026-06-09 13:24"
      },
      kisQuoteSource: "KIS",
      dailyClose: {
        price: 315500,
        baseDate: "2026-06-05",
        updatedAt: "2026-06-05"
      },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 315500,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "005930",
    name: "005930 valid KIS current price at 329000",
    expected: {
      priceKind: "kis_current",
      source: "KIS",
      aiConfidence: "high",
      basisKo: "KIS 기준"
    },
    input: {
      symbol: "005930",
      kisQuote: {
        price: 329000,
        updatedAt: "2026-06-09 13:25"
      },
      kisQuoteSource: "KIS",
      dailyClose: {
        price: 315500,
        baseDate: "2026-06-05",
        updatedAt: "2026-06-05"
      },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 315500,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "005930",
    name: "005930 suspicious KIS current price at 600000",
    expected: {
      priceKind: "unavailable",
      source: "none",
      aiConfidence: "low",
      basisKo: "비정상 가격 감지"
    },
    input: {
      symbol: "005930",
      kisQuote: {
        price: 600000,
        updatedAt: "2026-06-09 13:26"
      },
      kisQuoteSource: "KIS",
      dailyCloseSource: "none",
      cachedPriceSource: "none",
      market: "KOSPI"
    }
  },
  {
    symbol: "005930",
    name: "005930 fallback to recent close when KIS unavailable and daily close valid",
    expected: {
      priceKind: "recent_close",
      source: "data.go.kr",
      aiConfidence: "low",
      basisKo: "최근 종가 참고"
    },
    input: {
      symbol: "005930",
      kisQuote: null,
      kisQuoteSource: "none",
      dailyClose: {
        price: 329000,
        baseDate: "2026-06-05",
        updatedAt: "2026-06-05"
      },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 329000,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "000660",
    name: "000660 valid KIS current price within widened guard range",
    expected: {
      priceKind: "kis_current",
      source: "KIS",
      aiConfidence: "high",
      basisKo: "KIS 기준"
    },
    input: {
      symbol: "000660",
      kisQuote: {
        price: 2363000,
        updatedAt: "2026-06-09 09:05"
      },
      kisQuoteSource: "KIS",
      dailyClose: {
        price: 2350000,
        baseDate: "2026-06-05",
        updatedAt: "2026-06-05"
      },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 2350000,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "000660",
    name: "000660 suspicious KIS and suspicious daily close",
    expected: {
      priceKind: "unavailable",
      source: "none",
      aiConfidence: "low",
      basisKo: "비정상 가격 감지"
    },
    input: {
      symbol: "000660",
      kisQuote: {
        price: 3500000,
        updatedAt: "2026-06-09 09:05"
      },
      kisQuoteSource: "KIS",
      dailyClose: {
        price: 3490000,
        baseDate: "2026-06-05",
        updatedAt: "2026-06-05"
      },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 3490000,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "035420",
    name: "035420 valid KIS current price",
    expected: {
      priceKind: "kis_current",
      source: "KIS",
      aiConfidence: "high",
      basisKo: "KIS 기준"
    },
    input: {
      symbol: "035420",
      kisQuote: {
        price: 255500,
        updatedAt: "2026-06-09 09:05"
      },
      kisQuoteSource: "KIS",
      dailyClose: {
        price: 252000,
        baseDate: "2026-06-05",
        updatedAt: "2026-06-05"
      },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 252000,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  },
  {
    symbol: "035420",
    name: "035420 suspicious KIS and suspicious daily close over guard range",
    expected: {
      priceKind: "unavailable",
      source: "none",
      aiConfidence: "low",
      basisKo: "비정상 가격 감지"
    },
    input: {
      symbol: "035420",
      kisQuote: {
        price: 800000,
        updatedAt: "2026-06-09 09:05"
      },
      kisQuoteSource: "KIS",
      dailyClose: {
        price: 790000,
        baseDate: "2026-06-05",
        updatedAt: "2026-06-05"
      },
      dailyCloseSource: "data.go.kr",
      cachedPrice: 790000,
      cachedPriceSource: "cache",
      market: "KOSPI"
    }
  }
];

const results = cases.map(runCase);
const failed = results.filter((item) => !item.pass);

console.log("");
console.log(`total=${results.length} | failed=${failed.length}`);

if (failed.length > 0) {
  process.exitCode = 1;
}
