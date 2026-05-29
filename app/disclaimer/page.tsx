export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">면책 안내</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          투자 유의 및 면책 안내
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 투자 참고 정보 제공 도구이며, 투자 판단에 관한 최종 책임은 사용자에게
          있습니다.
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          본 서비스는 투자 참고 정보이며, 매수/매도 추천이나 투자 자문이 아닙니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">핵심 고지</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- KRX Insight는 투자 참고 정보 제공 도구입니다.</li>
          <li>- 매수/매도 추천이 아닙니다.</li>
          <li>- 투자 자문, 금융 자문, 수익 보장을 제공하지 않습니다.</li>
          <li>- AI 분석 결과는 참고용이며 최종 투자 판단은 사용자 본인 책임입니다.</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">데이터 기준 및 한계</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 데이터는 지연되거나 오류가 있을 수 있습니다.</li>
          <li>- KIS 데이터는 현재가(시세) 기준으로 표시됩니다.</li>
          <li>- data.go.kr 데이터는 일별 종가 기준으로 표시됩니다.</li>
          <li>- 두 소스의 기준 시점이 달라 동일 값이 아닐 수 있습니다.</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">Beta 단계 안내</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          현재 서비스는 Beta 단계로, 일부 기능과 데이터 표시 방식은 업데이트 과정에서 변경될 수
          있습니다.
        </p>
      </section>
    </main>
  );
}
