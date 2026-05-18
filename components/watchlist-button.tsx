"use client";

import { Star } from "lucide-react";
import { useWatchlist } from "@/components/watchlist-provider";

type WatchlistButtonProps = {
  symbol: string;
  compact?: boolean;
};

export function WatchlistButton({ symbol, compact = false }: WatchlistButtonProps) {
  const { isWatching, toggle } = useWatchlist();
  const active = isWatching(symbol);

  return (
    <button
      type="button"
      onClick={(event) => {
        event.preventDefault();
        toggle(symbol);
      }}
      className={`inline-flex items-center justify-center rounded-md border transition ${
        active
          ? "border-amber-300 bg-amber-50 text-amber-500"
          : "border-line bg-white text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:border-dark-line dark:bg-dark-panel dark:hover:text-slate-200"
      } ${compact ? "h-8 w-8" : "h-10 gap-2 px-3 text-sm font-semibold"}`}
      aria-label={active ? "관심종목 삭제" : "관심종목 추가"}
      title={active ? "관심종목 삭제" : "관심종목 추가"}
    >
      <Star className={`h-4 w-4 ${active ? "fill-current" : ""}`} />
      {!compact && <span>{active ? "관심 해제" : "관심 추가"}</span>}
    </button>
  );
}
