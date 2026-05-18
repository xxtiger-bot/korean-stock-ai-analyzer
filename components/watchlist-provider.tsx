"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";

type WatchlistContextValue = {
  symbols: string[];
  add: (symbol: string) => void;
  remove: (symbol: string) => void;
  toggle: (symbol: string) => void;
  isWatching: (symbol: string) => boolean;
};

const storageKey = "krx-insight-watchlist";
const WatchlistContext = createContext<WatchlistContextValue | null>(null);

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const [symbols, setSymbols] = useState<string[]>([]);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        const storedSymbols = Array.isArray(parsed)
          ? parsed.filter((item): item is string => typeof item === "string")
          : [];
        setSymbols((current) => (current.length > 0 ? current : storedSymbols));
      }
    } catch {
      setSymbols((current) => current);
    }
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(symbols));
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    }
  }, [isReady, symbols]);

  const add = useCallback((symbol: string) => {
    setSymbols((current) =>
      current.includes(symbol) ? current : [...current, symbol]
    );
  }, []);

  const remove = useCallback((symbol: string) => {
    setSymbols((current) => current.filter((item) => item !== symbol));
  }, []);

  const toggle = useCallback((symbol: string) => {
    setSymbols((current) =>
      current.includes(symbol)
        ? current.filter((item) => item !== symbol)
        : [...current, symbol]
    );
  }, []);

  const value = useMemo(
    () => ({
      symbols,
      add,
      remove,
      toggle,
      isWatching: (symbol: string) => symbols.includes(symbol)
    }),
    [add, remove, symbols, toggle]
  );

  return (
    <WatchlistContext.Provider value={value}>
      {children}
    </WatchlistContext.Provider>
  );
}

export function useWatchlist() {
  const context = useContext(WatchlistContext);
  if (!context) {
    throw new Error("useWatchlist must be used within WatchlistProvider");
  }

  return context;
}
