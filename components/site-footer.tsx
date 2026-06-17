import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white/95 dark:border-dark-line dark:bg-slate-950/88">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="text-slate-500 dark:text-slate-400">© KRX Insight Beta</span>
          <Link href="/" className="hover:text-brand">
            홈
          </Link>
          <Link href="/pricing" className="hover:text-brand">
            Pricing
          </Link>
          <Link href="/feedback" className="hover:text-brand">
            Feedback
          </Link>
          <Link href="/disclaimer" className="hover:text-brand">
            Disclaimer
          </Link>
          <Link href="/beta" className="hover:text-brand">
            Beta
          </Link>
        </div>
        <p className="text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
          KRX Insight는 베타 서비스입니다. AI 분석은 투자 조언이 아니며, 최종 투자 판단은 사용자 책임입니다.
        </p>
      </div>
    </footer>
  );
}
