import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminDashboardPageClient } from "@/components/admin-dashboard-page-client";
import { isAdminPagesEnabled } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "KRX Insight Admin",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminPage() {
  return (
    <AdminAccessGuard adminPagesEnabled={isAdminPagesEnabled()}>
      <AdminDashboardPageClient />
    </AdminAccessGuard>
  );
}
