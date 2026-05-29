"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type ScreenshotGuide = {
  id: string;
  recommendedTitle: string;
  pageUrl: string;
  note: string;
};

const SCREENSHOT_SIZE = "1080 × 1920";

const screenshotGuides: ScreenshotGuide[] = [
  {
    id: "home-brief",
    recommendedTitle: "오늘 시장 브리핑",
    pageUrl: "/",
    note: "시장 방향, 핵심 요약, CTA가 잘 보이도록 촬영하세요."
  },
  {
    id: "stock-analysis",
    recommendedTitle: "AI 종목 분석",
    pageUrl: "/stocks/005930",
    note: "현재가, AI 분석 카드, 기술지표가 함께 보이도록 구성하세요."
  },
  {
    id: "portfolio-risk",
    recommendedTitle: "보유종목 리스크 진단",
    pageUrl: "/portfolio",
    note: "요약 탭에서 리스크 상태와 보유종목 정보가 보이게 촬영하세요."
  },
  {
    id: "mypage-sync",
    recommendedTitle: "클라우드 동기화와 리포트 저장",
    pageUrl: "/mypage",
    note: "내 계정 화면에서 동기화 상태와 저장 데이터 요약을 포함하세요."
  }
];

function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

export function AdminScreenshotKitPageClient() {
  const [copyNotice, setCopyNotice] = useState("");

  const safeGuides = useMemo(
    () => (Array.isArray(screenshotGuides) ? screenshotGuides : []),
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
          Google Play Screenshot Kit
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Google Play 제출용 스크린샷 제작 가이드입니다.
        </p>
        {copyNotice ? (
          <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {copyNotice}
          </p>
        ) : null}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        {safeGuides.map((guide, index) => {
          const pageUrlText = buildAbsoluteUrl(guide.pageUrl);
          return (
            <article
              key={guide.id}
              className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5"
            >
              <p className="text-[11px] font-bold text-brand">추천 스크린샷 {index + 1}</p>
              <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{guide.recommendedTitle}</h2>

              <dl className="mt-3 space-y-2 text-sm font-semibold">
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">페이지 링크</dt>
                  <dd className="mt-1">
                    <Link
                      href={guide.pageUrl}
                      className="break-all text-brand underline-offset-2 hover:underline"
                    >
                      {guide.pageUrl}
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">권장 제목</dt>
                  <dd className="mt-1 text-ink dark:text-white">{guide.recommendedTitle}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">권장 해상도</dt>
                  <dd className="mt-1 text-ink dark:text-white">{SCREENSHOT_SIZE}</dd>
                </div>
                <div>
                  <dt className="text-slate-500 dark:text-slate-400">촬영 주의사항</dt>
                  <dd className="mt-1 text-ink dark:text-white">
                    민감한 개인정보(이메일, 계정 정보, 개인 보유수량 등)는 보이지 않게 정리 후 촬영하세요.
                    <br />
                    {guide.note}
                  </dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => void handleCopy(guide.recommendedTitle)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                >
                  제목 복사
                </button>
                <button
                  type="button"
                  onClick={() => void handleCopy(pageUrlText)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
                >
                  페이지 URL 복사
                </button>
              </div>
            </article>
          );
        })}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">빠른 이동</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          <Link
            href="/admin"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            /admin
          </Link>
          <Link
            href="/admin/store-kit"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            /admin/store-kit
          </Link>
          <Link
            href="/admin/store-assets"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            /admin/store-assets
          </Link>
          <Link
            href="/beta"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
          >
            /beta
          </Link>
        </div>
      </section>
    </main>
  );
}
