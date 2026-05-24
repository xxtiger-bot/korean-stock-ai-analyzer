import type { Metadata } from "next";
import { AdminFeedbackPageClient } from "@/components/admin-feedback-page-client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "피드백 관리 | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

export default function AdminFeedbackPage() {
  return <AdminFeedbackPageClient />;
}
