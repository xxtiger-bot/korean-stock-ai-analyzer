import type { LucideIcon } from "lucide-react";
import { AlertCircle, Inbox, Loader2 } from "lucide-react";

type StateBlockProps = {
  title: string;
  description: string;
  icon?: LucideIcon;
  compact?: boolean;
};

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  compact = false
}: StateBlockProps) {
  return (
    <div
      className={`rounded-lg border border-dashed border-line bg-slate-50 text-center dark:border-dark-line dark:bg-slate-900/50 ${
        compact ? "p-4" : "p-6"
      }`}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-white text-slate-400 dark:bg-dark-panel dark:text-slate-500">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-3 text-sm font-bold text-ink dark:text-white">{title}</p>
      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
    </div>
  );
}

export function ErrorState({
  title,
  description,
  icon: Icon = AlertCircle
}: StateBlockProps) {
  return (
    <div className="rounded-lg border border-red-100 bg-red-50 p-4 dark:border-red-900/50 dark:bg-red-950/40">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-danger dark:bg-red-950 dark:text-red-300">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-bold text-danger dark:text-red-300">{title}</p>
          <p className="mt-1 text-sm font-semibold leading-6 text-red-700/80 dark:text-red-200/80">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}

export function LoadingState({ title, description }: Omit<StateBlockProps, "icon">) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-5 dark:border-dark-line dark:bg-slate-900/50">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-brand dark:bg-dark-panel">
          <Loader2 className="h-5 w-5 animate-spin" />
        </span>
        <div>
          <p className="text-sm font-bold text-ink dark:text-white">{title}</p>
          <p className="mt-1 text-sm font-semibold text-slate-500 dark:text-slate-400">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}
