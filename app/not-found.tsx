import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-3xl items-center justify-center px-4">
      <section className="w-full rounded-lg border border-line bg-white p-8 text-center shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <p className="text-xs font-bold uppercase tracking-normal text-slate-400">404</p>
        <h1 className="mt-2 text-2xl font-bold text-ink dark:text-white">종목을 찾을 수 없습니다</h1>
        <Link
          href="/"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-md bg-ink px-4 text-sm font-bold text-white hover:bg-slate-800 dark:bg-brand dark:hover:bg-blue-500"
        >
          홈으로
        </Link>
      </section>
    </main>
  );
}
