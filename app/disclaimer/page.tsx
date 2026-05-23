export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold uppercase tracking-normal text-brand">Disclaimer</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          투자 유의 및 면책 안내
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          본 서비스는 투자 참고를 위한 정보 제공 도구이며, 투자 자문 또는 투자 권유가 아닙니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">핵심 안내</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- AI 분석 결과는 참고 정보이며 투자 조언이 아닙니다.</li>
          <li>- 주가 데이터는 지연되거나 외부 API 실패 시 fallback 데이터로 표시될 수 있습니다.</li>
          <li>- 투자 결정과 그 결과에 대한 책임은 사용자 본인에게 있습니다.</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">데이터 소스 차이</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KIS 현재가와 data.go.kr 최근 종가는 데이터 기준 시점이 다릅니다. KIS는 현재가 기준,
          data.go.kr는 일별 종가 기준으로 제공되며 동일한 값이 아닐 수 있습니다.
        </p>
      </section>
    </main>
  );
}
