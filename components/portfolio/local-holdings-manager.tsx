"use client";

import { useEffect, useMemo, useState } from "react";

import { EmptyState } from "@/components/ui-states";
import { changeColorClass, formatKRW, formatPercent } from "@/lib/format";
import {
  LOCAL_HOLDINGS_STORAGE_KEY,
  type LocalHolding,
  readLocalHoldings,
  writeLocalHoldings
} from "@/lib/portfolio/local-holdings";
import type { Stock } from "@/lib/types";

type FormState = {
  symbol: string;
  stockName: string;
  quantity: string;
  averageBuyPrice: string;
  targetPrice: string;
  memo: string;
};

const INITIAL_FORM: FormState = {
  symbol: "",
  stockName: "",
  quantity: "",
  averageBuyPrice: "",
  targetPrice: "",
  memo: ""
};

function findStock(stocks: Stock[], symbol: string) {
  const normalized = symbol.trim().toUpperCase();
  if (!normalized) return null;
  return stocks.find((stock) => stock.symbol.toUpperCase() === normalized) ?? null;
}

function parsePositiveNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function LocalHoldingsManager({ stocks }: { stocks: Stock[] }) {
  const [holdings, setHoldings] = useState<LocalHolding[]>([]);
  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  useEffect(() => {
    setHoldings(readLocalHoldings());
  }, []);

  useEffect(() => {
    writeLocalHoldings(holdings);
  }, [holdings]);

  const safeStocks = useMemo(() => (Array.isArray(stocks) ? stocks : []), [stocks]);
  const matchedStock = useMemo(() => findStock(safeStocks, form.symbol), [safeStocks, form.symbol]);

  const localSummary = useMemo(() => {
    return holdings.map((holding) => {
      const stock = findStock(safeStocks, holding.symbol);
      const referencePrice =
        stock && Number.isFinite(stock.price) && stock.price > 0 ? stock.price : null;
      const profitLoss =
        referencePrice !== null
          ? (referencePrice - holding.averageBuyPrice) * holding.quantity
          : null;
      const returnRate =
        referencePrice !== null && holding.averageBuyPrice > 0
          ? ((referencePrice - holding.averageBuyPrice) / holding.averageBuyPrice) * 100
          : null;

      return {
        holding,
        stock,
        referencePrice,
        profitLoss,
        returnRate
      };
    });
  }, [holdings, safeStocks]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSymbolBlur() {
    if (!matchedStock) return;
    setForm((current) => ({
      ...current,
      symbol: matchedStock.symbol,
      stockName: current.stockName.trim().length > 0 ? current.stockName : matchedStock.koreanName || matchedStock.name
    }));
  }

  function handleAddHolding() {
    const symbol = form.symbol.trim().toUpperCase();
    const stockName =
      form.stockName.trim() ||
      matchedStock?.koreanName ||
      matchedStock?.name ||
      "";
    const quantity = parsePositiveNumber(form.quantity);
    const averageBuyPrice = parsePositiveNumber(form.averageBuyPrice);
    const targetPrice = parsePositiveNumber(form.targetPrice);

    if (!symbol || !stockName || !quantity || !averageBuyPrice) {
      return;
    }

    const nextHolding: LocalHolding = {
      id: `${symbol}-${Date.now()}`,
      symbol,
      stockName,
      quantity,
      averageBuyPrice,
      targetPrice,
      memo: form.memo.trim(),
      createdAt: new Date().toISOString()
    };

    setHoldings((current) => [nextHolding, ...current]);
    setForm(INITIAL_FORM);
  }

  function handleDeleteHolding(id: string) {
    setHoldings((current) => current.filter((holding) => holding.id !== id));
  }

  return (
    <section className="mx-auto w-full max-w-5xl px-3 py-4 sm:px-5 sm:py-5 lg:px-6">
      <div className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold uppercase tracking-normal text-brand">Local Holdings</p>
        <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
          로컬 보유종목 관리
        </h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          현재 로컬 브라우저에만 저장됩니다. 계정 동기화는 추후 제공됩니다.
        </p>

        <div className="mt-5 grid gap-3 rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-bold text-ink dark:text-white">
            종목 코드
            <input
              value={form.symbol}
              onChange={(event) => updateForm("symbol", event.target.value)}
              onBlur={handleSymbolBlur}
              placeholder="예: 005930"
              className="min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand dark:border-dark-line dark:bg-dark-panel dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-ink dark:text-white">
            종목명
            <input
              value={form.stockName}
              onChange={(event) => updateForm("stockName", event.target.value)}
              placeholder={matchedStock ? matchedStock.koreanName || matchedStock.name : "예: 삼성전자"}
              className="min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand dark:border-dark-line dark:bg-dark-panel dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-ink dark:text-white">
            보유 수량
            <input
              type="number"
              min="1"
              step="1"
              value={form.quantity}
              onChange={(event) => updateForm("quantity", event.target.value)}
              placeholder="예: 10"
              className="min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand dark:border-dark-line dark:bg-dark-panel dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-ink dark:text-white">
            매입 평균가
            <input
              type="number"
              min="1"
              step="1"
              value={form.averageBuyPrice}
              onChange={(event) => updateForm("averageBuyPrice", event.target.value)}
              placeholder="예: 320000"
              className="min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand dark:border-dark-line dark:bg-dark-panel dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-ink dark:text-white">
            목표가 (선택)
            <input
              type="number"
              min="1"
              step="1"
              value={form.targetPrice}
              onChange={(event) => updateForm("targetPrice", event.target.value)}
              placeholder="예: 350000"
              className="min-h-11 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand dark:border-dark-line dark:bg-dark-panel dark:text-white"
            />
          </label>

          <label className="grid gap-2 text-sm font-bold text-ink dark:text-white sm:col-span-2">
            메모 (선택)
            <textarea
              value={form.memo}
              onChange={(event) => updateForm("memo", event.target.value)}
              placeholder="메모를 남겨두면 다음 점검 때 참고하기 좋습니다."
              className="min-h-24 rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none transition focus:border-brand dark:border-dark-line dark:bg-dark-panel dark:text-white"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={handleAddHolding}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            로컬 보유종목 추가
          </button>
        </div>

        {localSummary.length === 0 ? (
          <div className="mt-5 rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
            <EmptyState
              compact
              title="로컬 보유종목 없음"
              description="로컬 브라우저에 보유종목을 추가하면 평가 금액과 참고 손익을 바로 확인할 수 있습니다."
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {localSummary.map(({ holding, referencePrice, profitLoss, returnRate, stock }) => {
              const priceAvailable = referencePrice !== null;
              const name = holding.stockName || stock?.koreanName || stock?.name || holding.symbol;
              return (
                <div
                  key={holding.id}
                  className="rounded-lg border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-bold text-ink dark:text-white">{name}</p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">{holding.symbol}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDeleteHolding(holding.id)}
                      className="inline-flex min-h-9 items-center justify-center rounded-lg border border-line bg-white px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 dark:hover:bg-slate-900/70"
                    >
                      삭제
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">수량</p>
                      <p className="mt-2 text-base font-bold text-ink dark:text-white">
                        {holding.quantity.toLocaleString("ko-KR")}주
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">매입 평균가</p>
                      <p className="mt-2 text-base font-bold text-ink dark:text-white">
                        {formatKRW(holding.averageBuyPrice)}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">현재 참고가</p>
                      <p className="mt-2 text-base font-bold text-ink dark:text-white">
                        {priceAvailable ? formatKRW(referencePrice) : "데이터 확인 필요"}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-400">
                        {priceAvailable ? stock?.quoteLabel ?? "최근 종가" : "평가 데이터 확인 필요"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">평가 손익</p>
                      <p
                        className={`mt-2 text-base font-bold ${
                          profitLoss !== null ? changeColorClass(profitLoss) : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {profitLoss !== null ? formatKRW(profitLoss) : "평가 데이터 확인 필요"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">수익률</p>
                      <p
                        className={`mt-2 text-base font-bold ${
                          returnRate !== null ? changeColorClass(returnRate) : "text-slate-500 dark:text-slate-400"
                        }`}
                      >
                        {returnRate !== null ? formatPercent(returnRate) : "평가 데이터 확인 필요"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-line bg-white p-3 dark:border-dark-line dark:bg-dark-panel">
                      <p className="text-xs font-bold uppercase tracking-normal text-slate-400">목표가 / 메모</p>
                      <p className="mt-2 text-sm font-bold text-ink dark:text-white">
                        {holding.targetPrice ? formatKRW(holding.targetPrice) : "목표가 없음"}
                      </p>
                      <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
                        {holding.memo || "메모 없음"}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
