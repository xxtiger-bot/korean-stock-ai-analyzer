import Link from "next/link";
import { FeedbackTrigger } from "@/components/feedback-trigger";

export function SiteFooter() {
  return (
    <footer className="border-t border-line bg-white/95 dark:border-dark-line dark:bg-slate-950/88">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-2 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
          <span className="text-slate-500 dark:text-slate-400">© KRX Insight MVP</span>
          <span className="hidden sm:inline">·</span>
          <Link href="/about" className="hover:text-brand">
            소개
          </Link>
          <span>·</span>
          <Link href="/privacy" className="hover:text-brand">
            개인정보
          </Link>
          <span>·</span>
          <Link href="/disclaimer" className="hover:text-brand">
            면책 안내
          </Link>
          <span>·</span>
          <Link href="/beta" className="hover:text-brand">
            Beta
          </Link>
          <span>·</span>
          <FeedbackTrigger
            label="피드백"
            source="footer"
            className="font-semibold hover:text-brand"
          />
        </div>
        <p className="text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
          이 서비스는 투자 참고 정보이며, 매수/매도 추천이 아닙니다.
        </p>
      </div>
    </footer>
  );
}
