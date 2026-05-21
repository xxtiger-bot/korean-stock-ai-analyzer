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
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
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

type SyncResult = {
  ok: boolean;
  message: string;
  syncedCount: number;
};

type PortfolioContextValue = {
  entries: PortfolioPositionInput[];
  addEntry: (draft: PortfolioDraftInput) => void;
  removeEntry: (id: string) => void;
  updateEntry: (id: string, patch: Partial<PortfolioDraftInput>) => void;
  canSyncLocalToCloud: boolean;
  syncLocalToCloud: () => Promise<SyncResult>;
  isCloudSyncEnabled: boolean;
  isCloudSyncing: boolean;
  cloudSyncNotice: string;
  isSupabaseReady: boolean;
};

type PortfolioHoldingRow = {
  id: string;
  user_id: string;
  symbol: string;
  stock_name: string | null;
  market: string | null;
  data_source: string | null;
  buy_price: number;
  quantity: number;
  investment_horizon: string;
  risk_profile: string;
  memo: string | null;
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
  return value === "보수형" || value === "일반형" || value === "공격형" ? value : "일반형";
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

  if (!id || !symbol || buyPrice <= 0 || quantity <= 0) return null;

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

function parseStoredEntries(raw: string | null) {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed
          .map(normalizeEntry)
          .filter((item): item is PortfolioPositionInput => Boolean(item))
      : [];
  } catch {
    return [];
  }
}

function rowToEntry(value: unknown): PortfolioPositionInput | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = typeof row.id === "string" ? row.id : "";
  const symbol = normalizeSymbol(row.symbol);
  const buyPrice = safeNumber(row.buy_price);
  const quantity = safeNumber(row.quantity);
  if (!id || !symbol || buyPrice <= 0 || quantity <= 0) return null;

  return {
    id,
    symbol,
    stockName: normalizeOptionalText(row.stock_name, 80) || undefined,
    market: normalizeOptionalText(row.market, 20) || undefined,
    dataSource: normalizeOptionalText(row.data_source, 40) || undefined,
    buyPrice,
    quantity,
    investmentHorizon: normalizeHorizon(row.investment_horizon),
    riskProfile: normalizeRiskProfile(row.risk_profile),
    memo: normalizeMemo(row.memo)
  };
}

function entryToRow(entry: PortfolioPositionInput, userId: string): PortfolioHoldingRow {
  return {
    id: entry.id,
    user_id: userId,
    symbol: entry.symbol,
    stock_name: entry.stockName ?? null,
    market: entry.market ?? null,
    data_source: entry.dataSource ?? null,
    buy_price: entry.buyPrice,
    quantity: entry.quantity,
    investment_horizon: entry.investmentHorizon,
    risk_profile: entry.riskProfile,
    memo: entry.memo || null
  };
}

function dedupeEntries(entries: PortfolioPositionInput[]) {
  const safeEntries = Array.isArray(entries) ? entries : [];
  const map = new Map<string, PortfolioPositionInput>();
  for (const entry of safeEntries) {
    if (typeof entry?.id !== "string") continue;
    map.set(entry.id, entry);
  }
  return Array.from(map.values());
}

export function PortfolioProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<PortfolioPositionInput[]>([]);
  const [localEntries, setLocalEntries] = useState<PortfolioPositionInput[]>([]);
  const [isReady, setIsReady] = useState(false);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);
  const [cloudSyncNotice, setCloudSyncNotice] = useState("");
  const [localSyncDismissed, setLocalSyncDismissed] = useState(false);

  const isCloudSyncEnabled = Boolean(isSupabaseConfigured && supabase && user?.id);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PORTFOLIO_ENTRIES_STORAGE_KEY);
      const parsed = parseStoredEntries(raw);
      setLocalEntries(parsed);
      setEntries(parsed);
    } finally {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    try {
      window.localStorage.setItem(PORTFOLIO_ENTRIES_STORAGE_KEY, JSON.stringify(localEntries));
    } catch {
      // localStorage can be blocked in restricted contexts.
    }
  }, [isReady, localEntries]);

  useEffect(() => {
    setLocalSyncDismissed(false);
  }, [user?.id]);

  useEffect(() => {
    if (!isReady) return;

    if (!isCloudSyncEnabled || !user?.id || !supabase) {
      setEntries(localEntries);
      if (!isSupabaseConfigured) {
        setCloudSyncNotice("클라우드 동기화 미설정");
      } else {
        setCloudSyncNotice("");
      }
      return;
    }

    let cancelled = false;
    setIsCloudSyncing(true);
    void (async () => {
      try {
        const { data, error } = await supabase
          .from("portfolio_holdings")
          .select(
            "id,user_id,symbol,stock_name,market,data_source,buy_price,quantity,investment_horizon,risk_profile,memo"
          )
          .eq("user_id", user.id)
          .order("updated_at", { ascending: false });

        if (cancelled) return;
        if (error) {
          setEntries(localEntries);
          setCloudSyncNotice(
            "클라우드 보유종목을 불러오지 못해 로컬 데이터를 표시하고 있습니다."
          );
          return;
        }

        const safeRows = Array.isArray(data) ? data : [];
        const normalized = safeRows
          .map(rowToEntry)
          .filter((item): item is PortfolioPositionInput => Boolean(item));

        setEntries(normalized);
        setCloudSyncNotice("");
      } catch {
        if (cancelled) return;
        setEntries(localEntries);
        setCloudSyncNotice("클라우드 동기화 중 문제가 발생해 로컬 데이터를 표시합니다.");
      } finally {
        if (!cancelled) setIsCloudSyncing(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isCloudSyncEnabled, isReady, localEntries, user?.id]);

  const canSyncLocalToCloud = useMemo(() => {
    if (!isCloudSyncEnabled || localSyncDismissed) return false;
    if (!Array.isArray(localEntries) || localEntries.length === 0) return false;
    const cloudIds = new Set(
      (Array.isArray(entries) ? entries : [])
        .map((entry) => (typeof entry?.id === "string" ? entry.id : ""))
        .filter(Boolean)
    );
    return localEntries.some((entry) => !cloudIds.has(entry.id));
  }, [entries, isCloudSyncEnabled, localEntries, localSyncDismissed]);

  const syncLocalToCloud = useCallback(async (): Promise<SyncResult> => {
    if (!isCloudSyncEnabled || !user?.id || !supabase) {
      return {
        ok: false,
        message: "클라우드 동기화 미설정",
        syncedCount: 0
      };
    }

    const cloudMap = new Map<string, PortfolioPositionInput>();
    for (const entry of Array.isArray(entries) ? entries : []) {
      if (typeof entry?.id === "string") {
        cloudMap.set(entry.id, entry);
      }
    }

    const localOnly = (Array.isArray(localEntries) ? localEntries : []).filter(
      (entry) => !cloudMap.has(entry.id)
    );

    if (localOnly.length === 0) {
      setLocalSyncDismissed(true);
      return {
        ok: true,
        message: "동기화할 로컬 보유종목이 없습니다.",
        syncedCount: 0
      };
    }

    const merged = dedupeEntries([
      ...(Array.isArray(entries) ? entries : []),
      ...localOnly
    ]);

    setIsCloudSyncing(true);
    const rows = merged.map((entry) => entryToRow(entry, user.id));
    const { error } = await supabase
      .from("portfolio_holdings")
      .upsert(rows, { onConflict: "user_id,id" });

    setIsCloudSyncing(false);

    if (error) {
      const message =
        "클라우드 동기화에 실패했습니다. 잠시 후 다시 시도해주세요.";
      setCloudSyncNotice(message);
      return {
        ok: false,
        message,
        syncedCount: 0
      };
    }

    setEntries(merged);
    setLocalEntries(merged);
    setLocalSyncDismissed(true);
    const message = `${localOnly.length}개의 로컬 보유종목을 클라우드에 동기화했습니다.`;
    setCloudSyncNotice(message);
    return {
      ok: true,
      message,
      syncedCount: localOnly.length
    };
  }, [entries, isCloudSyncEnabled, localEntries, user?.id]);

  const persistCloudEntry = useCallback(
    async (entry: PortfolioPositionInput) => {
      if (!isCloudSyncEnabled || !user?.id || !supabase) return;
      const { error } = await supabase
        .from("portfolio_holdings")
        .upsert([entryToRow(entry, user.id)], { onConflict: "user_id,id" });
      if (error) {
        setCloudSyncNotice("클라우드 저장 중 문제가 발생했습니다. 로컬 데이터는 유지됩니다.");
      }
    },
    [isCloudSyncEnabled, user?.id]
  );

  const addEntry = useCallback(
    (draft: PortfolioDraftInput) => {
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

      if (isCloudSyncEnabled) {
        setEntries((current) => [...current, entry]);
        setLocalEntries((current) => dedupeEntries([...current, entry]));
        void persistCloudEntry(entry);
        return;
      }

      setLocalEntries((current) => [...current, entry]);
    },
    [isCloudSyncEnabled, persistCloudEntry]
  );

  const removeEntry = useCallback(
    (id: string) => {
      if (isCloudSyncEnabled && supabase && user?.id) {
        setEntries((current) => current.filter((entry) => entry.id !== id));
        setLocalEntries((current) => current.filter((entry) => entry.id !== id));
        void supabase
          .from("portfolio_holdings")
          .delete()
          .eq("user_id", user.id)
          .eq("id", id)
          .then(({ error }) => {
            if (error) {
              setCloudSyncNotice(
                "클라우드 삭제 중 문제가 발생했습니다. 새로고침 후 다시 확인해주세요."
              );
            }
          });
        return;
      }

      setLocalEntries((current) => current.filter((entry) => entry.id !== id));
    },
    [isCloudSyncEnabled, user?.id]
  );

  const updateEntry = useCallback(
    (id: string, patch: Partial<PortfolioDraftInput>) => {
      const patchEntry = (entry: PortfolioPositionInput): PortfolioPositionInput => {
        const symbol = patch.symbol ? normalizeSymbol(patch.symbol) : entry.symbol;
        const buyPrice = Number.isFinite(patch.buyPrice)
          ? safeNumber(patch.buyPrice)
          : entry.buyPrice;
        const quantity = Number.isFinite(patch.quantity)
          ? safeNumber(patch.quantity)
          : entry.quantity;

        if (!symbol || buyPrice <= 0 || quantity <= 0) return entry;

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
      };

      if (isCloudSyncEnabled) {
        let updatedEntry: PortfolioPositionInput | null = null;
        setEntries((current) =>
          current.map((entry) => {
            if (entry.id !== id) return entry;
            updatedEntry = patchEntry(entry);
            return updatedEntry;
          })
        );
        setLocalEntries((current) =>
          current.map((entry) => {
            if (entry.id !== id) return entry;
            return patchEntry(entry);
          })
        );
        if (updatedEntry) {
          void persistCloudEntry(updatedEntry);
        }
        return;
      }

      setLocalEntries((current) =>
        current.map((entry) => (entry.id === id ? patchEntry(entry) : entry))
      );
    },
    [isCloudSyncEnabled, persistCloudEntry]
  );

  const value = useMemo(
    () => ({
      entries,
      addEntry,
      removeEntry,
      updateEntry,
      canSyncLocalToCloud,
      syncLocalToCloud,
      isCloudSyncEnabled,
      isCloudSyncing,
      cloudSyncNotice,
      isSupabaseReady: isSupabaseConfigured
    }),
    [
      entries,
      addEntry,
      removeEntry,
      updateEntry,
      canSyncLocalToCloud,
      syncLocalToCloud,
      isCloudSyncEnabled,
      isCloudSyncing,
      cloudSyncNotice
    ]
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
