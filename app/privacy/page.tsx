import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | KRX Insight",
  description: "KRX Insight 개인정보 처리방침",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h1 className="text-3xl font-semibold tracking-tight text-ink dark:text-white">
          개인정보 처리방침
        </h1>
        <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
          KRX Insight는 사용자의 개인정보를 소중하게 생각하며, 서비스 제공에 필요한 범위에서만
          정보를 수집하고 이용합니다.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-xl font-semibold text-ink dark:text-white">수집하는 정보</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
          <li>이메일 주소 및 로그인 정보</li>
          <li>관심종목 데이터</li>
          <li>보유종목 데이터</li>
          <li>AI 리포트 저장 정보</li>
          <li>피드백 제출 내용</li>
          <li>추천/초대 코드 관련 정보</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-xl font-semibold text-ink dark:text-white">정보 사용 목적</h2>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-700 dark:text-slate-200">
          <li>계정 로그인 및 사용자 식별</li>
          <li>관심종목 / 보유종목 동기화</li>
          <li>AI 리포트 저장 및 조회</li>
          <li>서비스 품질 개선</li>
          <li>피드백 응답 및 문의 처리</li>
        </ul>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-xl font-semibold text-ink dark:text-white">데이터 저장 및 제3자 제공</h2>
        <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
          사용자 데이터는 서비스 운영을 위해 Supabase 기반 인프라에 저장될 수 있습니다. KRX Insight는
          개인정보를 판매하지 않으며, 인증·데이터 저장 등 서비스 제공에 필요한 범위에서만 인프라
          제공자를 사용할 수 있습니다.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-xl font-semibold text-ink dark:text-white">사용자 권리</h2>
        <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
          사용자는 언제든지 데이터 삭제 요청 및 계정 삭제 요청을 할 수 있습니다. 요청이 접수되면 관련
          법령과 내부 정책에 따라 처리됩니다.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-xl font-semibold text-ink dark:text-white">투자 정보 관련 고지</h2>
        <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
          KRX Insight의 분석과 브리핑은 투자 판단을 돕기 위한 참고 정보이며, 특정 종목의 매수·매도·보유를
          지시하거나 수익을 보장하지 않습니다. 최종 투자 판단은 사용자 본인의 책임입니다.
        </p>
      </section>

      <section className="rounded-2xl border border-line bg-white p-6 shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h2 className="text-xl font-semibold text-ink dark:text-white">문의처</h2>
        <p className="mt-4 text-sm leading-6 text-slate-700 dark:text-slate-200">
          개인정보 및 서비스 관련 문의:
          <br />
          <a
            href="mailto:fengyuanxin67@gmail.com"
            className="font-medium text-brand hover:underline"
          >
            fengyuanxin67@gmail.com
          </a>
        </p>
      </section>
    </main>
  );
}
