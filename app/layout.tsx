import type { Metadata } from "next";
import "@/app/globals.css";
import { SiteHeader } from "@/components/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { WatchlistProvider } from "@/components/watchlist-provider";

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
          <WatchlistProvider>
            <SiteHeader />
            {children}
          </WatchlistProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
