import { Languages } from "lucide-react";
import { getIndicatorTranslations } from "@/lib/insights";
import type { Stock, TechnicalPoint } from "@/lib/types";

export function IndicatorTranslator({
  stock,
  latest
}: {
  stock: Stock;
  latest: TechnicalPoint;
}) {
  const translations = getIndicatorTranslations(stock, latest);

  return (
    <section className="max-w-full rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">
            지표 해석
          </p>
          <h2 className="mt-1 text-base font-bold text-ink dark:text-white">
            지표 해석
          </h2>
          <p className="mt-1 text-xs font-semibold leading-5 text-slate-500 dark:text-slate-400">
            기술 지표를 일반 투자자가 이해하기 쉬운 문장으로 풀어봅니다.
          </p>
        </div>
        <Languages className="h-5 w-5 text-slate-400" />
      </div>

      <div className="mt-5 grid gap-3">
        {translations.map((item) => (
          <article
            key={item.label}
            className="max-w-full rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50 sm:p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-ink dark:text-white">{item.label}</h3>
              <span className="max-w-full break-words rounded-md bg-white px-2 py-1 text-xs font-bold text-slate-500 dark:bg-dark-panel dark:text-slate-300">
                {item.value}
              </span>
            </div>
            <div className="mt-3 grid gap-2">
              <div className="rounded-md bg-white p-3 dark:bg-dark-panel">
                <p className="text-xs font-bold text-slate-400">쉬운 해석</p>
                <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {item.plainText}
                </p>
              </div>
              <div className="rounded-md bg-white p-3 dark:bg-dark-panel">
                <p className="text-xs font-bold text-slate-400">위험 의미</p>
                <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {item.riskMeaning}
                </p>
              </div>
              <div className="rounded-md bg-white p-3 dark:bg-dark-panel">
                <p className="text-xs font-bold text-slate-400">다음 관찰점</p>
                <p className="mt-1 break-words text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
                  {item.nextWatch}
                </p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
