import Link from "next/link";
import { BarChart3, BriefcaseBusiness, Star } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-white/95 backdrop-blur dark:border-dark-line dark:bg-slate-950/88">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex min-w-0 items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink text-white">
            <BarChart3 className="h-5 w-5" />
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-normal text-ink dark:text-white">
              KRX Insight
            </span>
            <span className="block truncate text-xs font-medium text-slate-500">
              한국 주식 분석
            </span>
          </span>
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <div className="hidden items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300 sm:flex">
            <Star className="h-4 w-4 text-amber-500" />
            관심종목
          </div>
          <Link
            href="/portfolio"
            className="inline-flex items-center gap-2 rounded-lg border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
          >
            <BriefcaseBusiness className="h-4 w-4 text-brand" />
            <span className="hidden sm:inline">내 보유종목</span>
            <span className="sm:hidden">보유종목</span>
          </Link>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
