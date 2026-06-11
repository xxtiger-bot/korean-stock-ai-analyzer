export const LOCAL_HOLDINGS_STORAGE_KEY = "krx-insight-local-holdings-v1";

export type LocalHolding = {
  id: string;
  symbol: string;
  stockName: string;
  quantity: number;
  averageBuyPrice: number;
  targetPrice: number | null;
  memo: string;
  createdAt: string;
};

function toSafeNumber(value: unknown) {
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim().length > 0
        ? Number(value)
        : NaN;

  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeHolding(value: unknown): LocalHolding | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  const symbol =
    typeof candidate.symbol === "string" ? candidate.symbol.trim().toUpperCase() : "";
  const stockName =
    typeof candidate.stockName === "string" ? candidate.stockName.trim() : "";
  const quantity = toSafeNumber(candidate.quantity);
  const averageBuyPrice = toSafeNumber(candidate.averageBuyPrice);
  const targetPrice = toSafeNumber(candidate.targetPrice);
  const memo = typeof candidate.memo === "string" ? candidate.memo.trim() : "";
  const id = typeof candidate.id === "string" && candidate.id.trim().length > 0 ? candidate.id : "";
  const createdAt =
    typeof candidate.createdAt === "string" && candidate.createdAt.trim().length > 0
      ? candidate.createdAt
      : new Date().toISOString();

  if (!symbol || !stockName || !quantity || quantity <= 0 || !averageBuyPrice || averageBuyPrice <= 0) {
    return null;
  }

  return {
    id: id || `${symbol}-${createdAt}`,
    symbol,
    stockName,
    quantity,
    averageBuyPrice,
    targetPrice: targetPrice && targetPrice > 0 ? targetPrice : null,
    memo,
    createdAt
  };
}

export function readLocalHoldings(): LocalHolding[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(LOCAL_HOLDINGS_STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((item) => normalizeHolding(item))
      .filter((item): item is LocalHolding => Boolean(item));
  } catch {
    return [];
  }
}

export function writeLocalHoldings(holdings: LocalHolding[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(LOCAL_HOLDINGS_STORAGE_KEY, JSON.stringify(holdings));
  } catch {
    // Ignore localStorage write failures in restricted environments.
  }
}

