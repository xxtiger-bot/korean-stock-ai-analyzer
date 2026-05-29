export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">소개</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          KRX Insight 소개
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 한국 주식 시장을 더 체계적으로 점검할 수 있도록 돕는 AI 분석 보조 도구입니다.
          현재가와 일별 데이터, 리스크 변화 정보를 함께 보여주어 관찰 중심의 투자 점검 흐름을
          제공합니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">핵심 기능</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 오늘 시장 브리핑</li>
          <li>- AI 종목 분석</li>
          <li>- 보유종목 리스크 진단</li>
          <li>- 관심종목 관리</li>
          <li>- AI 리포트 저장</li>
          <li>- 피드백 제출</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">대상 사용자</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 한국 주식 종목을 정기적으로 점검하는 개인 투자자</li>
          <li>- 보유종목 리스크를 구조적으로 관리하고 싶은 사용자</li>
          <li>- 시장 브리핑과 종목 분석을 빠르게 확인하고 싶은 사용자</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">Beta 단계 안내</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          현재 KRX Insight는 Beta 단계(MVP)입니다. 기능은 지속적으로 개선 중이며, 일부 데이터는
          외부 API 상태에 따라 지연되거나 확인이 필요할 수 있습니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-400">
        KRX Insight는 투자 참고 정보를 제공하며, 매수/매도 추천 서비스가 아닙니다.
      </section>
    </main>
  );
}
