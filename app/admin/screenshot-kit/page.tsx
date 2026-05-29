import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminScreenshotKitPageClient } from "@/components/admin-screenshot-kit-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Google Play Screenshot Kit | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminScreenshotKitPage() {
  return (
    <AdminAccessGuard>
      <AdminScreenshotKitPageClient />
    </AdminAccessGuard>
  );
}
