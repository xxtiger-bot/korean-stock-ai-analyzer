export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">개인정보</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          개인정보 처리방침
        </h1>
        <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 서비스 제공에 필요한 최소한의 정보만 처리하며, 데이터 보호와 투명한 고지를
          최우선 원칙으로 운영합니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">수집하는 정보</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 이메일 주소 및 로그인 정보</li>
          <li>- 관심종목 데이터</li>
          <li>- 보유종목 데이터</li>
          <li>- AI 리포트 저장 정보</li>
          <li>- 피드백 제출 내용</li>
          <li>- 추천/초대 코드 관련 정보</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">데이터 사용 목적</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 계정 로그인 및 사용자 인증</li>
          <li>- 관심종목/보유종목 동기화</li>
          <li>- AI 리포트 저장 및 조회</li>
          <li>- 서비스 품질 개선 및 운영 안정화</li>
          <li>- 사용자 피드백 확인 및 응답</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">데이터 저장 위치 및 제3자 제공</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 클라우드 동기화 데이터는 Supabase 인프라를 통해 저장·관리됩니다.</li>
          <li>- 개인정보를 판매하지 않습니다.</li>
          <li>
            - 서비스 운영에 필요한 범위에서 인프라 제공자(예: 클라우드/인증/데이터베이스) 사용이
            포함될 수 있습니다.
          </li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">보관 기간, 파기 및 사용자 권리</h2>
        <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          <li>- 필요한 기간 동안만 보관하며, 목적 달성 후 지체 없이 파기합니다.</li>
          <li>- 사용자는 데이터 삭제 요청 및 계정 삭제 요청을 할 수 있습니다.</li>
          <li>- 로그인 없이 사용하는 로컬 데이터는 사용자 기기에서 직접 삭제할 수 있습니다.</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">투자 정보 관련 고지</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 투자 참고 정보를 제공하는 도구이며, 최종 투자 판단과 책임은 사용자 본인에게
          있습니다.
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-base font-bold text-ink dark:text-white">문의처</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          개인정보 관련 문의:{" "}
          <a className="text-brand hover:underline" href="mailto:fengyuanxin67@gmail.com">
            fengyuanxin67@gmail.com
          </a>
        </p>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-slate-50 p-4 text-xs font-semibold leading-5 text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-400">
        본 처리방침은 법령 및 서비스 정책 변경에 따라 업데이트될 수 있으며, 변경 시 본 페이지에서
        고지합니다.
      </section>
    </main>
  );
}
