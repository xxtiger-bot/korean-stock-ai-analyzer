"use client";

import { useRouter } from "next/navigation";
import { useAuth } from "@/components/auth-provider";
import { isAdminEmail } from "@/lib/admin";

function triggerLoginModal() {
  if (typeof window === "undefined") return false;
  const trigger = document.querySelector<HTMLElement>('[data-auth-login-trigger="true"]');
  if (!trigger) return false;
  trigger.click();
  return true;
}

type AdminAccessGuardProps = {
  children: React.ReactNode;
};

export function AdminAccessGuard({ children }: AdminAccessGuardProps) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">권한 확인 중입니다...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h1 className="text-xl font-bold text-ink dark:text-white">관리자 로그인이 필요합니다.</h1>
          <div className="mt-3">
            <button
              type="button"
              onClick={() => {
                const opened = triggerLoginModal();
                if (!opened) {
                  router.push("/");
                }
              }}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              로그인
            </button>
          </div>
        </section>
      </main>
    );
  }

  if (!isAdminEmail(user.email ?? "")) {
    return (
      <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <h1 className="text-xl font-bold text-ink dark:text-white">관리자 권한이 없습니다.</h1>
        </section>
      </main>
    );
  }

  return <>{children}</>;
}
