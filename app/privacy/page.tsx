export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">개인정보</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          개인정보 처리 안내
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 서비스 제공에 필요한 최소한의 정보만 처리하며, 사용자 데이터 보호를
          최우선으로 합니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">수집/저장 데이터</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 이메일 (email)</li>
          <li>- 보유종목 (portfolio holdings)</li>
          <li>- 알림 조건 (alert rules)</li>
          <li>- 저장된 리포트 (saved reports)</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">데이터 사용 목적</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 로그인 및 사용자 인증</li>
          <li>- 보유종목/알림 조건 클라우드 동기화</li>
          <li>- 사용자가 저장한 리포트 이력 조회</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">추가 안내</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          사용자 데이터는 판매하지 않습니다. 사용자는 로컬 데이터를 직접 삭제할 수 있으며,
          언제든지 로그아웃할 수 있습니다.
        </p>
      </section>
    </main>
  );
}
