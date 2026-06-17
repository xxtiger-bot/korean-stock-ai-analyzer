import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { WatchlistProvider } from "@/components/watchlist-provider";
import { PortfolioProvider } from "@/components/portfolio-provider";
import { AuthProvider } from "@/components/auth-provider";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const metadataDescription =
  "한국 주식 현재가, 일별 종가, AI 분석, 보유종목 진단, 리스크 알림을 제공하는 한국 주식 분석 도구";

export const metadata: Metadata = {
  title: "KRX Insight | Korean Stock AI Analyzer",
  description: metadataDescription,
  manifest: "/manifest.json",
  keywords: [
    "한국 주식",
    "KRX",
    "주식 분석",
    "AI 주식 분석",
    "삼성전자",
    "KIS",
    "data.go.kr",
    "포트폴리오 진단"
  ],
  openGraph: {
    title: "KRX Insight | Korean Stock AI Analyzer",
    description: metadataDescription,
    siteName: "KRX Insight",
    type: "website",
    locale: "ko_KR"
  },
  twitter: {
    card: "summary_large_image",
    title: "KRX Insight | Korean Stock AI Analyzer",
    description: metadataDescription
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body className="pb-20 md:pb-0">
        <ThemeProvider>
          <AuthProvider>
            <PortfolioProvider>
              <WatchlistProvider>
                <SiteHeader />
                {children}
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
                      <Link href="/privacy" className="hover:text-brand">
                        Privacy
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
                <MobileBottomNav />
              </WatchlistProvider>
            </PortfolioProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
