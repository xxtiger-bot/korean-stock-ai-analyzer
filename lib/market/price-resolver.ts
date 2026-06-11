export type ResolvedPriceKind = "kis_current" | "recent_close" | "unavailable";
export type ResolvedPriceSource = "KIS" | "data.go.kr" | "none";
export type ResolvedPriceConfidence = "high" | "medium" | "low";

export type KisQuoteLike = {
  price?: number | null;
  updatedAt?: string | null;
  asOf?: string | null;
  change?: number | null;
  changeRate?: number | null;
  volume?: number | null;
};

export type DailyCloseLike = {
  price?: number | null;
  baseDate?: string | null;
  updatedAt?: string | null;
  asOf?: string | null;
};

export type ResolvedPriceInput = {
  symbol: string;
  kisQuote?: KisQuoteLike | null;
  kisQuoteSource?: "KIS" | "none";
  dailyClose?: DailyCloseLike | null;
  dailyCloseSource?: "data.go.kr" | "none";
  cachedPrice?: number | null;
  cachedPriceSource?: "cache" | "none";
  dailyCloseSuspicious?: boolean;
  market?: string | null;
};

export type ResolvedStockDisplayPrice = {
  displayPrice: number | null;
  priceKind: ResolvedPriceKind;
  source: ResolvedPriceSource;
  labelKo: string;
  basisKo: string;
  updatedAt?: string;
  baseDate?: string;
  isRealtime: boolean;
  isFallback: boolean;
  isUsableForAi: boolean;
  aiConfidence: ResolvedPriceConfidence;
  warningKo?: string;
  reason: string;
};

const SUSPICIOUS_KIS_GAP_THRESHOLD = 0.3;
const ABSOLUTE_MAX_KOREAN_STOCK_PRICE = 5_000_000;
const SYMBOL_PRICE_GUARD_RANGES: Record<string, { min: number; max: number }> = {
  "005930": { min: 30_000, max: 400_000 },
  "000660": { min: 50_000, max: 3_000_000 },
  "035420": { min: 80_000, max: 600_000 }
};

function toFinitePrice(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function toNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isValidPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function isKoreanPriceLike(price: number): boolean {
  if (!Number.isFinite(price) || price <= 0) {
    return false;
  }

  const rounded = Math.round(price);
  const fractionalDelta = Math.abs(price - rounded);

  // KRW quoted stocks should not appear as visibly fractional prices in the UI.
  // We keep a tiny tolerance for floating-point noise only.
  return fractionalDelta < 0.0001;
}

/**
 * Protective symbol-aware guard for Korean stock prices.
 * This threshold exists only to prevent obviously abnormal source data
 * from misleading users. It is not an investing rule.
 */
export function isSuspiciousKoreanStockPrice(symbol: string, price: unknown): boolean {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const safePrice = toFinitePrice(price);

  if (!isValidPrice(safePrice)) {
    return true;
  }

  if (!Number.isInteger(safePrice)) {
    return true;
  }

  if (safePrice > ABSOLUTE_MAX_KOREAN_STOCK_PRICE) {
    return true;
  }

  const symbolRange = SYMBOL_PRICE_GUARD_RANGES[normalizedSymbol];
  if (!symbolRange) {
    return false;
  }

  return safePrice < symbolRange.min || safePrice > symbolRange.max;
}

/**
 * Protective threshold for user-facing price safety.
 * This is only to prevent an anomalous KIS quote from misleading users,
 * not a trading judgement rule.
 */
export function isSuspiciousKisPrice(
  kisPrice: unknown,
  recentClose: unknown
): boolean {
  const safeKisPrice = toFinitePrice(kisPrice);
  const safeRecentClose = toFinitePrice(recentClose);

  if (!isValidPrice(safeKisPrice)) {
    return true;
  }

  if (!isKoreanPriceLike(safeKisPrice)) {
    return true;
  }

  if (safeRecentClose && safeRecentClose > 0) {
    const gapRate = Math.abs(safeKisPrice - safeRecentClose) / safeRecentClose;
    if (Number.isFinite(gapRate) && gapRate > SUSPICIOUS_KIS_GAP_THRESHOLD) {
      return true;
    }
  }

  return false;
}

function resolveReferenceClose(
  dailyClose?: DailyCloseLike | null,
  dailyCloseSource?: "data.go.kr" | "none",
  dailyCloseSuspicious?: boolean
): number | null {
  if (dailyCloseSource !== "data.go.kr" || dailyCloseSuspicious) {
    return null;
  }

  const dailyClosePrice = toFinitePrice(dailyClose?.price);
  if (isValidPrice(dailyClosePrice)) {
    return dailyClosePrice;
  }

  return null;
}

function resolveUpdatedAt(kisQuote?: KisQuoteLike | null, dailyClose?: DailyCloseLike | null) {
  return (
    toNonEmptyString(kisQuote?.updatedAt) ??
    toNonEmptyString(kisQuote?.asOf) ??
    toNonEmptyString(dailyClose?.updatedAt) ??
    toNonEmptyString(dailyClose?.asOf)
  );
}

function resolveBaseDate(dailyClose?: DailyCloseLike | null) {
  return toNonEmptyString(dailyClose?.baseDate);
}

export function resolveStockDisplayPrice({
  symbol,
  kisQuote,
  kisQuoteSource = "none",
  dailyClose,
  dailyCloseSource = "none",
  cachedPrice,
  cachedPriceSource = "none",
  dailyCloseSuspicious = false,
  market
}: ResolvedPriceInput): ResolvedStockDisplayPrice {
  const normalizedSymbol = symbol.trim().toUpperCase();
  const kisPrice = toFinitePrice(kisQuote?.price);
  const rawReferenceClose = resolveReferenceClose(dailyClose, dailyCloseSource, dailyCloseSuspicious);
  const safeCachedPrice = cachedPriceSource === "cache" ? toFinitePrice(cachedPrice) : null;
  const dailyClosePriceSuspicious =
    isValidPrice(rawReferenceClose) &&
    isSuspiciousKoreanStockPrice(normalizedSymbol, rawReferenceClose);
  const hasSuspiciousDailyClose = dailyCloseSuspicious || dailyClosePriceSuspicious;
  const referenceClose = hasSuspiciousDailyClose ? null : rawReferenceClose;
  const kisSourceMismatch = kisQuoteSource !== "KIS" && isValidPrice(kisPrice);
  const kisPriceSuspicious =
    isValidPrice(kisPrice) &&
    isSuspiciousKoreanStockPrice(normalizedSymbol, kisPrice);
  const kisSuspicious = isSuspiciousKisPrice(kisPrice, referenceClose) || kisPriceSuspicious;

  const marketLabel = toNonEmptyString(market) ?? "KR";
  const updatedAt = resolveUpdatedAt(kisQuote, dailyClose);
  const baseDate = resolveBaseDate(dailyClose);
  const suspiciousReasons: string[] = [];

  if (kisQuoteSource === "KIS" && isValidPrice(kisPrice) && kisPriceSuspicious) {
    suspiciousReasons.push(`KIS price ${kisPrice} is suspicious for ${normalizedSymbol}`);
  }

  if (dailyCloseSource === "data.go.kr" && isValidPrice(rawReferenceClose) && dailyClosePriceSuspicious) {
    suspiciousReasons.push(
      `data.go.kr daily close ${rawReferenceClose} is suspicious for ${normalizedSymbol}`
    );
  }

  if (kisSourceMismatch) {
    suspiciousReasons.push(
      `Price ${kisPrice} for ${normalizedSymbol} is not trusted as KIS because the quote source is not explicit KIS`
    );
  }

  if (kisQuoteSource === "KIS" && isValidPrice(kisPrice) && !kisSuspicious) {
    return {
      displayPrice: kisPrice,
      priceKind: "kis_current",
      source: "KIS",
      labelKo: "현재가",
      basisKo: "KIS 기준",
      updatedAt,
      isRealtime: true,
      isFallback: false,
      isUsableForAi: true,
      aiConfidence: "high",
      reason: `${symbol}(${marketLabel})의 KIS 현재가가 정상 범위이므로 실시간 기준으로 표시했습니다.`
    };
  }

  if (isValidPrice(referenceClose)) {
    return {
      displayPrice: referenceClose,
      priceKind: "recent_close",
      source: "data.go.kr",
      labelKo: "최근 종가",
      basisKo: "data.go.kr 기준",
      updatedAt,
      baseDate,
      isRealtime: false,
      isFallback: true,
      isUsableForAi: false,
      aiConfidence: "medium",
      warningKo: "실시간 시세가 아닙니다.",
      reason: `${symbol}(${marketLabel})의 KIS 현재가가 비정상 또는 확인 불가여서 data.go.kr 최근 종가를 참고했습니다.`
    };
  }

  if (suspiciousReasons.length > 0) {
    return {
      displayPrice: null,
      priceKind: "unavailable",
      source: "none",
      labelKo: "가격 데이터 확인 필요",
      basisKo: "비정상 가격 감지",
      updatedAt,
      baseDate,
      isRealtime: false,
      isFallback: false,
      isUsableForAi: false,
      aiConfidence: "low",
      warningKo: "가격 데이터가 비정상 범위를 벗어나 현재 분석에서 제외했습니다.",
      reason: suspiciousReasons.join(" | ")
    };
  }

  return {
    displayPrice: null,
    priceKind: "unavailable",
    source: "none",
    labelKo: "가격 데이터 없음",
    basisKo: "데이터 일시 불가",
    updatedAt,
    baseDate,
    isRealtime: false,
    isFallback: false,
    isUsableForAi: false,
    aiConfidence: "low",
    warningKo: "가격 데이터를 일시적으로 불러올 수 없습니다.",
    reason: safeCachedPrice
      ? `${symbol}(${marketLabel})에 캐시 가격은 있지만, KIS/data.go.kr 출처가 확인되지 않아 표시하지 않았습니다.`
      : `${symbol}(${marketLabel})의 KIS 현재가와 data.go.kr 최근 종가를 모두 확인할 수 없습니다.`
  };
}
