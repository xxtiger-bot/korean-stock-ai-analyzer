"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { PORTFOLIO_ENTRIES_STORAGE_KEY } from "@/lib/storage-keys";
import type { InvestmentHorizon, PortfolioPositionInput, RiskProfile } from "@/lib/types";

type PortfolioDraftInput = {
  symbol: string;
  stockName?: string;
  market?: string;
  dataSource?: string;
  buyPrice: number;
  quantity: number;
  investmentHorizon: InvestmentHorizon;
  riskProfile: RiskProfile;
  memo: string;
};

type PortfolioContextValue = {
  entries: PortfolioPositionInput[];
  addEntry: (draft: PortfolioDraftInput) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<PortfolioDraftInput>) => void;
};

const PortfolioContext = createContext<PortfolioContextValue | null>(null);

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeSymbol(value: unknown) {
  if (typeof value !== "string") return "";
  return value.trim().toUpperCase();
}

function normalizeHorizon(value: unknown): InvestmentHorizon {
  return value === "단기" || value === "중기" || value === "장기" ? value : "중기";
}

function normalizeRiskProfile(value: unknown): RiskProfile {
  return value === "보수형" || value === "일반형" || value === "공격형"
    ? value
    : "일반형";
}

function normalizeMemo(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 300) : "";
}

function normalizeOptionalText(value: unknown, maxLength = 60) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function normalizeEntry(value: unknown): PortfolioPositionInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;

  const raw = value as Record<string, unknown>;
  const id = typeof raw.id === "string" ? raw.id : "";
  const symbol = normalizeSymbol(raw.symbol);
  const buyPrice = safeNumber(raw.buyPrice);
  const quantity = safeNumber(raw.quantity);

  if (!id || !symbol || buyPrice <= 0 || quantity <= 0) {
    return null;
  }

  return {
    id,
    symbol,
    stockName: normalizeOptionalText(raw.stockName, 80) || undefined,
    market: normalizeOptionalText(raw.market, 20) || undefined,
    dataSource: normalizeOptionalText(raw.dataSource, 40) || undefined,
    buyPrice,
    quantity,
    investmentHorizon: normalizeHorizon(raw.investmentHorizon),
    riskProfile: normalizeRiskProfile(raw.riskProfile),
    memo: normalizeMemo(raw.memo)
  };
}

function buildEntryId(symbol: string) {
  return `${symbol}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const [entries, setEntries] = useState<PortfolioPositionInput[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PORTFOLIO_ENTRIES_STORAGE_KEY);
      if (!raw) {
        setIsReady(true);
        return;
      }

      const parsed = JSON.parse(raw);
      const safeEntries = Array.isArray(parsed)
        ? parsed
            .map(normalizeEntry)
            .filter((item): item is PortfolioPositionInput => Boolean(item))
        : [];

      setEntries(safeEntries);
    } catch {
      setEntries([]);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(PORTFOLIO_ENTRIES_STORAGE_KEY, JSON.stringify(entries));
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
  }, [entries, isReady]);

  const addEntry = useCallback((draft: PortfolioDraftInput) => {
    const symbol = normalizeSymbol(draft.symbol);
    const buyPrice = safeNumber(draft.buyPrice);
    const quantity = safeNumber(draft.quantity);
    if (!symbol || buyPrice <= 0 || quantity <= 0) return;

    const entry: PortfolioPositionInput = {
      id: buildEntryId(symbol),
      symbol,
      stockName: normalizeOptionalText(draft.stockName, 80) || undefined,
      market: normalizeOptionalText(draft.market, 20) || undefined,
      dataSource: normalizeOptionalText(draft.dataSource, 40) || undefined,
      buyPrice,
      quantity,
      investmentHorizon: normalizeHorizon(draft.investmentHorizon),
      riskProfile: normalizeRiskProfile(draft.riskProfile),
      memo: normalizeMemo(draft.memo)
    };

    setEntries((current) => [...current, entry]);
  }, []);

  const removeEntry = useCallback((id: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== id));
  }, []);

  const updateEntry = useCallback((id: string, patch: Partial<PortfolioDraftInput>) => {
    setEntries((current) =>
      current.map((entry) => {
        if (entry.id !== id) return entry;

        const symbol = patch.symbol ? normalizeSymbol(patch.symbol) : entry.symbol;
        const buyPrice = Number.isFinite(patch.buyPrice) ? safeNumber(patch.buyPrice) : entry.buyPrice;
        const quantity = Number.isFinite(patch.quantity) ? safeNumber(patch.quantity) : entry.quantity;

        if (!symbol || buyPrice <= 0 || quantity <= 0) {
          return entry;
        }

        return {
          ...entry,
          symbol,
          stockName:
            patch.stockName !== undefined
              ? normalizeOptionalText(patch.stockName, 80) || undefined
              : entry.stockName,
          market:
            patch.market !== undefined
              ? normalizeOptionalText(patch.market, 20) || undefined
              : entry.market,
          dataSource:
            patch.dataSource !== undefined
              ? normalizeOptionalText(patch.dataSource, 40) || undefined
              : entry.dataSource,
          buyPrice,
          quantity,
          investmentHorizon: patch.investmentHorizon
            ? normalizeHorizon(patch.investmentHorizon)
            : entry.investmentHorizon,
          riskProfile: patch.riskProfile
            ? normalizeRiskProfile(patch.riskProfile)
            : entry.riskProfile,
          memo: patch.memo !== undefined ? normalizeMemo(patch.memo) : entry.memo
        };
      })
    );
  }, []);

  const value = useMemo(
    () => ({
      entries,
      addEntry,
      removeEntry,
      updateEntry
    }),
    [addEntry, entries, removeEntry, updateEntry]
  );

  return <PortfolioContext.Provider value={value}>{children}</PortfolioContext.Provider>;
}

export function usePortfolio() {
  const context = useContext(PortfolioContext);
  if (!context) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }

  return context;
}
