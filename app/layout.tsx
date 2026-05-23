import type { Metadata } from "next";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { WatchlistProvider } from "@/components/watchlist-provider";
import { PortfolioProvider } from "@/components/portfolio-provider";
import { AuthProvider } from "@/components/auth-provider";
import { SiteFooter } from "@/components/site-footer";

export const metadata: Metadata = {
  title: "KRX Insight | Korean Stock Analytics",
  description: "Korean stock analytics MVP with mock KRX market data."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <AuthProvider>
            <PortfolioProvider>
              <WatchlistProvider>
                <SiteHeader />
                {children}
                <SiteFooter />
              </WatchlistProvider>
            </PortfolioProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
