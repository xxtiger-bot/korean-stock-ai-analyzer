"use client";

import { useMemo, useState } from "react";

type ShareCardProps = {
  title: string;
  subtitle?: string;
  statusLabel?: string;
  mainText: string;
  items: string[];
  dateLabel?: string;
  sourceLabel?: string;
  disclaimer?: string;
  ctaText?: string;
  compact?: boolean;
  href?: string;
  triggerLabel?: string;
};

function buildShareText({
  title,
  subtitle,
  statusLabel,
  mainText,
  items,
  dateLabel,
  sourceLabel,
  disclaimer,
  ctaText
}: ShareCardProps) {
  const safeItems = Array.isArray(items) ? items.filter((item) => item.trim().length > 0) : [];
  return [
    `[KRX Insight] ${title}`,
    subtitle ? subtitle : null,
    statusLabel ? `상태: ${statusLabel}` : null,
    mainText,
    safeItems.length > 0 ? safeItems.map((item) => `- ${item}`).join("\n") : null,
    dateLabel ? `기준: ${dateLabel}` : null,
    sourceLabel ? `출처: ${sourceLabel}` : null,
    disclaimer ? disclaimer : "AI 보조 분석이며, 투자 조언이 아닙니다.",
    ctaText ? `CTA: ${ctaText}` : null
  ]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function ShareCard(props: ShareCardProps) {
  const {
    title,
    subtitle,
    statusLabel,
    mainText,
    items,
    dateLabel,
    sourceLabel,
    disclaimer = "AI 보조 분석이며, 투자 조언이 아닙니다.",
    ctaText = "KRX Insight에서 더 확인하세요.",
    compact = false,
    triggerLabel = "공유 카드 보기"
  } = props;

  const [isOpen, setIsOpen] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "done" | "failed">("idle");

  const shareText = useMemo(() => buildShareText({ ...props, disclaimer, ctaText }), [props, disclaimer, ctaText]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(shareText);
      setCopyState("done");
      setTimeout(() => setCopyState("idle"), 1800);
    } catch {
      setCopyState("failed");
      setTimeout(() => setCopyState("idle"), 1800);
    }
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setIsOpen((open) => !open)}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900/70"
        >
          {isOpen ? "공유 카드 닫기" : triggerLabel}
        </button>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-ink transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-panel dark:text-white dark:hover:bg-slate-900/70"
        >
          {copyState === "done"
            ? "공유 문안 복사됨"
            : copyState === "failed"
              ? "복사 실패"
              : "공유 문안 복사"}
        </button>
        <button
          type="button"
          disabled
          className="inline-flex min-h-11 items-center justify-center rounded-lg border border-dashed border-line bg-slate-50 px-4 py-2.5 text-sm font-bold text-slate-400 dark:border-dark-line dark:bg-slate-900/50 dark:text-slate-500"
        >
          이미지 저장 Coming Soon
        </button>
      </div>

      {isOpen ? (
        <div
          className={`rounded-xl border border-line bg-white shadow-soft dark:border-dark-line dark:bg-dark-panel ${
            compact ? "p-4" : "p-5 sm:p-6"
          }`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-normal text-brand">KRX Insight</p>
              <h3 className="mt-2 text-xl font-bold tracking-normal text-ink dark:text-white">
                {title}
              </h3>
              {subtitle ? (
                <p className="mt-2 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
                  {subtitle}
                </p>
              ) : null}
            </div>
            {statusLabel ? (
              <span className="shrink-0 rounded-full border border-brand/15 bg-brand/10 px-3 py-1 text-[11px] font-bold text-brand">
                {statusLabel}
              </span>
            ) : null}
          </div>

          <div className="mt-4 rounded-xl border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
            <p className="text-base font-bold leading-7 text-ink dark:text-white">{mainText}</p>
            {Array.isArray(items) && items.length > 0 ? (
              <ul className="mt-4 grid gap-2">
                {items.map((item) => (
                  <li
                    key={item}
                    className="rounded-lg border border-line bg-white px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-400">
            {dateLabel ? <p>기준: {dateLabel}</p> : null}
            {sourceLabel ? <p>출처: {sourceLabel}</p> : null}
            <p>{disclaimer}</p>
            <p>{ctaText}</p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
