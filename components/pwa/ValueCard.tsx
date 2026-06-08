import type { LucideIcon } from "lucide-react";

type ValueCardProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function ValueCard({ title, description, icon: Icon }: ValueCardProps) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 dark:border-dark-line dark:bg-dark-panel">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-blue-50 text-brand dark:bg-blue-950/50 dark:text-blue-300">
          <Icon className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h3 className="text-base font-bold text-ink dark:text-white">{title}</h3>
          <p className="mt-1 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        </div>
      </div>
    </article>
  );
}
