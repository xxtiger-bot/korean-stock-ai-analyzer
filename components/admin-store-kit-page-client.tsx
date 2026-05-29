"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type DataSafetyItem = {
  name: string;
  purpose: string;
  required: string;
  deletable: string;
};

const SHORT_DESCRIPTION = "한국 주식 AI 분석과 보유종목 리스크 진단 도구";

const FULL_DESCRIPTION = `KRX Insight는 한국 주식 투자자를 위한 AI 기반 투자 참고 도구입니다.

오늘 시장 브리핑, 종목 AI 분석, 보유종목 리스크 진단, 관심종목 추적, AI 리포트 저장 기능을 제공합니다.

주요 기능:
- 오늘 시장 브리핑
- 한국 주식 종목 검색
- AI 종목 분석
- 보유종목 리스크 진단
- 관심종목 클라우드 동기화
- AI 리포트 저장
- 피드백 제출

본 서비스는 투자 참고 정보 제공을 목적으로 하며, 매수/매도 추천이나 투자 자문을 제공하지 않습니다.
모든 투자 판단과 책임은 사용자 본인에게 있습니다.`;

const APP_ACCESS_EN = `App can be tested without login.
Users can search stocks and view beta landing information without signing in.
For cloud sync features, users may sign in with Google or Email OTP.
Kakao login is currently marked as 준비 중 and is not required for review.
This app provides investment reference information only and does not provide buy/sell recommendations or investment advisory services.`;

const APP_ACCESS_KO = `앱은 로그인 없이도 기본 기능을 테스트할 수 있습니다.
사용자는 종목 검색과 베타 페이지를 로그인 없이 확인할 수 있습니다.
클라우드 동기화 기능은 Google 로그인 또는 Email OTP 로그인 후 사용할 수 있습니다.
Kakao 로그인은 현재 준비 중이며 심사에 필수 기능이 아닙니다.
이 앱은 투자 참고 정보만 제공하며, 매수/매도 추천이나 투자 자문을 제공하지 않습니다.`;

const DATA_SAFETY_SUMMARY = `수집 데이터: Email address, User ID, 관심종목/보유종목/리포트 데이터, Feedback message, Referral code
공유 정책: 데이터 판매 없음, Supabase/Google OAuth 등 서비스 제공자 사용 가능
보안 정책: HTTPS 전송, 로그인 기반 사용자 데이터 분리, 삭제 요청 지원, 광고 추적 없음`;

const dataSafetyItems: DataSafetyItem[] = [
  {
    name: "Email address",
    purpose: "로그인, 계정 관리, 클라우드 동기화",
    required: "로그인 기능 사용 시",
    deletable: "가능"
  },
  {
    name: "User ID",
    purpose: "사용자 데이터 구분",
    required: "로그인 기능 사용 시",
    deletable: "가능"
  },
  {
    name: "관심종목 / 보유종목 / 리포트 데이터",
    purpose: "관심종목 관리, 보유종목 진단, 리포트 저장",
    required: "클라우드 동기화 사용 시",
    deletable: "가능"
  },
  {
    name: "Feedback message",
    purpose: "서비스 개선",
    required: "피드백 제출 시",
    deletable: "가능"
  },
  {
    name: "Referral code",
    purpose: "초대 보상 처리",
    required: "초대 기능 사용 시",
    deletable: "가능"
  }
];

function CopyArea({
  title,
  content,
  onCopy
}: {
  title: string;
  content: string;
  onCopy: () => void;
}) {
  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-sm font-bold text-ink dark:text-white">{title}</h3>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
        >
          복사
        </button>
      </div>
      <pre className="mt-3 whitespace-pre-wrap rounded-md border border-line bg-slate-50 px-3 py-3 text-xs font-semibold leading-6 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
        {content}
      </pre>
    </article>
  );
}

export function AdminStoreKitPageClient() {
  const [copyNotice, setCopyNotice] = useState("");

  const quickLinks = useMemo(
    () =>
      [
        { href: "/beta", label: "/beta" },
        { href: "/admin", label: "/admin" },
        { href: "/admin/feedback", label: "/admin/feedback" },
        { href: "/pricing", label: "/pricing" },
        { href: "/admin/checklist", label: "/admin/checklist" }
      ].filter((item) => item.href && item.label),
    []
  );

  const handleCopy = async (text: string) => {
    if (typeof window === "undefined" || !navigator.clipboard) {
      setCopyNotice("복사에 실패했습니다.");
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      setCopyNotice("복사되었습니다.");
    } catch {
      setCopyNotice("복사에 실패했습니다.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          Google Play Store Kit
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          KRX Insight Google Play 상주 자료와 체크리스트입니다.
        </p>
        {copyNotice ? (
          <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {copyNotice}
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">App 기본 정보</h2>
        <ul className="mt-3 grid gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 sm:grid-cols-2">
          <li>App name: KRX Insight</li>
          <li>Default language: Korean</li>
          <li>Category: Finance</li>
          <li>App type: App</li>
          <li>Price: Free</li>
          <li>Package name suggestion: com.krxinsight.app</li>
          <li>Website: https://korean-stock-ai-analyzer.vercel.app</li>
          <li>Privacy Policy: https://korean-stock-ai-analyzer.vercel.app/privacy</li>
          <li>Disclaimer: https://korean-stock-ai-analyzer.vercel.app/disclaimer</li>
          <li>Contact email: fengyuanxin67@gmail.com</li>
        </ul>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CopyArea
          title="Google Play Short Description"
          content={SHORT_DESCRIPTION}
          onCopy={() => void handleCopy(SHORT_DESCRIPTION)}
        />
        <CopyArea
          title="Google Play Full Description"
          content={FULL_DESCRIPTION}
          onCopy={() => void handleCopy(FULL_DESCRIPTION)}
        />
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-base font-bold text-ink dark:text-white">Data Safety 초안</h2>
          <button
            type="button"
            onClick={() => void handleCopy(DATA_SAFETY_SUMMARY)}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            복사
          </button>
        </div>
        <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
          {dataSafetyItems.map((item) => (
            <article
              key={item.name}
              className="rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              <p className="font-bold text-ink dark:text-white">{item.name}</p>
              <p className="mt-1">목적: {item.purpose}</p>
              <p className="mt-1">필수 여부: {item.required}</p>
              <p className="mt-1">삭제 가능 여부: {item.deletable}</p>
            </article>
          ))}
        </div>
        <ul className="mt-3 space-y-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
          <li>- 원칙적으로 제3자 판매 없음</li>
          <li>- 인증과 데이터 저장을 위해 Supabase / Google OAuth 등 서비스 제공자 사용 가능</li>
          <li>- HTTPS 전송, 로그인 기반 사용자 데이터 분리, 삭제 요청 지원</li>
          <li>- 현재 광고 추적 없음</li>
          <li>
            - 이 내용은 법률 자문이 아니며, 최종 제출 전 실제 구현과 Privacy Policy 내용이 일치하는지
            확인해야 합니다.
          </li>
        </ul>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CopyArea
          title="App Access Instructions (English)"
          content={APP_ACCESS_EN}
          onCopy={() => void handleCopy(APP_ACCESS_EN)}
        />
        <CopyArea
          title="App Access Instructions (한국어)"
          content={APP_ACCESS_KO}
          onCopy={() => void handleCopy(APP_ACCESS_KO)}
        />
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">Screenshot Checklist</h2>
        <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <li>- Home / Today Market Brief</li>
          <li>- Stock Detail / AI Analysis</li>
          <li>- Portfolio / Holding Risk Diagnosis</li>
          <li>- Beta Test Page</li>
          <li>- My Page / Cloud Sync Status</li>
        </ul>
        <div className="mt-3 grid grid-cols-1 gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 sm:grid-cols-3">
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
            Phone screenshots: 1080 × 1920
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
            Feature Graphic: 1024 × 500
          </p>
          <p className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60">
            App Icon: 512 × 512 PNG
          </p>
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">PWABuilder / TWA Checklist</h2>
        <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <li>- manifest.webmanifest 200</li>
          <li>- sw.js 200</li>
          <li>- icon-192.png 200</li>
          <li>- icon-512.png 200</li>
          <li>- display standalone</li>
          <li>- start_url 정상</li>
          <li>- HTTPS 정상</li>
          <li>- no screenshots 404</li>
          <li>- Android AAB generated</li>
          <li>- target SDK/API Google Play 현재 요구사항 충족</li>
          <li>- package name 고정 후 릴리즈</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">Release Checklist</h2>
        <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <li>- Privacy Policy URL 접근 가능</li>
          <li>- Disclaimer URL 접근 가능</li>
          <li>- Data Safety와 Privacy 내용 일치</li>
          <li>- Content Rating 완료</li>
          <li>- App Access 작성</li>
          <li>- Store Listing 작성 완료</li>
          <li>- AAB 업로드</li>
          <li>- Internal testing 완료</li>
          <li>- Closed testing 완료</li>
          <li>- Production release 심사 제출</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-4 shadow-soft dark:border-rose-900/50 dark:bg-rose-950/30 sm:p-5">
        <h2 className="text-base font-bold text-rose-700 dark:text-rose-200">출시 전 리스크 안내</h2>
        <ul className="mt-3 space-y-1 text-sm font-semibold text-rose-700 dark:text-rose-200">
          <li>- 수익 보장 표현 금지</li>
          <li>- 매수 추천 / 매도 추천 문구 금지</li>
          <li>- 급등 보장 문구 금지</li>
          <li>- Data Safety와 Privacy Policy 내용 일치 유지</li>
          <li>- AI 분석은 참고 정보임을 명시</li>
          <li>- 최종 투자 판단과 책임은 사용자 본인에게 있음을 고지</li>
        </ul>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">빠른 이동</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          {quickLinks.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}

