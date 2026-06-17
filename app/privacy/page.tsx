import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보 처리방침 | KRX Insight",
  description: "KRX Insight 개인정보 처리방침"
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

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="space-y-5 sm:space-y-6">
        <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">Privacy Policy</p>
          <h1 className="mt-2 text-3xl font-bold tracking-normal text-ink dark:text-white sm:text-4xl">
            개인정보 처리방침
          </h1>
          <p className="mt-3 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
            KRX Insight는 베타 서비스 운영에 필요한 범위에서만 데이터를 다루며, 사용자가
            어떤 기능을 쓰는지에 따라 저장 방식이 달라질 수 있습니다.
          </p>
        </section>

        <SectionCard title="1. 어떤 데이터를 다루나요?">
          <ul className="list-disc space-y-1 pl-5">
            <li>로그인 시 이메일 주소, 계정 식별 정보</li>
            <li>관심종목, 보유종목, 저장된 리포트 등 사용자가 직접 만든 데이터</li>
            <li>베타 피드백에 입력한 의견과 선택한 이메일 주소</li>
            <li>기기 내 localStorage에 저장되는 로컬 보유종목 데이터</li>
          </ul>
        </SectionCard>

        <SectionCard title="2. 피드백 이메일은 어떻게 사용하나요?">
          <p>
            사용자가 이메일을 남기는 경우, 베타 피드백 확인이나 후속 답변이 필요할 때만 참고합니다.
            마케팅 메일 발송이나 제3자 판매 목적으로 사용하지 않습니다.
          </p>
        </SectionCard>

        <SectionCard title="3. 로컬 보유종목 데이터는 어떻게 저장되나요?">
          <p>
            로그인하지 않은 상태에서 입력한 보유종목은 기본적으로 현재 브라우저의
            localStorage에만 저장됩니다. 이 데이터는 사용자가 브라우저 데이터를 삭제하거나 다른
            기기에서 접속하면 자동으로 동기화되지 않을 수 있습니다.
          </p>
        </SectionCard>

        <SectionCard title="4. 어떤 제3자 서비스를 사용하나요?">
          <ul className="list-disc space-y-1 pl-5">
            <li>Supabase: 로그인, 사용자 데이터 저장, 향후 동기화 기능</li>
            <li>Vercel: 웹 서비스 호스팅과 배포</li>
            <li>KIS: 현재가 및 시세 확인</li>
            <li>data.go.kr: 최근 종가 및 일부 시장 데이터 참고</li>
            <li>Naver News 검색 외부 링크: 샘플 뉴스에서 관련 기사 검색 결과 이동</li>
          </ul>
        </SectionCard>

        <SectionCard title="5. 사용자 데이터를 판매하나요?">
          <p>
            KRX Insight는 사용자 개인정보와 사용 데이터를 판매하지 않습니다. 서비스 제공과 안정성
            유지에 필요한 범위 안에서만 처리합니다.
          </p>
        </SectionCard>

        <SectionCard title="6. 문의 및 삭제 요청">
          <p>
            개인정보 관련 문의, 데이터 삭제 요청, 베타 서비스 문의는 아래 연락처로 남겨주세요.
          </p>
          <p className="mt-2 font-bold text-ink dark:text-white">
            연락처: support@krxinsight.app (placeholder)
          </p>
        </SectionCard>

        <SectionCard title="7. 마지막 업데이트">
          <p>2026-06-18</p>
        </SectionCard>
      </div>
    </main>
  );
}
