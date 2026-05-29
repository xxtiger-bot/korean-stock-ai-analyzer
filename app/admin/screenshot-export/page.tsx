import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminScreenshotExportPageClient } from "@/components/admin-screenshot-export-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Google Play Screenshot Export | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminScreenshotExportPage() {
  return (
    <AdminAccessGuard>
      <AdminScreenshotExportPageClient />
    </AdminAccessGuard>
  );
}

