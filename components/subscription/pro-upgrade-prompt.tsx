"use client";

import Link from "next/link";

type ProUpgradePromptProps = {
  title: string;
  description: string;
  featureName?: string;
  ctaLabel?: string;
  compact?: boolean;
  href?: string;
};

export function ProUpgradePrompt({
  title,
  description,
  featureName,
  ctaLabel = "베타 Pro 체험 신청",
  compact = false,
  href = "/pricing"
}: ProUpgradePromptProps) {
  return (
    <div
      className={`rounded-lg border border-blue-200 bg-blue-50/70 text-slate-700 shadow-sm dark:border-blue-900/60 dark:bg-blue-950/20 dark:text-slate-200 ${
        compact ? "p-3" : "p-4"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {featureName ? (
            <p className="text-[11px] font-bold uppercase tracking-normal text-brand">
              {featureName}
            </p>
          ) : null}
          <h3 className={`text-sm font-bold text-ink dark:text-white ${featureName ? "mt-1" : ""}`}>
            {title}
          </h3>
          <p
            className={`whitespace-pre-line text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300 ${
              compact ? "mt-1.5" : "mt-2"
            }`}
          >
            {description}
          </p>
        </div>
        <Link
          href={href}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-md border border-brand/20 bg-white px-3 py-2 text-xs font-bold text-brand transition hover:bg-blue-50 dark:border-blue-800/70 dark:bg-slate-950/40 dark:hover:bg-blue-950/40"
        >
          {ctaLabel}
        </Link>
      </div>
    </div>
  );
}
