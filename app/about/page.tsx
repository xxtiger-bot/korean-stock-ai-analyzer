export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function AboutPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold uppercase tracking-normal text-brand">About</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          KRX Insight 소개
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 한국 주식 분석을 위한 AI 보조 도구입니다. 현재가 확인과 일별 종가 기반
          기술지표를 함께 제공해 관찰 중심 의사결정을 돕습니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">주요 지원 기능</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- KIS 기준 현재가 조회 (가능한 경우)</li>
          <li>- data.go.kr 일별 종가 및 K선/기술지표 분석</li>
          <li>- AI 참고 분석 리포트</li>
          <li>- 내 보유종목 진단 및 리스크 요약</li>
          <li>- Supabase 기반 클라우드 동기화</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">현재 버전</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          현재 KRX Insight는 MVP(초기 제품) 버전입니다. 기능은 계속 개선 중이며, 데이터 가용성은
          외부 API 상태에 따라 달라질 수 있습니다.
        </p>
      </section>
    </main>
  );
}
