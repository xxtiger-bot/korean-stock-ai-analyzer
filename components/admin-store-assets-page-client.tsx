"use client";

import { useState } from "react";

const FEATURE_GRAPHIC_PROMPT =
  "Create a 1024x500 Google Play feature graphic for KRX Insight, a Korean stock AI analysis app. Dark navy fintech style, clean premium layout, app icon on the left, dashboard preview cards on the right, Korean text: \"KRX Insight\" and \"한국 주식 AI 분석과 보유종목 리스크 진단\". Use stock candlestick chart, upward arrow, AI market brief, portfolio risk diagnosis visual elements. Professional, trustworthy, modern, no exaggerated profit claims.";

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

const PRIVACY_URL = "https://korean-stock-ai-analyzer.vercel.app/privacy";
const DISCLAIMER_URL = "https://korean-stock-ai-analyzer.vercel.app/disclaimer";

const APP_ACCESS_INSTRUCTIONS = `App can be tested without login.
Users can search stocks and view beta landing information without signing in.
For cloud sync features, users may sign in with Google or Email OTP.
Kakao login is currently marked as 준비 중 and is not required for review.
This app provides investment reference information only and does not provide buy/sell recommendations or investment advisory services.`;

const DATA_SAFETY_SUMMARY = `수집 데이터
- Email address: 로그인, 계정 관리, 클라우드 동기화
- User ID: 사용자 데이터 구분
- 관심종목 / 보유종목 / 리포트: 기능 제공 및 저장
- Feedback message: 서비스 개선
- Referral code: 초대 보상 처리

공유 정책
- 원칙적으로 제3자 데이터 판매 없음
- Supabase / Google OAuth 등 서비스 제공자 사용 가능

보안
- HTTPS 전송
- 로그인 기반 사용자 데이터 분리
- 삭제 요청 가능
- 광고 추적 없음`;

const screenshotItems = [
  {
    title: "Home / Today Market Brief",
    caption: "오늘 시장 브리핑"
  },
  {
    title: "Stock Detail / AI Analysis",
    caption: "AI 종목 분석"
  },
  {
    title: "Portfolio / Risk Diagnosis",
    caption: "보유종목 리스크 진단"
  },
  {
    title: "My Page / Cloud Sync",
    caption: "클라우드 동기화와 리포트 저장"
  }
];

const assetChecklist = [
  "512×512 icon ready",
  "1024×500 feature graphic ready",
  "4 phone screenshots ready",
  "privacy policy ready",
  "disclaimer ready",
  "data safety draft ready",
  "AAB package ready",
  "internal testing ready"
];

function CopyCard({
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

export function AdminStoreAssetsPageClient() {
  const [notice, setNotice] = useState("");

  const handleCopy = async (text: string) => {
    if (typeof window === "undefined" || !navigator.clipboard) {
      setNotice("복사에 실패했습니다.");
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setNotice("복사되었습니다.");
    } catch {
      setNotice("복사에 실패했습니다.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          Google Play Store Assets
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          KRX Insight Google Play 상주 소재 관리 페이지입니다.
        </p>
        {notice ? (
          <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {notice}
          </p>
        ) : null}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">Feature Graphic 1024×500</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Google Play 상단 프로모션 이미지로 사용할 그래픽입니다.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          <article className="rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            <p className="font-bold text-ink dark:text-white">권장 문구</p>
            <p className="mt-1">KRX Insight</p>
            <p>한국 주식 AI 분석과 보유종목 리스크 진단</p>
          </article>
          <article className="rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            <p className="font-bold text-ink dark:text-white">시각 방향</p>
            <ul className="mt-1 space-y-1">
              <li>- 딥 블루 금융 테크 톤</li>
              <li>- 주식 K선 + 상승 화살표 + AI 분석 느낌</li>
              <li>- 과도한 텍스트 최소화</li>
              <li>- 오늘 시장 브리핑 / AI 분석 / 리스크 진단 강조</li>
            </ul>
          </article>
        </div>
        <div className="mt-3">
          <CopyCard
            title="Feature Graphic 생성 프롬프트"
            content={FEATURE_GRAPHIC_PROMPT}
            onCopy={() => void handleCopy(FEATURE_GRAPHIC_PROMPT)}
          />
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">Phone screenshots 1080×1920</h2>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          실제 서비스 화면을 기준으로 제작하고, 민감한 정보나 관리자 화면은 포함하지 않습니다.
        </p>
        <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
          {Array.isArray(screenshotItems)
            ? screenshotItems.map((item, index) => (
                <article
                  key={`${item.title}-${index}`}
                  className="rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold leading-5 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                >
                  <p className="font-bold text-ink dark:text-white">{index + 1}. {item.title}</p>
                  <p className="mt-1">{item.caption}</p>
                </article>
              ))
            : null}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">App Icon 가이드</h2>
        <ul className="mt-3 space-y-1 text-sm font-semibold text-slate-700 dark:text-slate-200">
          <li>- 512×512 PNG</li>
          <li>- 192×192 PWA icon</li>
          <li>- Maskable icon 포함</li>
          <li>- 딥 블루 금융 테크 스타일</li>
          <li>- 아이콘 내부 텍스트 미포함</li>
        </ul>
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        <CopyCard
          title="Short description"
          content={SHORT_DESCRIPTION}
          onCopy={() => void handleCopy(SHORT_DESCRIPTION)}
        />
        <CopyCard
          title="Full description"
          content={FULL_DESCRIPTION}
          onCopy={() => void handleCopy(FULL_DESCRIPTION)}
        />
        <CopyCard
          title="Privacy URL"
          content={PRIVACY_URL}
          onCopy={() => void handleCopy(PRIVACY_URL)}
        />
        <CopyCard
          title="Disclaimer URL"
          content={DISCLAIMER_URL}
          onCopy={() => void handleCopy(DISCLAIMER_URL)}
        />
        <CopyCard
          title="App Access instructions"
          content={APP_ACCESS_INSTRUCTIONS}
          onCopy={() => void handleCopy(APP_ACCESS_INSTRUCTIONS)}
        />
        <CopyCard
          title="Data Safety summary"
          content={DATA_SAFETY_SUMMARY}
          onCopy={() => void handleCopy(DATA_SAFETY_SUMMARY)}
        />
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">소재 준비 Checklist</h2>
        <ul className="mt-3 grid grid-cols-1 gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200 md:grid-cols-2">
          {Array.isArray(assetChecklist)
            ? assetChecklist.map((item) => (
                <li
                  key={item}
                  className="rounded-md border border-line bg-slate-50 px-3 py-2 dark:border-dark-line dark:bg-slate-900/60"
                >
                  - {item}
                </li>
              ))
            : null}
        </ul>
      </section>
    </main>
  );
}
