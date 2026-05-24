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

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = getSiteUrl();
  const now = new Date();

  const paths = [
    "/",
    "/stocks/005930",
    "/portfolio",
    "/pricing",
    "/beta",
    "/mypage",
    "/about",
    "/privacy",
    "/disclaimer"
  ];

  return paths.map((path) => ({
    url: `${baseUrl}${path}`,
    lastModified: now
  }));
}
