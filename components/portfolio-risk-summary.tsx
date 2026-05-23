"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { usePortfolio } from "@/components/portfolio-provider";
import { changeColorClass, formatPercent } from "@/lib/format";
import { PORTFOLIO_DIAGNOSIS_STORAGE_KEY } from "@/lib/storage-keys";
import type { PortfolioDiagnosis } from "@/lib/types";

type DiagnosisCachePayload = {
  savedAt?: string;
  items?: PortfolioDiagnosis[];
};

type SummaryItem = {
  id: string;
  symbol: string;
  stockName: string;
  market: string;
  returnRate: number | null;
  judgement: string;
  coreReason: string;
};

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function formatJudgementLabel(judgement: string) {
  if (judgement === "리스크 관리 관찰") return "리스크 관리 필요";
  if (judgement === "비중 조절 검토 구간") return "비중 조절 검토";
  return judgement;
}

function judgementRank(judgement: string) {
  if (judgement === "리스크 관리 관찰") return 0;
  if (judgement === "비중 조절 검토 구간") return 1;
  if (judgement === "대기 / 확인 필요") return 2;
  if (judgement === "유지 관찰") return 3;
  if (judgement === "추가 관찰 가능") return 4;
  return 5;
}

function getCoreReason(diagnosis: PortfolioDiagnosis | null) {
  if (!diagnosis) return "진단 대기 중";

  if (diagnosis.judgement === "유지 관찰") {
    return "현재 수익 구간이고 단기 추세가 유지되어 보유 상태를 관찰할 수 있습니다.";
  }

  if (
    diagnosis.judgement === "리스크 관리 관찰" ||
    diagnosis.judgement === "비중 조절 검토 구간"
  ) {
    return "추세 약화 또는 손실 확대 가능성이 있어 리스크 관리가 필요합니다.";
  }

  if (diagnosis.judgement === "추가 관찰 가능") {
    return "지지 확인과 거래량 조건이 동반될 때 추가 관찰이 가능합니다.";
  }

  return "데이터 재확인과 추세 확인이 필요한 구간입니다.";
}

export function PortfolioRiskSummary() {
  const { entries } = usePortfolio();
  const [cachedItems, setCachedItems] = useState<PortfolioDiagnosis[]>([]);

  const safeEntries = useMemo(
    () => (Array.isArray(entries) ? entries : []),
    [entries]
  );

  useEffect(() => {
    function readCache() {
      try {
        const raw = window.localStorage.getItem(PORTFOLIO_DIAGNOSIS_STORAGE_KEY);
        if (!raw) {
          setCachedItems([]);
          return;
        }

        const parsed = JSON.parse(raw) as DiagnosisCachePayload | null;
        const items = Array.isArray(parsed?.items) ? parsed.items : [];
        setCachedItems(items);
      } catch {
        setCachedItems([]);
      }
    }

    readCache();
    const onStorage = (event: StorageEvent) => {
      if (event.key === PORTFOLIO_DIAGNOSIS_STORAGE_KEY) {
        readCache();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  const topItems = useMemo(() => {
    const diagnosisMap = new Map<string, PortfolioDiagnosis>();
    const safeDiagnoses = Array.isArray(cachedItems) ? cachedItems : [];
    for (const item of safeDiagnoses) {
      if (typeof item?.id === "string") {
        diagnosisMap.set(item.id, item);
      }
    }

    const merged = safeEntries.map((entry): SummaryItem => {
      const diagnosis = diagnosisMap.get(entry.id) ?? null;
      const returnRate = diagnosis ? safeNumber(diagnosis.returnRate, 0) : null;

      return {
        id: entry.id,
        symbol: entry.symbol,
        stockName: safeText(diagnosis?.stockName, safeText(entry.stockName, entry.symbol)),
        market: safeText(diagnosis?.market, safeText(entry.market, "시장 확인 필요")),
        returnRate,
        judgement: safeText(diagnosis?.judgement, "진단 대기 중"),
        coreReason: getCoreReason(diagnosis)
      };
    });

    return merged
      .sort((left, right) => {
        const judgementDiff = judgementRank(left.judgement) - judgementRank(right.judgement);
        if (judgementDiff !== 0) return judgementDiff;

        const leftReturn = Number.isFinite(left.returnRate ?? NaN) ? (left.returnRate as number) : 0;
        const rightReturn = Number.isFinite(right.returnRate ?? NaN) ? (right.returnRate as number) : 0;
        return leftReturn - rightReturn;
      })
      .slice(0, 3);
  }, [cachedItems, safeEntries]);

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
        <div className="mt-3 rounded-lg border border-dashed border-line bg-white p-4 text-center dark:border-dark-line dark:bg-dark-panel">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-slate-50 text-slate-400 dark:bg-slate-900/70 dark:text-slate-500">
            <AlertTriangle className="h-5 w-5" />
          </div>
          <p className="mt-3 text-sm font-bold text-ink dark:text-white">
            아직 등록된 보유종목이 없습니다.
          </p>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            내 보유종목을 추가하면 AI가 리스크를 진단해드립니다.
          </p>
          <Link
            href="/portfolio"
            className="mt-3 inline-flex h-9 items-center justify-center rounded-md bg-brand px-3 text-xs font-bold text-white hover:bg-blue-700"
          >
            내 보유종목 추가하기
          </Link>
        </div>
      ) : topItems.length === 0 ? (
        <div className="mt-3 rounded-md border border-line bg-white px-3 py-3 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
          진단 대기 중
        </div>
      ) : (
        <div className="mt-3 grid gap-2">
          {topItems.map((item) => {
            const rate = item.returnRate;
            return (
              <article
                key={item.id}
                className="rounded-md border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-ink dark:text-white">
                      {item.stockName}
                    </p>
                    <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {item.symbol} · {item.market}
                    </p>
                  </div>
                  <span className="rounded-md border border-line bg-slate-50 px-2 py-1 text-xs font-bold text-slate-700 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-200">
                    {formatJudgementLabel(item.judgement)}
                  </span>
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                  수익률:{" "}
                  {Number.isFinite(rate ?? NaN) ? (
                    <span className={changeColorClass(rate as number)}>
                      {formatPercent(rate as number)}
                    </span>
                  ) : (
                    <span>진단 대기 중</span>
                  )}
                </p>
                <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">
                  핵심 판단 이유: {item.coreReason}
                </p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
