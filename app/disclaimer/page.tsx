<<<<<<< HEAD
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
=======
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "투자 유의사항 및 AI 분석 고지 | KRX Insight",
  description: "KRX Insight 투자 유의사항 및 AI 분석 고지"
};

function SectionCard({
  title,
  children
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
      <h2 className="text-lg font-bold text-ink dark:text-white sm:text-xl">{title}</h2>
      <div className="mt-3 text-sm font-semibold leading-7 text-slate-600 dark:text-slate-300 sm:text-base">
        {children}
      </div>
    </section>
  );
}

export default function DisclaimerPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="space-y-5 sm:space-y-6">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">Disclaimer</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ink dark:text-white sm:text-4xl">
            투자 유의사항 및 AI 분석 고지
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            KRX Insight는 한국 주식 데이터를 정리하고 AI 보조 분석을 제공하는 참고 도구입니다.
            아래 내용을 확인한 뒤 보수적으로 활용해 주세요.
          </p>
        </section>

        <SectionCard title="1. AI 분석의 성격">
          KRX Insight의 AI 분석은 투자 판단을 돕기 위한 참고 정보이며, 특정 종목의
          매수·매도·보유를 지시하거나 보장하지 않습니다.
        </SectionCard>

        <SectionCard title="2. 수익 보장 없음">
          본 서비스는 투자 수익을 보장하지 않으며, 모든 투자 결정과 그 결과는 사용자
          본인의 책임입니다.
        </SectionCard>

        <SectionCard title="3. 데이터 지연 및 오류 가능성">
          가격, 지수, 종가, 리스크 상태 등 일부 데이터는 지연되거나 일시적으로 제공되지 않을
          수 있습니다. 데이터 상태는 각 종목 페이지와
          <span className="mx-1 font-bold text-ink dark:text-white">debug/market-data</span>
          기준 표시를 통해 확인할 수 있습니다.
        </SectionCard>

        <SectionCard title="4. 현재가 / 최근 종가 구분">
          KIS 현재가를 확인할 수 없는 경우, KRX Insight는 data.go.kr 최근 종가를 참고값으로
          표시할 수 있습니다. 최근 종가는 실시간 현재가가 아닙니다.
        </SectionCard>

        <SectionCard title="5. 리스크 분석 한계">
          리스크 확인, 관망, 관심 등의 상태는 AI 보조 분석 결과이며, 실제 시장 상황과 다를 수
          있습니다.
        </SectionCard>

        <SectionCard title="6. 베타 서비스 고지">
          현재 KRX Insight는 베타 테스트 단계이며, 기능과 데이터 표시 방식은 변경될 수
          있습니다.
        </SectionCard>

        <SectionCard title="7. 최종 문구">
          최종 투자 판단은 반드시 사용자 본인이 독립적으로 결정해야 합니다.
        </SectionCard>

        <section className="rounded-2xl border border-line bg-slate-50/80 p-5 shadow-soft dark:border-dark-line dark:bg-slate-900/50 sm:p-6">
          <p className="text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            더 자세한 플랜 안내는{" "}
            <Link href="/pricing" className="font-bold text-brand hover:underline">
              Pricing
            </Link>
            에서 확인할 수 있습니다.
          </p>
        </section>
      </div>
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
    </main>
  );
}
