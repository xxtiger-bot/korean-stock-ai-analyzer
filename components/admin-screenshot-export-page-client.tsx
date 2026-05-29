"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type ScreenshotTemplate = {
  id: string;
  title: string;
  summary: string;
  screenshotPath: string | null;
  sourceUrl: string;
  recommendedFilename: string;
};

const TEMPLATE_SIZE = "1080 × 1920";

const screenshotTemplates: ScreenshotTemplate[] = [
  {
    id: "market-brief",
    title: "오늘 시장 브리핑",
    summary: "지수 흐름과 오늘 먼저 확인할 종목을 한 장으로 보여주는 대표 화면입니다.",
    screenshotPath: "/screenshots/home-1080x1920.png",
    sourceUrl: "/",
    recommendedFilename: "screenshot-01-market-brief.png"
  },
  {
    id: "ai-analysis",
    title: "AI 종목 분석",
    summary: "종목 상세에서 AI 분석 카드와 기술 지표를 함께 보여주는 화면입니다.",
    screenshotPath: "/screenshots/stock-1080x1920.png",
    sourceUrl: "/stocks/005930",
    recommendedFilename: "screenshot-02-ai-analysis.png"
  },
  {
    id: "portfolio-risk",
    title: "보유종목 리스크 진단",
    summary: "포트폴리오 요약과 리스크 알림을 중심으로 구성한 핵심 화면입니다.",
    screenshotPath: "/screenshots/portfolio-1080x1920.png",
    sourceUrl: "/portfolio",
    recommendedFilename: "screenshot-03-portfolio-risk.png"
  },
  {
    id: "report-save",
    title: "AI 리포트 저장",
    summary: "일일 리포트 복사/저장/이미지 저장 흐름을 강조한 화면 구성입니다.",
    screenshotPath: null,
    sourceUrl: "/portfolio#reports",
    recommendedFilename: "screenshot-04-report-save.png"
  },
  {
    id: "cloud-sync",
    title: "클라우드 동기화",
    summary: "계정 화면에서 동기화 상태와 저장 데이터를 확인하는 화면입니다.",
    screenshotPath: null,
    sourceUrl: "/mypage",
    recommendedFilename: "screenshot-05-cloud-sync.png"
  }
];

function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function ScreenshotMock({ title, summary }: { title: string; summary: string }) {
  return (
    <div className="flex h-full w-full flex-col rounded-[22px] border border-blue-200/40 bg-gradient-to-b from-[#0b1c4a] via-[#0b1a3f] to-[#070f27] p-5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)] dark:border-blue-700/40">
      <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2">
        <span className="text-[11px] font-bold text-blue-200">KRX Insight</span>
        <span className="rounded-full border border-blue-300/40 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-100">
          Preview
        </span>
      </div>
      <h3 className="mt-4 text-lg font-bold leading-tight">{title}</h3>
      <p className="mt-2 text-xs font-semibold leading-5 text-slate-300">{summary}</p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <p className="text-[10px] font-bold text-slate-300">KOSPI</p>
          <p className="mt-1 text-sm font-bold text-emerald-300">+0.42%</p>
        </div>
        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
          <p className="text-[10px] font-bold text-slate-300">KOSDAQ</p>
          <p className="mt-1 text-sm font-bold text-emerald-300">+0.78%</p>
        </div>
      </div>
      <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-2">
        <div className="h-1.5 overflow-hidden rounded-full bg-slate-800">
          <div className="h-full w-2/3 rounded-full bg-blue-400" />
        </div>
        <p className="mt-2 text-[10px] font-semibold text-slate-300">스크린샷을 업로드하면 실제 화면으로 교체됩니다.</p>
      </div>
      <div className="mt-auto text-[10px] font-bold text-blue-200/80">KRX Insight • 1080×1920</div>
    </div>
  );
}

function TemplateCard({
  template,
  uploadedScreenshot,
  onSelectFile,
  onCopy
}: {
  template: ScreenshotTemplate;
  uploadedScreenshot: string | null;
  onSelectFile: (templateId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCopy: (text: string) => Promise<void>;
}) {
  const hasStaticImage = typeof template.screenshotPath === "string" && template.screenshotPath.length > 0;
  const safeSourceUrl = buildAbsoluteUrl(template.sourceUrl);

  return (
    <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-normal text-brand">Template</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{template.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{template.summary}</p>
        </div>
        <span className="rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-400">
          {TEMPLATE_SIZE}
        </span>
      </div>

      <div className="mt-4 overflow-hidden rounded-xl border border-line bg-slate-50 p-3 shadow-sm dark:border-dark-line dark:bg-slate-900/60">
        <div className="mx-auto w-full max-w-[320px]">
          <div className="relative aspect-[9/16] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-[0_14px_30px_rgba(15,23,42,0.15)] dark:border-slate-700 dark:bg-slate-950">
            {uploadedScreenshot ? (
              <img
                src={uploadedScreenshot}
                alt={`${template.title} 업로드 스크린샷`}
                className="h-full w-full object-cover"
              />
            ) : hasStaticImage ? (
              <Image
                src={template.screenshotPath as string}
                alt={`${template.title} 샘플 스크린샷`}
                fill
                className="object-cover"
                sizes="(max-width: 640px) 85vw, 320px"
              />
            ) : (
              <ScreenshotMock title={template.title} summary={template.summary} />
            )}
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-950/40 to-transparent px-4 py-3">
              <p className="text-sm font-bold text-white">{template.title}</p>
              <p className="mt-0.5 text-[11px] font-semibold text-slate-200">KRX Insight</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
          스크린샷 업로드/교체
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => onSelectFile(template.id, event)}
          />
        </label>
        <Link
          href={template.sourceUrl}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
        >
          페이지 열기
        </Link>
      </div>

      <div className="mt-3 space-y-2 rounded-md border border-line bg-slate-50 px-3 py-3 text-xs font-semibold dark:border-dark-line dark:bg-slate-900/60">
        <p className="text-slate-600 dark:text-slate-300">PNG 저장 안내: 미리보기 영역을 1080×1920 비율로 캡처해 저장하세요.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-bold text-slate-700 dark:border-dark-line dark:bg-slate-950 dark:text-slate-200">
            권장 파일명: {template.recommendedFilename}
          </span>
          <button
            type="button"
            onClick={() => void onCopy(template.recommendedFilename)}
            className="inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          >
            파일명 복사
          </button>
          <button
            type="button"
            onClick={() => void onCopy(safeSourceUrl)}
            className="inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          >
            페이지 URL 복사
          </button>
        </div>
      </div>
    </article>
  );
}

export function AdminScreenshotExportPageClient() {
  const [copyNotice, setCopyNotice] = useState("");
  const [uploadedScreenshots, setUploadedScreenshots] = useState<Record<string, string>>({});

  const safeTemplates = useMemo(
    () => (Array.isArray(screenshotTemplates) ? screenshotTemplates : []),
    []
  );

  useEffect(() => {
    return () => {
      const values = Object.values(uploadedScreenshots);
      if (Array.isArray(values)) {
        values.forEach((url) => {
          if (typeof url === "string" && url.startsWith("blob:")) {
            URL.revokeObjectURL(url);
          }
        });
      }
    };
  }, [uploadedScreenshots]);

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

  const handleSelectFile = (templateId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setUploadedScreenshots((previous) => {
      const next = { ...previous };
      const existing = previous[templateId];
      if (typeof existing === "string" && existing.startsWith("blob:")) {
        URL.revokeObjectURL(existing);
      }
      next[templateId] = nextUrl;
      return next;
    });
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          Google Play Screenshot Export
        </h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Google Play 업로드용 1080×1920 스토어 스크린샷 템플릿입니다.
        </p>
        {copyNotice ? (
          <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {copyNotice}
          </p>
        ) : null}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {safeTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            uploadedScreenshot={uploadedScreenshots[template.id] ?? null}
            onSelectFile={handleSelectFile}
            onCopy={handleCopy}
          />
        ))}
      </section>
    </main>
  );
}
