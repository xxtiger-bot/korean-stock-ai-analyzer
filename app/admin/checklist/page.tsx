import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "MVP 출시 체크리스트 | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

type ChecklistStatus = "완료" | "확인 필요";

type ChecklistGroup = {
  title: string;
  items: Array<{ label: string; status: ChecklistStatus }>;
};

const checklistGroups: ChecklistGroup[] = [
  {
    title: "A. 기본 페이지",
    items: [
      { label: "홈페이지 /", status: "완료" },
      { label: "종목 상세 /stocks/005930", status: "완료" },
      { label: "포트폴리오 /portfolio", status: "완료" },
      { label: "요금제 /pricing", status: "완료" },
      { label: "내 계정 /mypage", status: "완료" },
      { label: "데이터 진단 /debug/market-data", status: "완료" }
    ]
  },
  {
    title: "B. 인증",
    items: [
      { label: "Email OTP 로그인", status: "완료" },
      { label: "로그아웃", status: "완료" },
      { label: "로그인 후 이메일 표시", status: "완료" },
      { label: "로컬 모드 fallback", status: "완료" }
    ]
  },
  {
    title: "C. 데이터",
    items: [
      { label: "KIS 현재가", status: "확인 필요" },
      { label: "data.go.kr 최근 종가", status: "완료" },
      { label: "가격 출처 표시", status: "완료" },
      { label: "데이터 이상치 보호", status: "완료" }
    ]
  },
  {
    title: "D. 클라우드 동기화",
    items: [
      { label: "portfolio_holdings", status: "완료" },
      { label: "portfolio_alert_rules", status: "완료" },
      { label: "portfolio_reports", status: "완료" },
      { label: "profiles.plan", status: "완료" }
    ]
  },
  {
    title: "E. 법적/공개 페이지",
    items: [
      { label: "/about", status: "완료" },
      { label: "/privacy", status: "완료" },
      { label: "/disclaimer", status: "완료" },
      { label: "/robots.txt", status: "완료" },
      { label: "/sitemap.xml", status: "완료" }
    ]
  }
];

function StatusBadge({ status }: { status: ChecklistStatus }) {
  const done = status === "완료";
  return (
    <span
      className={
        done
          ? "inline-flex shrink-0 items-center rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-xs font-bold tracking-normal text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "inline-flex shrink-0 items-center rounded-md border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-bold tracking-normal text-amber-700 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300"
      }
    >
      {status}
    </span>
  );
}

export default function AdminChecklistPage() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          MVP 출시 체크리스트
        </h1>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
            <p className="text-[11px] font-bold tracking-normal text-slate-500 dark:text-slate-400">
              현재 버전
            </p>
            <p className="mt-1 text-sm font-bold text-ink dark:text-white">MVP</p>
          </div>
          <div className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
            <p className="text-[11px] font-bold tracking-normal text-slate-500 dark:text-slate-400">
              출시 상태
            </p>
            <p className="mt-1 text-sm font-bold text-amber-700 dark:text-amber-300">내부 테스트 중</p>
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-4">
        {checklistGroups.map((group) => (
          <article
            key={group.title}
            className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6"
          >
            <h2 className="text-base font-bold text-ink dark:text-white">{group.title}</h2>
            <ul className="mt-3 space-y-2">
              {group.items.map((item) => (
                <li
                  key={`${group.title}-${item.label}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-line px-3 py-2 dark:border-dark-line"
                >
                  <span className="min-w-0 text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {item.label}
                  </span>
                  <StatusBadge status={item.status} />
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </main>
  );
}
