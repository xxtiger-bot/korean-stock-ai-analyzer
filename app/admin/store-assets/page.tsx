import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminStoreAssetsPageClient } from "@/components/admin-store-assets-page-client";
import { isAdminPagesEnabled } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Google Play Store Assets | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminStoreAssetsPage() {
  return (
    <AdminAccessGuard adminPagesEnabled={isAdminPagesEnabled()}>
      <AdminStoreAssetsPageClient />
    </AdminAccessGuard>
  );
}
