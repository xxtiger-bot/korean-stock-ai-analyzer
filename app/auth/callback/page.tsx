import { Suspense } from "react";
import { AuthCallbackClient } from "@/app/auth/callback/auth-callback-client";

export const dynamic = "force-dynamic";

function CallbackFallback() {
  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-line bg-white p-6 text-center shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h1 className="text-base font-bold text-ink dark:text-white">로그인 처리</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          로그인 정보를 확인하는 중입니다...
        </p>
      </section>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={<CallbackFallback />}>
      <AuthCallbackClient />
    </Suspense>
  );
}
