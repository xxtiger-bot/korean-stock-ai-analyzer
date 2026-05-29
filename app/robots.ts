import type { MetadataRoute } from "next";

function getSiteUrl() {
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  const fromVercel = process.env.VERCEL_URL?.trim();
  if (fromVercel) {
    const normalized = fromVercel.replace(/\/+$/, "");
    return normalized.startsWith("http") ? normalized : `https://${normalized}`;
  }
  return "http://localhost:3000";
}

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/admin",
        "/admin/beta-kit",
        "/admin/store-kit",
        "/admin/store-assets",
        "/admin/screenshot-kit",
        "/admin/screenshot-export",
        "/debug/market-data",
        "/mypage",
        "/portfolio",
        "/admin/checklist",
        "/admin/feedback"
      ]
    },
    sitemap: `${getSiteUrl()}/sitemap.xml`
  };
}
