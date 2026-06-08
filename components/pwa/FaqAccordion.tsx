"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";

export type FaqItem = {
  question: string;
  answer: string;
};

type FaqAccordionProps = {
  items: FaqItem[];
};

export function FaqAccordion({ items }: FaqAccordionProps) {
  const safeItems = Array.isArray(items) ? items : [];
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="grid gap-2">
      {safeItems.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article
            key={`${item.question}-${index}`}
            className="overflow-hidden rounded-lg border border-line bg-white dark:border-dark-line dark:bg-dark-panel"
          >
            <button
              type="button"
              className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
            >
              <span className="text-sm font-bold text-ink dark:text-white">{item.question}</span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition-transform dark:text-slate-400 ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-line px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:border-dark-line dark:text-slate-300">
                {item.answer}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
