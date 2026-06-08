<<<<<<< HEAD
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
=======
import type { ReactNode } from "react";

function PrivacyHeaderCard() {
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
      <p className="text-xs font-bold uppercase tracking-normal text-brand">KRX Insight</p>
      <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
        개인정보 처리방침
      </h1>
      <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300 sm:text-base">
        KRX Insight 서비스 이용 시 개인정보 처리에 관한 안내
      </p>
      <div className="mt-4 space-y-1 text-xs font-medium leading-5 text-slate-500 dark:text-slate-400 sm:text-sm">
        <p>KRX Insight는 기본적으로 로컬 모드를 우선 사용합니다.</p>
        <p>클라우드 동기화 기능은 로그인 후 선택적으로 활성화됩니다.</p>
      </div>
    </section>
  );
}

type PolicySectionCardProps = {
  index: number;
  title: string;
  children: ReactNode;
};

function PolicySectionCard({ index, title, children }: PolicySectionCardProps) {
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
      <h2 className="text-lg font-bold tracking-normal text-ink dark:text-white">
        {index}. {title}
      </h2>
      <div className="mt-3 space-y-3 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
        {children}
      </div>
    </section>
  );
}

function PrivacyFooterNotice() {
  return (
    <section className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
      <h2 className="text-lg font-bold tracking-normal text-ink dark:text-white">
        10. 하단 고지
      </h2>
      <div className="mt-3 space-y-2 text-sm font-medium leading-6 text-slate-700 dark:text-slate-300">
        <p>
          <span className="font-bold text-ink dark:text-white">최종 업데이트:</span> 2026-05-25
        </p>
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 dark:bg-slate-900/60 dark:text-slate-300 sm:text-sm">
          본 서비스는 투자 참고 정보 제공을 위한 도구이며, 매수/매도 추천 또는 투자 자문
          서비스가 아닙니다. 투자 결정과 그에 따른 책임은 이용자 본인에게 있습니다.
        </p>
      </div>
    </section>
  );
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <div className="space-y-4 sm:space-y-5">
        <PrivacyHeaderCard />

        <PolicySectionCard index={1} title="서문">
          <p>
            KRX Insight(이하 "서비스")는 이용자의 개인정보를 중요하게 생각하며, 관련 법령을
            준수합니다. 본 처리방침은 서비스 이용 과정에서 어떤 정보를 어떻게 처리하는지
            안내하기 위해 작성되었습니다.
          </p>
          <p>
            본 서비스는 주식 투자 참고 정보를 제공하는 도구로, 금융거래 실행 기능(계좌 개설,
            주문 실행 등)을 제공하지 않습니다.
          </p>
        </PolicySectionCard>

        <PolicySectionCard index={2} title="수집하는 개인정보 항목 및 수집 방법">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <span className="font-bold text-ink dark:text-white">로컬 모드(비로그인):</span>{" "}
              관심종목, 보유종목, 알림 조건, 리포트 설정 등은 브라우저 localStorage에 저장됩니다.
            </li>
            <li>
              <span className="font-bold text-ink dark:text-white">
                로그인/클라우드 동기화 사용 시:
              </span>{" "}
              이메일, 동기화 대상 데이터(보유종목/알림 조건/리포트/관심종목 등)를 처리할 수 있습니다.
            </li>
            <li>
              <span className="font-bold text-ink dark:text-white">자동 수집 정보:</span> 서비스
              안정성 및 보안 점검을 위한 접속/오류 로그, 기기·브라우저 정보가 포함될 수 있습니다.
            </li>
            <li>
              <span className="font-bold text-ink dark:text-white">미수집 정보:</span> 주민등록번호,
              계좌번호, 카드번호 등 민감 금융정보는 수집하지 않습니다.
            </li>
          </ul>
        </PolicySectionCard>

        <PolicySectionCard index={3} title="개인정보의 이용 목적">
          <ul className="list-disc space-y-2 pl-5">
            <li>로그인 인증 및 사용자 식별</li>
            <li>클라우드 동기화, 리포트 저장 등 선택 기능 제공</li>
            <li>서비스 품질 개선, 장애 대응, 보안 모니터링</li>
            <li>이용자 문의 대응 및 공지 전달</li>
          </ul>
        </PolicySectionCard>

        <PolicySectionCard index={4} title="개인정보의 보관 기간 및 파기 절차">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              로컬 모드 데이터는 이용자 기기에 저장되며, 이용자가 브라우저 데이터 삭제를 통해
              직접 제거할 수 있습니다.
            </li>
            <li>
              클라우드 동기화 데이터는 계정 이용 기간 동안 보관되며, 삭제 요청 또는 계정 정리
              절차에 따라 파기됩니다.
            </li>
            <li>
              법령에 보관 의무가 있는 경우 해당 기간 동안만 보관 후 지체 없이 파기합니다.
            </li>
          </ul>
        </PolicySectionCard>

        <PolicySectionCard index={5} title="개인정보의 제3자 제공 여부">
          <p>
            서비스는 이용자의 개인정보를 원칙적으로 제3자에게 판매하거나 임의 제공하지 않습니다.
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>이용자의 사전 동의가 있는 경우</li>
            <li>법령에 따른 제출 의무가 있는 경우</li>
            <li>서비스 운영을 위한 필수 위탁(인증·호스팅 등)이 필요한 경우</li>
          </ul>
        </PolicySectionCard>

        <PolicySectionCard index={6} title="개인정보의 안전성 확보 조치">
          <ul className="list-disc space-y-2 pl-5">
            <li>접근 권한 최소화 및 관리적 통제</li>
            <li>전송 구간 보호(HTTPS) 및 인증 절차 적용</li>
            <li>오류/보안 이벤트 모니터링 및 점검</li>
            <li>정기적인 보안 업데이트 및 운영 정책 개선</li>
          </ul>
        </PolicySectionCard>

        <PolicySectionCard index={7} title="이용자의 권리와 행사 방법">
          <ul className="list-disc space-y-2 pl-5">
            <li>이용자는 개인정보 조회, 정정, 삭제를 요청할 수 있습니다.</li>
            <li>클라우드 동기화 해제 및 로컬 모드 전환이 가능합니다.</li>
            <li>로컬 저장 데이터는 이용자 브라우저에서 직접 삭제할 수 있습니다.</li>
            <li>요청 시 본인 확인 절차 후 관련 법령에 따라 처리합니다.</li>
          </ul>
        </PolicySectionCard>

        <PolicySectionCard index={8} title="문의처 및 개인정보 보호 책임자">
          <ul className="list-disc space-y-2 pl-5">
            <li>개인정보 보호 책임자: KRX Insight 운영팀</li>
            <li>문의 채널: 앱 내 피드백 기능 또는 운영팀 문의 메일</li>
            <li>문의 메일: support@krxinsight.app</li>
          </ul>
        </PolicySectionCard>

        <PolicySectionCard index={9} title="개인정보 처리방침의 변경">
          <p>
            본 방침은 관련 법령, 서비스 기능, 운영 정책 변경에 따라 수정될 수 있습니다. 중요한
            변경 사항은 서비스 내 공지 또는 별도 안내를 통해 고지합니다.
          </p>
          <p>
            개정 시 시행일자를 함께 표기하며, 변경된 방침은 공지 후 적용됩니다.
          </p>
        </PolicySectionCard>

        <PrivacyFooterNotice />
      </div>
>>>>>>> fc02111 (Upgrade KRX Insight beta experience)
    </main>
  );
}
