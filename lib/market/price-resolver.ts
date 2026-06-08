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
  dailyClose?: DailyCloseLike | null;
  cachedPrice?: number | null;
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
  cachedPrice?: number | null
): number | null {
  const dailyClosePrice = toFinitePrice(dailyClose?.price);
  if (isValidPrice(dailyClosePrice)) {
    return dailyClosePrice;
  }

  const cached = toFinitePrice(cachedPrice);
  return isValidPrice(cached) ? cached : null;
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
  dailyClose,
  cachedPrice,
  market
}: ResolvedPriceInput): ResolvedStockDisplayPrice {
  const kisPrice = toFinitePrice(kisQuote?.price);
  const referenceClose = resolveReferenceClose(dailyClose, cachedPrice);
  const kisSuspicious = isSuspiciousKisPrice(kisPrice, referenceClose);

  const marketLabel = toNonEmptyString(market) ?? "KR";
  const updatedAt = resolveUpdatedAt(kisQuote, dailyClose);
  const baseDate = resolveBaseDate(dailyClose);

  if (isValidPrice(kisPrice) && !kisSuspicious) {
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
      labelKo: "현재가 확인 불가",
      basisKo: "최근 종가 참고",
      updatedAt,
      baseDate,
      isRealtime: false,
      isFallback: true,
      isUsableForAi: false,
      aiConfidence: "low",
      warningKo: "현재가 확인이 어려워 최근 종가를 참고합니다.",
      reason: `${symbol}(${marketLabel})의 KIS 현재가가 비정상 또는 확인 불가여서 data.go.kr 최근 종가를 참고했습니다.`
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
    reason: `${symbol}(${marketLabel})의 KIS 현재가와 data.go.kr 최근 종가를 모두 확인할 수 없습니다.`
  };
}

