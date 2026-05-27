import type { LucideIcon } from "lucide-react";

type MetricCardProps = {
  label: string;
  value: string;
  subValue?: string;
  icon: LucideIcon;
  tone?: "neutral" | "up" | "down";
};

export function MetricCard({
  label,
  value,
  subValue,
  icon: Icon,
  tone = "neutral"
}: MetricCardProps) {
  const toneClass =
    tone === "up"
      ? "bg-red-50 text-danger dark:bg-red-950/50 dark:text-red-300"
      : tone === "down"
        ? "bg-blue-50 text-down dark:bg-blue-950/50 dark:text-blue-300"
        : "bg-slate-50 text-slate-600 dark:bg-slate-900 dark:text-slate-300";

  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-xl border border-line/90 bg-white p-4 shadow-soft transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg dark:border-dark-line dark:bg-dark-panel">
      <div className="flex items-center justify-between gap-3">
        <p className="min-w-0 truncate text-sm font-semibold text-slate-500 dark:text-slate-400">{label}</p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md ${toneClass}`}>
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-4 break-words text-lg font-bold text-ink dark:text-white sm:text-xl">{value}</p>
      {subValue && (
        <p className="mt-1 break-words text-sm font-semibold text-slate-400 dark:text-slate-500">
          {subValue}
        </p>
      )}
    </article>
  );
}
