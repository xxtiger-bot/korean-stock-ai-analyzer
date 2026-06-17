import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminBetaKitPageClient } from "@/components/admin-beta-kit-page-client";
import { isAdminPagesEnabled } from "@/lib/admin-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Beta 테스트 운영 키트 | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminBetaKitPage() {
  return (
    <AdminAccessGuard adminPagesEnabled={isAdminPagesEnabled()}>
      <AdminBetaKitPageClient />
    </AdminAccessGuard>
  );
}
