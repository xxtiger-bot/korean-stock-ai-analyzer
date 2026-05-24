"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import { useAuth } from "@/components/auth-provider";
import {
  FREE_LIMITS,
  isPaidPlan,
  resolvePlanFromProfile,
  toPlanStatusLabel,
  type UserPlan
} from "@/lib/plan";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type WatchlistItem = {
  symbol: string;
  stockName: string | null;
  market: string | null;
  createdAt: string;
};

type WatchlistContextValue = {
  symbols: string[];
  items: WatchlistItem[];
  plan: UserPlan;
  planStatusLabel: string;
  watchlistLimit: number | null;
  isWatchlistLimitReached: boolean;
  isWatchlistNearLimit: boolean;
  add: (symbol: string, metadata?: { stockName?: string | null; market?: string | null }) => void;
  remove: (symbol: string) => void;
  toggle: (symbol: string, metadata?: { stockName?: string | null; market?: string | null }) => void;
  isWatching: (symbol: string) => boolean;
  canSyncLocalToCloud: boolean;
  isCloudSyncing: boolean;
  syncNotice: string;
  syncLocalToCloud: () => Promise<void>;
};

const storageKey = "krx-insight-watchlist";
const WatchlistContext = createContext<WatchlistContextValue | null>(null);

function normalizeSymbol(value: string) {
  return typeof value === "string" ? value.trim().toUpperCase() : "";
}

function safeText(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeWatchlistItem(value: unknown): WatchlistItem | null {
  if (typeof value === "string") {
    const symbol = normalizeSymbol(value);
    if (!symbol) return null;
    return {
      symbol,
      stockName: null,
      market: null,
      createdAt: new Date().toISOString()
    };
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const symbol = normalizeSymbol(typeof raw.symbol === "string" ? raw.symbol : "");
  if (!symbol) return null;
  return {
    symbol,
    stockName: safeText(raw.stockName ?? raw.stock_name),
    market: safeText(raw.market),
    createdAt: typeof raw.createdAt === "string" ? raw.createdAt : new Date().toISOString()
  };
}

function parseStoredWatchlist() {
  if (typeof window === "undefined") return [] as WatchlistItem[];
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (!stored) return [];
    const parsed = JSON.parse(stored) as unknown;
    const safeList = Array.isArray(parsed) ? parsed : [];
    const map = new Map<string, WatchlistItem>();
    for (const value of safeList) {
      const item = normalizeWatchlistItem(value);
      if (!item) continue;
      if (!map.has(item.symbol)) map.set(item.symbol, item);
    }
    return Array.from(map.values());
  } catch {
    return [];
  }
}

export function WatchlistProvider({ children }: { children: React.ReactNode }) {
  const { user, isSupabaseReady } = useAuth();
  const [items, setItems] = useState<WatchlistItem[]>([]);
  const [plan, setPlan] = useState<UserPlan>("free");
  const [planStatusLabel, setPlanStatusLabel] = useState("Free");
  const [initialLocalItems, setInitialLocalItems] = useState<WatchlistItem[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [syncNotice, setSyncNotice] = useState("");
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  const symbols = useMemo(
    () =>
      (Array.isArray(items) ? items : [])
        .map((item) => item.symbol)
        .filter((symbol): symbol is string => typeof symbol === "string" && Boolean(symbol)),
    [items]
  );

  useEffect(() => {
    const storedItems = parseStoredWatchlist();
    setInitialLocalItems(storedItems);
    setItems(storedItems);
    setIsReady(true);
  }, []);

  useEffect(() => {
    if (isReady) {
      try {
        const safeItems = Array.isArray(items) ? items : [];
        window.localStorage.setItem(storageKey, JSON.stringify(safeItems));
      } catch {
        // Storage can be unavailable in restricted browser contexts.
      }
    }
  }, [isReady, items]);

  useEffect(() => {
    if (!isReady) return;
    if (user?.id) return;
    setInitialLocalItems(Array.isArray(items) ? items : []);
  }, [isReady, items, user?.id]);

  useEffect(() => {
    if (!user?.id || !isSupabaseReady || !isSupabaseConfigured || !supabase) {
      setPlan("free");
      setPlanStatusLabel("Free");
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("plan,pro_expires_at")
          .eq("id", user.id)
          .limit(1);
        if (cancelled) return;
        if (error) {
          setPlan("free");
          setPlanStatusLabel("Free");
          return;
        }
        const row =
          Array.isArray(data) && data.length > 0
            ? (data[0] as { plan?: unknown; pro_expires_at?: unknown })
            : null;
        const planInfo = resolvePlanFromProfile(row);
        setPlan(planInfo.effectivePlan);
        setPlanStatusLabel(toPlanStatusLabel(planInfo));
      } catch {
        if (!cancelled) {
          setPlan("free");
          setPlanStatusLabel("Free");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isSupabaseReady, user?.id]);

  const isFreePlan = !isPaidPlan(plan);
  const watchlistLimit = isFreePlan ? FREE_LIMITS.watchlist : null;
  const watchlistCount = symbols.length;
  const isWatchlistLimitReached = Boolean(watchlistLimit !== null && watchlistCount >= watchlistLimit);
  const isWatchlistNearLimit = Boolean(
    watchlistLimit !== null && watchlistCount >= watchlistLimit - 1 && watchlistCount < watchlistLimit
  );

  useEffect(() => {
    if (!isReady) return;
    if (!isFreePlan || watchlistLimit === null) return;
    if (watchlistCount > watchlistLimit) {
      setSyncNotice("현재 Free 한도를 초과한 데이터가 있습니다. 기존 데이터는 유지됩니다.");
    }
  }, [isFreePlan, isReady, watchlistCount, watchlistLimit]);

  useEffect(() => {
    if (!isReady) return;
    if (!user?.id || !isSupabaseReady || !isSupabaseConfigured || !supabase) {
      setItems(parseStoredWatchlist());
      return;
    }

    let cancelled = false;
    setIsCloudSyncing(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("watchlist_items")
          .select("id,symbol,stock_name,market,created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: true });

        if (cancelled) return;
        if (error) {
          setSyncNotice("관심종목 클라우드 동기화에 실패했습니다. 로컬에 저장했습니다.");
          setItems(parseStoredWatchlist());
          return;
        }

        const safeRows = Array.isArray(data) ? data : [];
        const normalized = safeRows
          .map((row) =>
            normalizeWatchlistItem({
              symbol: row?.symbol,
              stockName: row?.stock_name,
              market: row?.market,
              createdAt: row?.created_at
            })
          )
          .filter((item): item is WatchlistItem => Boolean(item));
        setItems(normalized);
      } finally {
        if (!cancelled) setIsCloudSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isReady, isSupabaseReady, user?.id]);

  const upsertCloudWatchlistItem = useCallback(
    async (item: WatchlistItem) => {
      if (!user?.id || !isSupabaseReady || !isSupabaseConfigured || !supabase) return true;
      const { error } = await supabase.from("watchlist_items").upsert(
        {
          user_id: user.id,
          id: `${user.id}-${item.symbol}`,
          symbol: item.symbol,
          stock_name: item.stockName,
          market: item.market,
          created_at: item.createdAt
        },
        { onConflict: "user_id,symbol" }
      );
      if (error) {
        setSyncNotice("관심종목 클라우드 동기화에 실패했습니다. 로컬에 저장했습니다.");
        return false;
      }
      setSyncNotice("관심종목을 클라우드에 동기화했습니다.");
      return true;
    },
    [isSupabaseReady, user?.id]
  );

  const deleteCloudWatchlistItem = useCallback(
    async (symbol: string) => {
      if (!user?.id || !isSupabaseReady || !isSupabaseConfigured || !supabase) return true;
      const { error } = await supabase
        .from("watchlist_items")
        .delete()
        .eq("user_id", user.id)
        .eq("symbol", symbol);
      if (error) {
        setSyncNotice("관심종목 클라우드 동기화에 실패했습니다. 로컬에 저장했습니다.");
        return false;
      }
      return true;
    },
    [isSupabaseReady, user?.id]
  );

  const add = useCallback(
    (symbol: string, metadata?: { stockName?: string | null; market?: string | null }) => {
      const normalized = normalizeSymbol(symbol);
      if (!normalized) return;
      if (!symbols.includes(normalized) && isFreePlan && symbols.length >= FREE_LIMITS.watchlist) {
        setSyncNotice(
          user?.id
            ? "Free 플랜에서는 관심종목을 최대 5개까지 추가할 수 있습니다."
            : "Free 플랜에서는 관심종목을 최대 5개까지 추가할 수 있습니다. 로그인하면 클라우드 동기화와 요금제 기능을 사용할 수 있습니다."
        );
        return;
      }
      const nextItem: WatchlistItem = {
        symbol: normalized,
        stockName: safeText(metadata?.stockName),
        market: safeText(metadata?.market),
        createdAt: new Date().toISOString()
      };
      setItems((current) => {
        const safeCurrent = Array.isArray(current) ? current : [];
        if (safeCurrent.some((item) => item.symbol === normalized)) return safeCurrent;
        return [...safeCurrent, nextItem];
      });
      if (user?.id && isSupabaseReady && isSupabaseConfigured && supabase) {
        void upsertCloudWatchlistItem(nextItem);
      }
    },
    [isFreePlan, isSupabaseReady, symbols, upsertCloudWatchlistItem, user?.id]
  );

  const remove = useCallback(
    (symbol: string) => {
      const normalized = normalizeSymbol(symbol);
      if (!normalized) return;
      setItems((current) =>
        (Array.isArray(current) ? current : []).filter((item) => item.symbol !== normalized)
      );
      if (user?.id && isSupabaseReady && isSupabaseConfigured && supabase) {
        void deleteCloudWatchlistItem(normalized);
      }
    },
    [deleteCloudWatchlistItem, isSupabaseReady, user?.id]
  );

  const toggle = useCallback(
    (symbol: string, metadata?: { stockName?: string | null; market?: string | null }) => {
      const normalized = normalizeSymbol(symbol);
      if (!normalized) return;
      const exists = symbols.includes(normalized);
      if (!exists && isFreePlan && symbols.length >= FREE_LIMITS.watchlist) {
        setSyncNotice(
          user?.id
            ? "Free 플랜에서는 관심종목을 최대 5개까지 추가할 수 있습니다."
            : "Free 플랜에서는 관심종목을 최대 5개까지 추가할 수 있습니다. 로그인하면 클라우드 동기화와 요금제 기능을 사용할 수 있습니다."
        );
        return;
      }
      setItems((current) => {
        const safeCurrent = Array.isArray(current) ? current : [];
        const existsInCurrent = safeCurrent.some((item) => item.symbol === normalized);
        if (existsInCurrent) return safeCurrent.filter((item) => item.symbol !== normalized);
        return [
          ...safeCurrent,
          {
            symbol: normalized,
            stockName: safeText(metadata?.stockName),
            market: safeText(metadata?.market),
            createdAt: new Date().toISOString()
          }
        ];
      });
      if (user?.id && isSupabaseReady && isSupabaseConfigured && supabase) {
        if (exists) {
          void deleteCloudWatchlistItem(normalized);
        } else {
          void upsertCloudWatchlistItem({
            symbol: normalized,
            stockName: safeText(metadata?.stockName),
            market: safeText(metadata?.market),
            createdAt: new Date().toISOString()
          });
        }
      }
    },
    [
      deleteCloudWatchlistItem,
      isFreePlan,
      isSupabaseReady,
      symbols,
      upsertCloudWatchlistItem,
      user?.id
    ]
  );

  const canSyncLocalToCloud = useMemo(() => {
    if (!user?.id || !isSupabaseReady || !isSupabaseConfigured || !supabase) return false;
    const localSymbols = (Array.isArray(initialLocalItems) ? initialLocalItems : []).map(
      (item) => item.symbol
    );
    if (localSymbols.length === 0) return false;
    return localSymbols.some((symbol) => !symbols.includes(symbol));
  }, [initialLocalItems, isSupabaseReady, symbols, user?.id]);

  const syncLocalToCloud = useCallback(async () => {
    if (!user?.id || !isSupabaseReady || !isSupabaseConfigured || !supabase) return;
    const safeLocalItems = Array.isArray(initialLocalItems) ? initialLocalItems : [];
    const pending = safeLocalItems.filter((item) => !symbols.includes(item.symbol));
    if (pending.length === 0) return;

    setIsCloudSyncing(true);
    try {
      const rows = pending.map((item) => ({
        user_id: user.id,
        id: `${user.id}-${item.symbol}`,
        symbol: item.symbol,
        stock_name: item.stockName,
        market: item.market,
        created_at: item.createdAt
      }));
      const { error } = await supabase.from("watchlist_items").upsert(rows, {
        onConflict: "user_id,symbol"
      });
      if (error) {
        setSyncNotice("관심종목 클라우드 동기화에 실패했습니다. 로컬에 저장했습니다.");
        return;
      }
      setItems((current) => {
        const merged = new Map<string, WatchlistItem>();
        for (const item of Array.isArray(current) ? current : []) {
          merged.set(item.symbol, item);
        }
        for (const item of pending) {
          merged.set(item.symbol, item);
        }
        return Array.from(merged.values());
      });
      setInitialLocalItems((current) => {
        const merged = new Map<string, WatchlistItem>();
        for (const item of Array.isArray(current) ? current : []) {
          merged.set(item.symbol, item);
        }
        for (const item of pending) {
          merged.set(item.symbol, item);
        }
        return Array.from(merged.values());
      });
      setSyncNotice("관심종목을 클라우드에 동기화했습니다.");
    } catch {
      setSyncNotice("관심종목 클라우드 동기화에 실패했습니다. 로컬에 저장했습니다.");
    } finally {
      setIsCloudSyncing(false);
    }
  }, [initialLocalItems, isSupabaseReady, symbols, user?.id]);

  const value = useMemo(
    () => ({
      symbols,
      items,
      plan,
      planStatusLabel,
      watchlistLimit,
      isWatchlistLimitReached,
      isWatchlistNearLimit,
      add,
      remove,
      toggle,
      isWatching: (symbol: string) => symbols.includes(normalizeSymbol(symbol)),
      canSyncLocalToCloud,
      isCloudSyncing,
      syncNotice,
      syncLocalToCloud
    }),
    [
      add,
      canSyncLocalToCloud,
      isCloudSyncing,
      isWatchlistLimitReached,
      isWatchlistNearLimit,
      items,
      plan,
      planStatusLabel,
      remove,
      symbols,
      syncLocalToCloud,
      syncNotice,
      toggle,
      watchlistLimit
    ]
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
