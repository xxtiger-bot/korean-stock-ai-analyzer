import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PWA 설치 안내 | KRX Insight",
  description: "KRX Insight를 홈 화면에 추가해 앱처럼 사용하는 방법 안내"
};

export default function PwaGuidePage() {
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">PWA 설치 안내</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white">홈 화면에 추가하기</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 홈 화면에 추가하면 앱처럼 빠르게 실행할 수 있습니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-lg font-bold text-ink dark:text-white">Android Chrome 설치 방법</h2>
        <ol className="mt-3 grid gap-2">
          <li className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            1. 브라우저 메뉴를 엽니다.
          </li>
          <li className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            2. 홈 화면에 추가를 선택합니다.
          </li>
          <li className="rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            3. KRX Insight를 홈 화면에서 실행합니다.
          </li>
        </ol>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-lg font-bold text-ink dark:text-white">빠른 이동</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700"
          >
            홈으로 이동
          </Link>
          <Link
            href="/beta"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          >
            베타 페이지 보기
          </Link>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-5 shadow-soft dark:border-amber-900/60 dark:bg-amber-950/40 sm:p-6">
        <h2 className="text-lg font-bold text-amber-900 dark:text-amber-100">설치 문제 해결</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-amber-900 dark:text-amber-100">
          이미 설치한 App 아이콘이 열리지 않으면 기존 홈 화면 아이콘을 삭제한 뒤,
          Chrome에서 다시 설치해 주세요.
        </p>
      </section>
    </main>
  );
}
