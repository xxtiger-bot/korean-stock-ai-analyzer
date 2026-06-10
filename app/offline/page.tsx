"use client";

import Link from "next/link";

export default function OfflinePage() {
  return (
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

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-brand px-4 py-2 text-sm font-bold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            다시 시도하기
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2 text-sm font-bold text-ink transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-300 dark:border-dark-line dark:bg-dark-panel dark:text-slate-100 dark:hover:bg-slate-900/60"
          >
            홈으로 이동
          </Link>
        </div>
      </section>
    </main>
  );
}
