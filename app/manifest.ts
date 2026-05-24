import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  const screenshots = [
    {
      src: "/screenshots/home-1080x1920.png",
      sizes: "1080x1920",
      type: "image/png",
      label: "홈 화면 - 오늘 시장 브리핑과 종목 검색",
      form_factor: "narrow"
    },
    {
      src: "/screenshots/stock-1080x1920.png",
      sizes: "1080x1920",
      type: "image/png",
      label: "종목 상세 - 차트와 AI 분석",
      form_factor: "narrow"
    },
    {
      src: "/screenshots/portfolio-1080x1920.png",
      sizes: "1080x1920",
      type: "image/png",
      label: "포트폴리오 - 보유종목 진단과 리포트",
      form_factor: "narrow"
    },
    {
      src: "/screenshots/dashboard-1920x1080.png",
      sizes: "1920x1080",
      type: "image/png",
      label: "데스크톱 대시보드",
      form_factor: "wide"
    },
    {
      src: "/screenshots/mypage-1920x1080.png",
      sizes: "1920x1080",
      type: "image/png",
      label: "내 계정 및 동기화 상태",
      form_factor: "wide"
    }
  ] as unknown as MetadataRoute.Manifest["screenshots"];

  return {
    name: "KRX Insight",
    short_name: "KRX Insight",
    description: "한국 주식 AI 분석과 보유종목 리스크 진단 도구",
    start_url: "/?source=pwa",
    scope: "/",
    id: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#0f172a",
    lang: "ko",
    categories: ["finance", "business", "productivity"],
    prefer_related_applications: false,
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable"
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable"
      }
    ],
    shortcuts: [
      {
        name: "종목 검색",
        short_name: "검색",
        description: "검색 영역으로 바로 이동",
        url: "/#search",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      },
      {
        name: "내 보유종목",
        short_name: "보유",
        description: "포트폴리오 진단으로 이동",
        url: "/portfolio",
        icons: [{ src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }]
      }
    ],
    screenshots
  };
}
