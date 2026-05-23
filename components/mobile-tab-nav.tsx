"use client";

import { useMemo } from "react";

type MobileTabNavItem = {
  key: string;
  label: string;
};

type MobileTabNavProps = {
  items: MobileTabNavItem[];
  activeKey: string;
  onChange: (key: string) => void;
  topClassName?: string;
};

export function MobileTabNav({
  items,
  activeKey,
  onChange,
  topClassName = "top-[72px]"
}: MobileTabNavProps) {
  const safeItems = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter(
        (item) =>
          item &&
          typeof item.key === "string" &&
          item.key.length > 0 &&
          typeof item.label === "string" &&
          item.label.length > 0
      ),
    [items]
  );

  if (safeItems.length === 0) {
    return null;
  }

  return (
    <nav
      className={`sticky z-20 -mx-1 mb-3 border-y border-line bg-white/95 px-1 py-2 backdrop-blur dark:border-dark-line dark:bg-slate-950/90 md:hidden ${topClassName}`}
      aria-label="모바일 탭"
    >
      <ul className="flex min-w-max items-center gap-1 overflow-x-auto whitespace-nowrap px-1 pb-0.5">
        {safeItems.map((item) => {
          const isActive = item.key === activeKey;
          return (
            <li key={item.key}>
              <button
                type="button"
                onClick={() => onChange(item.key)}
                className={`inline-flex min-h-9 items-center justify-center rounded-md border px-3 text-xs font-bold ${
                  isActive
                    ? "border-brand bg-blue-50 text-brand dark:bg-blue-950/40"
                    : "border-line bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/70 dark:text-slate-300"
                }`}
              >
                {item.label}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

