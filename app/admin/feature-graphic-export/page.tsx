import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminFeatureGraphicExportPageClient } from "@/components/admin-feature-graphic-export-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Feature Graphic Export | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminFeatureGraphicExportPage() {
  return (
    <AdminAccessGuard>
      <AdminFeatureGraphicExportPageClient />
    </AdminAccessGuard>
  );
}
