"use client";

import { useMemo, useState } from "react";
import { Calculator, ShieldAlert } from "lucide-react";
import { DATA_UPDATED_AT, DISCLAIMER, createTradingPlan, type HoldingPeriod } from "@/lib/insights";
import { changeColorClass, formatKRW, formatNumber, formatPercent } from "@/lib/format";
import type { Stock } from "@/lib/types";

export function TradingPlanHelper({ stock }: { stock: Stock }) {
  const [entryPrice, setEntryPrice] = useState(String(stock.price));
  const [quantity, setQuantity] = useState("10");
  const [holdingPeriod, setHoldingPeriod] = useState<HoldingPeriod>("short");

  const parsedEntryPrice = Number(entryPrice);
  const parsedQuantity = Number(quantity);
  const isValid =
    Number.isFinite(parsedEntryPrice) &&
    Number.isFinite(parsedQuantity) &&
    parsedEntryPrice > 0 &&
    parsedQuantity >= 0;
  const plan = useMemo(
    () =>
      isValid
        ? createTradingPlan(stock, parsedEntryPrice, parsedQuantity, holdingPeriod)
        : createTradingPlan(stock, stock.price, 0, holdingPeriod),
    [holdingPeriod, isValid, parsedEntryPrice, parsedQuantity, stock]
  );

  return (
    <section className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            매매 계획 도우미
          </p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">
            매매 계획 도우미
          </h2>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
            내 매입가, 수량, 계획 기간 기준으로 손익과 참고 관찰 위치를 계산합니다.
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-400">
            데이터 업데이트 {DATA_UPDATED_AT}
          </p>
        </div>
        <Calculator className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="grid gap-2">
          <span className="text-xs font-bold text-slate-400">나의 매입가</span>
          <input
            value={entryPrice}
            onChange={(event) => setEntryPrice(event.target.value)}
            inputMode="decimal"
            className="h-11 rounded-md border border-line bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-brand focus:ring-4 focus:ring-blue-50 dark:border-dark-line dark:bg-slate-900/70 dark:text-white dark:focus:ring-blue-950"
          />
        </label>
        <label className="grid gap-2">
          <span className="text-xs font-bold text-slate-400">보유 수량</span>
          <input
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            inputMode="numeric"
            className="h-11 rounded-md border border-line bg-slate-50 px-3 text-sm font-bold text-ink outline-none focus:border-brand focus:ring-4 focus:ring-blue-50 dark:border-dark-line dark:bg-slate-900/70 dark:text-white dark:focus:ring-blue-950"
          />
        </label>
      </div>

      <div className="mt-4">
        <p className="text-xs font-bold text-slate-400">계획 보유 기간</p>
        <div className="mt-2 grid grid-cols-3 gap-2 rounded-lg border border-line bg-slate-50 p-1 dark:border-dark-line dark:bg-slate-900/50">
          {[
            ["short", "단기"],
            ["mid", "중기"],
            ["long", "장기"]
          ].map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setHoldingPeriod(value as HoldingPeriod)}
              className={`h-9 rounded-md text-xs font-bold transition ${
                holdingPeriod === value
                ? "bg-ink text-white dark:bg-brand"
                  : "text-slate-500 hover:bg-white dark:text-slate-300 dark:hover:bg-dark-panel"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!isValid && (
        <p className="mt-3 rounded-md border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold text-danger dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
          매입가와 수량을 숫자로 입력해 주세요.
        </p>
      )}

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
          <p className="text-xs font-bold text-slate-400">최근 종가 기준 손익 금액</p>
          <p className={`mt-2 text-xl font-bold ${changeColorClass(plan.profitLossAmount)}`}>
            {plan.profitLossAmount > 0 ? "+" : ""}
            {formatKRW(plan.profitLossAmount)}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
          <p className="text-xs font-bold text-slate-400">최근 종가 기준 손익률</p>
          <p className={`mt-2 text-xl font-bold ${changeColorClass(plan.profitLossRate)}`}>
            {formatPercent(plan.profitLossRate)}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
          <p className="text-xs font-bold text-slate-400">참고 관찰 지지위</p>
          <p className="mt-2 text-lg font-bold text-ink dark:text-white">
            {formatKRW(plan.supportPrice)}
          </p>
        </div>
        <div className="rounded-lg border border-line bg-slate-50 p-4 dark:border-dark-line dark:bg-slate-900/50">
          <p className="text-xs font-bold text-slate-400">참고 관찰 저항위</p>
          <p className="mt-2 text-lg font-bold text-ink dark:text-white">
            {formatKRW(plan.resistancePrice)}
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
        <p className="text-xs font-bold text-slate-400">참고 관찰 위치 메모</p>
        <p className="mt-1 text-sm font-semibold text-slate-600 dark:text-slate-300">
          최근 종가 {formatKRW(stock.price)} · 수량 {formatNumber(parsedQuantity || 0)}주 · {plan.periodLabel}
          {stock.date ? ` · ${stock.date} 기준` : ""}
        </p>
      </div>

      <div className="mt-4 rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50">
        <p className="text-xs font-bold text-slate-400">참고 관찰 전략</p>
        <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          {plan.observationStrategy}
        </p>
      </div>

      <div className="mt-4 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-5 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        <span>
          {plan.warning} {DISCLAIMER}
        </span>
      </div>
    </section>
  );
}
