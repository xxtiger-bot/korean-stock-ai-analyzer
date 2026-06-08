"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
<<<<<<< HEAD
    <main className="mx-auto flex min-h-[calc(100dvh-96px)] w-full max-w-3xl items-center px-4 py-10 sm:px-6">
      <section className="w-full rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-card sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-600 dark:text-blue-400">
          Offline
        </p>
        <h1 className="mt-3 text-2xl font-bold text-slate-900 dark:text-slate-100 sm:text-3xl">
          현재 오프라인 상태입니다
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
          표시 중인 데이터는 마지막 동기화 기준일 수 있습니다. 네트워크 연결 후 다시 시도해 주세요.
        </p>
=======
    <main className="mx-auto flex min-h-[70vh] w-full max-w-3xl items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-8">
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">오프라인 안내</p>
          <h1 className="text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
            현재 오프라인 상태입니다
          </h1>
          <p className="text-sm font-medium leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            표시 중인 데이터는 마지막 동기화 기준일 수 있습니다. 네트워크 연결 후 다시 시도해
            주세요.
          </p>
        </div>
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
<<<<<<< HEAD
            className="inline-flex min-h-12 items-center justify-center rounded-xl bg-slate-900 px-5 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-slate-200"
=======
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
          >
            다시 시도하기
          </button>
          <Link
            href="/"
<<<<<<< HEAD
            className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-dark-line dark:bg-dark-card dark:text-slate-200 dark:hover:bg-slate-900"
=======
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-dark-line dark:bg-dark-panel dark:text-slate-100 dark:hover:bg-slate-900/60"
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
          >
            홈으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
