"use client";

import Link from "next/link";
import { useState } from "react";

type BetaKitSection = {
  id: "short-invite" | "long-intro" | "test-checklist" | "feedback-request";
  title: string;
  content: string;
};

const BETA_KIT_SECTIONS: BetaKitSection[] = [
  {
    id: "short-invite",
    title: "A. 짧은 초대 문구",
    content: `KRX Insight 베타 테스트를 시작했습니다.
한국 주식 AI 분석, 오늘 시장 브리핑, 보유종목 리스크 진단을 테스트해볼 수 있습니다.
무료로 사용해보고 불편한 점을 피드백으로 남겨주세요.
링크: https://korean-stock-ai-analyzer.vercel.app/beta`
  },
  {
    id: "long-intro",
    title: "B. 긴 소개 문구",
    content: `KRX Insight는 한국 주식 현재가, AI 종목 분석, 보유종목 진단, 리스크 변화 추적, 오늘 시장 브리핑을 제공하는 투자 참고 도구입니다.
현재 MVP 베타 테스트 중이며, 매수/매도 추천 서비스가 아니라 투자 참고 정보 서비스입니다.`
  },
  {
    id: "test-checklist",
    title: "C. 테스트 요청 체크리스트",
    content: `1. 종목 검색
2. AI 분석 확인
3. 관심종목 추가
4. 보유종목 추가
5. 리스크 변화 확인
6. 피드백 제출`
  },
  {
    id: "feedback-request",
    title: "D. 피드백 요청 문구",
    content:
      "사용하면서 불편했던 점, 이해하기 어려운 부분, 추가되면 좋은 기능을 알려주세요."
  }
];

const QUICK_LINKS: Array<{ href: string; label: string }> = [
  { href: "/beta", label: "/beta" },
  { href: "/admin", label: "/admin" },
  { href: "/admin/feedback", label: "/admin/feedback" },
  { href: "/pricing", label: "/pricing" },
  { href: "/admin/checklist", label: "/admin/checklist" }
];

async function writeToClipboard(text: string) {
  if (typeof window === "undefined") return false;
  if (!text.trim()) return false;
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function AdminBetaKitPageClient() {
  const [notice, setNotice] = useState("");

  async function handleCopy(content: string) {
    const copied = await writeToClipboard(content);
    setNotice(copied ? "복사되었습니다." : "복사에 실패했습니다.");
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          Beta 테스트 운영 키트
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          초대 문구, 테스트 안내, 피드백 요청 문구를 빠르게 복사해 운영에 활용할 수 있습니다.
        </p>
        {notice ? (
          <p className="mt-3 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
            {notice}
          </p>
        ) : null}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4">
        {BETA_KIT_SECTIONS.map((section) => (
          <article
            key={section.id}
            className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-base font-bold text-ink dark:text-white">{section.title}</h2>
              <button
                type="button"
                onClick={() => void handleCopy(section.content)}
                className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-slate-50 px-3 text-xs font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200"
              >
                복사
              </button>
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-md border border-line bg-slate-50 px-3 py-3 text-xs font-semibold leading-6 text-slate-700 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
              {section.content}
            </pre>
          </article>
        ))}
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-base font-bold text-ink dark:text-white">빠른 링크</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          {QUICK_LINKS.map((item) => (
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
