import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { WatchlistProvider } from "@/components/watchlist-provider";
import { PortfolioProvider } from "@/components/portfolio-provider";
import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter } from "@/components/site-footer";
import { MobileBottomNav } from "@/components/mobile-bottom-nav";

const metadataDescription =
  "한국 주식 현재가, 일별 종가, AI 분석, 보유종목 진단, 리스크 알림을 제공하는 한국 주식 분석 도구";

export const metadata: Metadata = {
<<<<<<< HEAD
  title: "KRX Insight | Korean Stock AI Analyzer",
  description: metadataDescription,
  manifest: "/manifest.webmanifest",
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
=======
  title: "KRX Insight | Korean Stock Analytics",
  description: "Korean stock analytics MVP with mock KRX market data.",
  manifest: "/manifest.webmanifest"
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
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
                <SiteFooter />
                <MobileBottomNav />
              </WatchlistProvider>
            </PortfolioProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
