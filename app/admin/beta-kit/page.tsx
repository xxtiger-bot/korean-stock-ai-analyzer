import type { Metadata } from "next";
import { AdminAccessGuard } from "@/components/admin-access-guard";
import { AdminBetaKitPageClient } from "@/components/admin-beta-kit-page-client";
import { getAdminDisabledCopy, isAdminPagesEnabled } from "@/lib/admin-guard";

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
  if (!isAdminPagesEnabled()) {
    const copy = getAdminDisabledCopy();

    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-8">
          <p className="text-xs font-bold tracking-normal text-slate-500 dark:text-slate-400">Admin</p>
          <h1 className="mt-2 text-2xl font-bold text-ink dark:text-white">{copy.title}</h1>
          <p className="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{copy.description}</p>
        </section>
      </main>
    );
  }

  return (
    <AdminAccessGuard>
      <AdminBetaKitPageClient />
    </AdminAccessGuard>
  );
}
