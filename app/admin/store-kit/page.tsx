import type { Metadata } from "next";
import Link from "next/link";
import { AdminAccessGuard } from "@/components/admin-access-guard";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata: Metadata = {
  title: "Google Play Store Kit | KRX Insight",
  robots: {
    index: false,
    follow: false
  }
};

type DataSafetyRow = {
  dataType: string;
  collected: string;
  shared: string;
  purpose: string;
  required: string;
  deletable: string;
};

const dataSafetyRows: DataSafetyRow[] = [
  {
    dataType: "Email address",
    collected: "예",
    shared: "아니오",
    purpose: "로그인, 계정 식별, 문의 응답",
    required: "로그인 기능 사용 시",
    deletable: "예"
  },
  {
    dataType: "User IDs / Account ID",
    collected: "예",
    shared: "아니오",
    purpose: "동기화 데이터 매핑",
    required: "로그인 기능 사용 시",
    deletable: "예"
  },
  {
    dataType: "User-provided stock watchlist",
    collected: "예",
    shared: "아니오",
    purpose: "관심종목 동기화",
    required: "클라우드 동기화 사용 시",
    deletable: "예"
  },
  {
    dataType: "User-provided portfolio holdings",
    collected: "예",
    shared: "아니오",
    purpose: "보유종목 진단, 동기화",
    required: "클라우드 동기화 사용 시",
    deletable: "예"
  },
  {
    dataType: "Saved AI reports",
    collected: "예",
    shared: "아니오",
    purpose: "리포트 저장 및 조회",
    required: "리포트 저장 기능 사용 시",
    deletable: "예"
  },
  {
    dataType: "Feedback messages",
    collected: "예",
    shared: "아니오",
    purpose: "서비스 개선, 사용자 의견 반영",
    required: "피드백 제출 시",
    deletable: "예"
  },
  {
    dataType: "Referral code",
    collected: "예",
    shared: "아니오",
    purpose: "초대 리워드 처리",
    required: "초대 기능 사용 시",
    deletable: "예"
  }
];

export default function AdminStoreKitPage() {
  return (
    <AdminAccessGuard>
      <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
          <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
          <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
            Google Play Store Kit
          </h1>
          <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            Google Play 등록 준비를 위한 앱 소개/정책/검수 자료를 한 곳에서 확인합니다.
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">기본 앱 정보</h2>
          <ul className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:grid-cols-2">
            <li>App name: KRX Insight</li>
            <li>Short name: KRX Insight</li>
            <li>Default language: Korean</li>
            <li>Category: Finance</li>
            <li>App type: App</li>
            <li>Price: Free</li>
            <li>Contact email: fengyuanxin67@gmail.com</li>
            <li>Website: https://korean-stock-ai-analyzer.vercel.app</li>
            <li>Privacy policy URL: https://korean-stock-ai-analyzer.vercel.app/privacy</li>
            <li>Disclaimer URL: https://korean-stock-ai-analyzer.vercel.app/disclaimer</li>
          </ul>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">Google Play Short Description</h2>
          <p className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            한국 주식 AI 분석과 보유종목 리스크 진단 도구
          </p>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">Google Play Full Description</h2>
          <div className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-3 text-sm font-semibold leading-6 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            <p>
              KRX Insight는 한국 주식 시장을 더 체계적으로 점검할 수 있도록 돕는 AI 분석 보조
              도구입니다.
            </p>
            <p className="mt-2">주요 기능</p>
            <ul className="mt-1 space-y-1">
              <li>- 오늘 시장 브리핑</li>
              <li>- AI 종목 분석</li>
              <li>- 보유종목 리스크 진단</li>
              <li>- 관심종목 관리 및 동기화</li>
              <li>- AI 리포트 저장</li>
            </ul>
            <p className="mt-2">
              현재 KRX Insight는 Beta 테스트 단계이며, 일부 기능 및 데이터 표시는 업데이트 과정에서
              변경될 수 있습니다.
            </p>
            <p className="mt-2">
              본 서비스는 투자 참고 정보 제공 목적이며 매수/매도 추천 서비스가 아닙니다. 외부 데이터
              특성상 시세나 지표는 지연되거나 확인이 필요할 수 있습니다.
            </p>
          </div>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">Data Safety 초안</h2>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-[860px] w-full border-collapse text-xs font-semibold text-slate-700 dark:text-slate-200">
              <thead>
                <tr className="bg-slate-100 dark:bg-slate-800/70">
                  <th className="border border-line px-2 py-2 text-left dark:border-dark-line">데이터 유형</th>
                  <th className="border border-line px-2 py-2 text-left dark:border-dark-line">수집</th>
                  <th className="border border-line px-2 py-2 text-left dark:border-dark-line">공유</th>
                  <th className="border border-line px-2 py-2 text-left dark:border-dark-line">용도</th>
                  <th className="border border-line px-2 py-2 text-left dark:border-dark-line">필수 여부</th>
                  <th className="border border-line px-2 py-2 text-left dark:border-dark-line">삭제 가능</th>
                </tr>
              </thead>
              <tbody>
                {dataSafetyRows.map((row) => (
                  <tr key={row.dataType} className="align-top">
                    <td className="border border-line px-2 py-2 dark:border-dark-line">{row.dataType}</td>
                    <td className="border border-line px-2 py-2 dark:border-dark-line">{row.collected}</td>
                    <td className="border border-line px-2 py-2 dark:border-dark-line">{row.shared}</td>
                    <td className="border border-line px-2 py-2 dark:border-dark-line">{row.purpose}</td>
                    <td className="border border-line px-2 py-2 dark:border-dark-line">{row.required}</td>
                    <td className="border border-line px-2 py-2 dark:border-dark-line">{row.deletable}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <ul className="mt-3 space-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <li>- 사용자 데이터는 판매하지 않습니다.</li>
            <li>- 제3자 광고 목적으로 사용하지 않습니다.</li>
            <li>- HTTPS 기반 전송을 사용합니다.</li>
            <li>- 사용자 요청 시 데이터 삭제를 지원합니다.</li>
          </ul>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">App Access Instructions</h2>
          <ul className="mt-3 space-y-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
            <li>- Most features can be tested without login.</li>
            <li>- Cloud sync features require login.</li>
            <li>- Login supports Google and Email OTP.</li>
            <li>- Kakao login is currently marked as 준비 중.</li>
            <li>- The app does not provide buy/sell recommendations.</li>
            <li>- The app is for investment reference only.</li>
          </ul>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">Screenshot Checklist</h2>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <li>- Home / 오늘 시장 브리핑</li>
            <li>- Stock detail / AI 분석</li>
            <li>- Portfolio / 보유종목 리스크 진단</li>
            <li>- Beta page / 5분 테스트 미션</li>
            <li>- My page / cloud sync status</li>
            <li>- PWA install guide</li>
          </ul>
          <ul className="mt-3 space-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <li>- Phone screenshots: 1080 x 1920</li>
            <li>- Feature graphic: 1024 x 500</li>
            <li>- App icon: 512 x 512</li>
          </ul>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">AAB / TWA Packaging Checklist</h2>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <li>- Use PWABuilder or Bubblewrap</li>
            <li>- Start URL: https://korean-stock-ai-analyzer.vercel.app</li>
            <li>- Package ID proposal: com.krxinsight.app</li>
            <li>- App name: KRX Insight</li>
            <li>- Display mode: standalone</li>
            <li>- Orientation: portrait</li>
            <li>- Target SDK must satisfy Google Play current requirement</li>
            <li>- Upload AAB to Internal Testing first</li>
          </ul>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">Release Checklist</h2>
          <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <li>- Google Play Developer account ready</li>
            <li>- App signing enabled</li>
            <li>- Data Safety completed</li>
            <li>- Content rating completed</li>
            <li>- Privacy policy URL added</li>
            <li>- Internal testing completed</li>
            <li>- Closed testing if required</li>
            <li>- Production release review</li>
          </ul>
        </section>

        <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">빠른 이동</h2>
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Link
              href="/beta"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              /beta
            </Link>
            <Link
              href="/admin"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              /admin
            </Link>
            <Link
              href="/admin/feedback"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              /admin/feedback
            </Link>
            <Link
              href="/pricing"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              /pricing
            </Link>
            <Link
              href="/admin/checklist"
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              /admin/checklist
            </Link>
          </div>
        </section>
      </main>
    </AdminAccessGuard>
  );
}
