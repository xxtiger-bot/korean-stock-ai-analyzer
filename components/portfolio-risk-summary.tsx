"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui-states";
import { usePortfolio } from "@/components/portfolio-provider";
import { changeColorClass, formatPercent } from "@/lib/format";
import type { PortfolioDiagnosis } from "@/lib/types";
import { useEffect, useMemo, useState } from "react";

type DiagnoseResponse = {
  items?: PortfolioDiagnosis[];
};

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function topRiskItems(items: PortfolioDiagnosis[]) {
  const safeItems = Array.isArray(items) ? items : [];
  return [...safeItems]
    .sort(
      (left, right) =>
        safeNumber(right.riskManagementScore) - safeNumber(left.riskManagementScore)
    )
    .slice(0, 3);
}

export function PortfolioRiskSummary() {
  const { entries } = usePortfolio();
  const [items, setItems] = useState<PortfolioDiagnosis[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const safeEntries = useMemo(
    () => (Array.isArray(entries) ? entries : []),
    [entries]
  );
  const entryKey = useMemo(
    () =>
      safeEntries
        .map((entry) => `${entry.id}:${entry.symbol}:${entry.buyPrice}:${entry.quantity}`)
        .join("|"),
    [safeEntries]
  );

  useEffect(() => {
    if (safeEntries.length === 0) {
      setItems([]);
      setError("");
      return;
    }

    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setError("");
      try {
        const response = await fetch("/api/portfolio/diagnose", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ positions: safeEntries }),
          cache: "no-store"
        });

        if (!response.ok) {
          throw new Error("risk summary request failed");
        }

        const payload = (await response.json().catch(() => null)) as DiagnoseResponse | null;
        const safeItems = Array.isArray(payload?.items) ? payload.items : [];

        if (!cancelled) {
          setItems(safeItems);
        }
      } catch {
        if (!cancelled) {
          setItems([]);
          setError("보유종목 리스크 요약을 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void load();

    return () => {
      cancelled = true;
    };
  }, [entryKey, safeEntries]);

  const topItems = useMemo(() => topRiskItems(items), [items]);

  return (
    <section className="mt-4 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink dark:text-white">내 보유종목 리스크 요약</h3>
        <Link
          href="/portfolio"
          className="text-xs font-bold text-brand hover:text-blue-700 dark:text-blue-300"
        >
          전체 보기
        </Link>
      </div>

      {safeEntries.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            icon={AlertTriangle}
            title="보유종목 없음"
            description="보유종목을 추가하면 오늘 리스크 상승 TOP 3를 자동으로 정리해드립니다."
          />
        </div>
      ) : isLoading ? (
        <div className="mt-3">
          <LoadingState
            title="리스크 요약 계산 중"
            description="보유종목의 일별 데이터와 현재가를 확인하고 있습니다."
          />
        </div>
      ) : error ? (
        <div className="mt-3">
          <ErrorState title="리스크 요약 오류" description={error} />
        </div>
      ) : topItems.length === 0 ? (
        <div className="mt-3">
          <EmptyState
            compact
            icon={AlertTriangle}
            title="표시할 리스크 없음"
            description="현재 계산 가능한 리스크 상승 종목이 없습니다."
          />
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {topItems.map((item: PortfolioDiagnosis) => {
            const riskScore = safeNumber(item.riskManagementScore);
            const returnRate = safeNumber(item.returnRate);
            const reasons = Array.isArray(item.riskManagementReasons)
              ? item.riskManagementReasons
              : [];
            const reason = reasons[0] ?? "리스크 관리 관찰 포인트 재확인이 필요합니다.";

            return (
              <article
                key={item.id}
                className="rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink dark:text-white">
                      {safeText(item.stockName, item.symbol)}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.symbol} · {safeText(item.market, "시장 확인 필요")}
                    </p>
                  </div>
                  <span className="rounded-md border border-red-200 bg-red-50 px-2 py-1 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
                    위험 {riskScore}/100
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  판단: {safeText(item.judgement, "대기 / 확인 필요")}
                </p>
                <p className="mt-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  수익률: <span className={changeColorClass(returnRate)}>{formatPercent(returnRate)}</span>
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  {reason}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
