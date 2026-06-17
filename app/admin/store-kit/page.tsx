import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminStoreKitPageClient } from "@/components/admin-store-kit-page-client";
import { isAdminPagesEnabled } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Google Play Store Kit | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminStoreKitPage() {
  return (
    <AdminAccessGuard adminPagesEnabled={isAdminPagesEnabled()}>
      <AdminStoreKitPageClient />
    </AdminAccessGuard>
  );
}
