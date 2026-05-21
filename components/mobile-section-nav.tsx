"use client";

import { useMemo } from "react";

type MobileSectionNavItem = {
  id: string;
  label: string;
};

type MobileSectionNavProps = {
  items: MobileSectionNavItem[];
  topClassName?: string;
};

export function MobileSectionNav({ items, topClassName = "top-16" }: MobileSectionNavProps) {
  const safeItems = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter(
        (item) => item && typeof item.id === "string" && typeof item.label === "string"
      ),
    [items]
  );

  if (safeItems.length === 0) {
    return null;
  }

  return (
    <nav
      className={`sticky z-20 -mx-1 mb-3 border-y border-line bg-white/95 px-1 py-2 backdrop-blur dark:border-dark-line dark:bg-slate-950/90 md:hidden ${topClassName}`}
      aria-label="섹션 이동"
    >
      <ul className="flex min-w-max items-center gap-1 overflow-x-auto whitespace-nowrap px-1 pb-0.5">
        {safeItems.map((item) => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="inline-flex h-8 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-300"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

