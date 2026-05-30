"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

type ScreenshotTemplate = {
  id: string;
  label: string;
  title: string;
  subtitle: string;
  sourceUrl: string;
  defaultImagePath: string | null;
  suggestedFileName: string;
  autoCropTopRatio: number;
};

const CANVAS_WIDTH = 1080;
const CANVAS_HEIGHT = 1920;
const CARD_RATIO_CLASS = "aspect-[9/16]";

const screenshotTemplates: ScreenshotTemplate[] = [
  {
    id: "dashboard",
    label: "Screenshot 01",
    title: "한국 주식 AI 분석 대시보드",
    subtitle: "오늘 시장 브리핑, 종목 분석, 보유종목 리스크 진단을 한 화면에서 확인하세요.",
    sourceUrl: "/",
    defaultImagePath: "/store-screenshots/raw/raw-01-dashboard.jpg",
    suggestedFileName: "krx-insight-01-dashboard-1080x1920.png",
    autoCropTopRatio: 0.16
  },
  {
    id: "market-brief",
    label: "Screenshot 02",
    title: "오늘 시장 브리핑",
    subtitle: "시장 흐름과 오늘 먼저 확인할 종목을 빠르게 확인하세요.",
    sourceUrl: "/",
    defaultImagePath: "/store-screenshots/raw/raw-02-market-brief.jpg",
    suggestedFileName: "krx-insight-02-market-brief-1080x1920.png",
    autoCropTopRatio: 0.16
  },
  {
    id: "portfolio",
    label: "Screenshot 03",
    title: "내 보유종목 AI 진단",
    subtitle: "보유 상태, 리스크 변화, 알림과 동기화 상태를 한눈에 확인하세요.",
    sourceUrl: "/portfolio",
    defaultImagePath: "/store-screenshots/raw/raw-03-portfolio-diagnosis.jpg",
    suggestedFileName: "krx-insight-03-portfolio-diagnosis-1080x1920.png",
    autoCropTopRatio: 0.16
  },
  {
    id: "ai-analysis",
    label: "Screenshot 04",
    title: "AI 종목 분석 리포트",
    subtitle: "기술지표, 현재가, 데이터 기준을 함께 보는 AI 분석 요약.",
    sourceUrl: "/stocks/005930",
    defaultImagePath: "/store-screenshots/raw/raw-04-ai-analysis.jpg",
    suggestedFileName: "krx-insight-04-ai-analysis-1080x1920.png",
    autoCropTopRatio: 0.16
  },
  {
    id: "report",
    label: "Screenshot 05",
    title: "AI 리포트 저장과 활용",
    subtitle: "리포트 복사, 저장, 이미지 저장까지 간편하게 이용하세요.",
    sourceUrl: "/portfolio#reports",
    defaultImagePath: "/store-screenshots/raw/raw-05-report-save.jpg",
    suggestedFileName: "krx-insight-05-report-save-1080x1920.png",
    autoCropTopRatio: 0.16
  }
];

function buildAbsoluteUrl(path: string) {
  if (typeof window === "undefined") return path;
  return `${window.location.origin}${path}`;
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    image.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function wrapTextByWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number
) {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    const nextWidth = ctx.measureText(next).width;
    if (nextWidth <= maxWidth) {
      current = next;
    } else {
      if (current) {
        lines.push(current);
      }
      current = word;
    }
  });

  if (current) {
    lines.push(current);
  }

  return lines;
}

function PreviewMock({
  title,
  subtitle
}: {
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex h-full w-full flex-col rounded-[24px] border border-blue-300/20 bg-gradient-to-b from-[#0c1f4f] via-[#09183d] to-[#06102a] p-5 text-slate-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
      <div className="flex items-center justify-between rounded-xl border border-white/15 bg-white/5 px-3 py-2">
        <span className="text-[11px] font-bold text-blue-200">KRX Insight</span>
        <span className="rounded-full border border-blue-300/40 bg-blue-500/20 px-2 py-0.5 text-[10px] font-bold text-blue-100">
          1080 × 1920
        </span>
      </div>
      <h3 className="mt-4 text-[17px] font-bold leading-tight">{title}</h3>
      <p className="mt-2 text-[12px] font-semibold leading-5 text-slate-300">{subtitle}</p>
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
        <p className="text-[11px] font-bold text-blue-100">KRX Insight</p>
        <div className="mt-2 h-[68px] rounded-md border border-white/10 bg-slate-900/70 px-2 py-2">
          <div className="h-[2px] w-full rounded-full bg-slate-700" />
          <div className="mt-2 h-[2px] w-full rounded-full bg-slate-700" />
          <div className="mt-2 h-[2px] w-full rounded-full bg-slate-700" />
        </div>
      </div>
      <p className="mt-auto text-[11px] font-semibold text-slate-300">업로드하면 실스크린샷으로 자동 교체됩니다.</p>
    </div>
  );
}

async function exportStoreScreenshot(options: {
  template: ScreenshotTemplate;
  sourceImage: string | null;
}) {
  const { template, sourceImage } = options;
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bgGradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
  bgGradient.addColorStop(0, "#f0f6ff");
  bgGradient.addColorStop(0.48, "#dfeafb");
  bgGradient.addColorStop(1, "#0a1a45");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const topGlow = ctx.createRadialGradient(180, 40, 10, 540, 0, 780);
  topGlow.addColorStop(0, "rgba(37, 99, 235, 0.38)");
  topGlow.addColorStop(1, "rgba(37, 99, 235, 0)");
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 560);

  ctx.fillStyle = "#0f2d7a";
  ctx.font = "700 38px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText("KRX Insight", 86, 108);

  ctx.fillStyle = "#0f172a";
  ctx.font = "700 64px system-ui, -apple-system, Segoe UI, sans-serif";
  const titleLines = wrapTextByWidth(ctx, template.title, 900);
  titleLines.forEach((line, index) => {
    ctx.fillText(line, 86, 196 + index * 74);
  });

  ctx.fillStyle = "#334155";
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, sans-serif";
  const subtitleLines = wrapTextByWidth(ctx, template.subtitle, 900);
  subtitleLines.slice(0, 2).forEach((line, index) => {
    ctx.fillText(line, 86, 320 + index * 48);
  });

  const frameX = 76;
  const frameY = 410;
  const frameW = 928;
  const frameH = 1288;

  ctx.save();
  drawRoundedRect(ctx, frameX, frameY, frameW, frameH, 56);
  ctx.fillStyle = "rgba(3, 10, 31, 0.5)";
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.42)";
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.restore();

  const innerPadding = 22;
  const screenX = frameX + innerPadding;
  const screenY = frameY + innerPadding;
  const screenW = frameW - innerPadding * 2;
  const screenH = frameH - innerPadding * 2;

  ctx.save();
  drawRoundedRect(ctx, screenX, screenY, screenW, screenH, 38);
  ctx.clip();
  ctx.fillStyle = "#0b1229";
  ctx.fillRect(screenX, screenY, screenW, screenH);

  if (sourceImage) {
    try {
      const screenshot = await loadImageElement(sourceImage);
      const topCrop = Math.max(0, Math.floor(screenshot.height * template.autoCropTopRatio));
      const cropWidth = screenshot.width;
      const cropHeight = Math.max(1, screenshot.height - topCrop);

      const scale = Math.min(screenW / cropWidth, screenH / cropHeight);
      const drawWidth = cropWidth * scale;
      const drawHeight = cropHeight * scale;
      const dx = screenX + (screenW - drawWidth) / 2;
      const dy = screenY + (screenH - drawHeight) / 2;

      ctx.drawImage(
        screenshot,
        0,
        topCrop,
        cropWidth,
        cropHeight,
        dx,
        dy,
        drawWidth,
        drawHeight
      );
    } catch {
      ctx.fillStyle = "#10244f";
      ctx.fillRect(screenX, screenY, screenW, screenH);
      ctx.fillStyle = "#cbd5e1";
      ctx.font = "700 42px system-ui, -apple-system, Segoe UI, sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("스크린샷을 불러올 수 없습니다.", screenX + screenW / 2, screenY + screenH / 2);
      ctx.textAlign = "start";
    }
  } else {
    ctx.fillStyle = "#10244f";
    ctx.fillRect(screenX, screenY, screenW, screenH);
    ctx.fillStyle = "#cbd5e1";
    ctx.font = "700 42px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("스크린샷 업로드가 필요합니다.", screenX + screenW / 2, screenY + screenH / 2);
    ctx.textAlign = "start";
  }
  ctx.restore();

  ctx.fillStyle = "rgba(15, 23, 42, 0.74)";
  ctx.fillRect(0, 1800, CANVAS_WIDTH, 120);
  ctx.fillStyle = "#f8fafc";
  ctx.font = "700 40px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("KRX Insight", CANVAS_WIDTH / 2, 1872);
  ctx.textAlign = "start";

  const dataUrl = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = template.suggestedFileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function TemplateExportCard({
  template,
  uploadedImage,
  hideDefaultImage,
  onImageLoadError,
  onSelectImage,
  onCopy,
  onExport
}: {
  template: ScreenshotTemplate;
  uploadedImage: string | null;
  hideDefaultImage: boolean;
  onImageLoadError: (templateId: string) => void;
  onSelectImage: (templateId: string, event: ChangeEvent<HTMLInputElement>) => void;
  onCopy: (text: string) => Promise<void>;
  onExport: (template: ScreenshotTemplate) => Promise<void>;
}) {
  const previewImage = uploadedImage || (!hideDefaultImage ? template.defaultImagePath : null);
  const absoluteUrl = buildAbsoluteUrl(template.sourceUrl);

  return (
    <article className="group rounded-xl border border-line bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(15,23,42,0.14)] dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold text-brand">{template.label}</p>
          <h2 className="mt-1 text-lg font-bold text-ink dark:text-white">{template.title}</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">{template.subtitle}</p>
        </div>
        <span className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700 dark:border-blue-800/60 dark:bg-blue-950/40 dark:text-blue-200">
          1080×1920
        </span>
      </div>

      <div className="mt-4 rounded-2xl border border-blue-100 bg-gradient-to-b from-[#f8fbff] to-[#ebf3ff] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] dark:border-blue-900/40 dark:from-slate-900 dark:to-slate-950">
        <div className={`relative mx-auto w-full max-w-[340px] overflow-hidden rounded-[26px] border border-slate-200 bg-white shadow-[0_16px_36px_rgba(15,23,42,0.24)] dark:border-slate-700 dark:bg-slate-900 ${CARD_RATIO_CLASS}`}>
          <div className="absolute inset-0 flex flex-col">
            <div className="shrink-0 bg-gradient-to-r from-[#0f2d7a] via-[#143c99] to-[#1d4ed8] px-4 pb-4 pt-3 text-white">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] opacity-85">{template.label}</p>
              <p className="mt-1 text-[18px] font-bold leading-tight">{template.title}</p>
              <p className="mt-1 text-[12px] font-medium leading-5 text-blue-100">{template.subtitle}</p>
            </div>

            <div className="relative flex-1 bg-slate-200 p-3 dark:bg-slate-900">
              <div className="relative h-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-[0_8px_22px_rgba(15,23,42,0.14)] dark:border-slate-700 dark:bg-slate-950">
                {previewImage ? (
                  previewImage.startsWith("blob:") ? (
                    <img
                      src={previewImage}
                      alt={`${template.title} 업로드 미리보기`}
                      className="h-full w-full object-cover object-top"
                    />
                  ) : (
                    <Image
                      src={previewImage}
                      alt={`${template.title} 기본 미리보기`}
                      fill
                      className="object-cover object-top"
                      sizes="(max-width: 640px) 90vw, 340px"
                      onError={() => onImageLoadError(template.id)}
                    />
                  )
                ) : (
                  <PreviewMock title={template.title} subtitle={template.subtitle} />
                )}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-black/18 to-transparent" />
              </div>
            </div>

            <div className="shrink-0 bg-slate-950 px-4 py-2 text-center text-[11px] font-bold text-slate-100">
              KRX Insight
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
          스크린샷 업로드/교체
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            onChange={(event) => onSelectImage(template.id, event)}
          />
        </label>
        <button
          type="button"
          onClick={() => {
            void onExport(template);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-strong"
        >
          PNG 미리보기 저장
        </button>
        <Link
          href={template.sourceUrl}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
        >
          원본 페이지 열기
        </Link>
        <button
          type="button"
          onClick={() => {
            void onCopy(template.suggestedFileName);
          }}
          className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
        >
          파일명 복사
        </button>
      </div>

      <div className="mt-3 space-y-2 rounded-md border border-line bg-slate-50 p-3 text-xs font-semibold dark:border-dark-line dark:bg-slate-900/60">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void onCopy(template.title);
            }}
            className="inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          >
            제목 복사
          </button>
          <button
            type="button"
            onClick={() => {
              void onCopy(template.subtitle);
            }}
            className="inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          >
            부제목 복사
          </button>
          <button
            type="button"
            onClick={() => {
              void onCopy(absoluteUrl);
            }}
            className="inline-flex h-7 items-center justify-center rounded-md border border-line bg-white px-2 text-[11px] font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200"
          >
            페이지 URL 복사
          </button>
        </div>
        <p className="text-slate-500 dark:text-slate-400">권장 파일명: {template.suggestedFileName}</p>
      </div>
    </article>
  );
}

export function AdminScreenshotExportPageClient() {
  const [copyNotice, setCopyNotice] = useState("");
  const [exportNotice, setExportNotice] = useState("");
  const [isBatchExporting, setIsBatchExporting] = useState(false);
  const [uploadedScreenshots, setUploadedScreenshots] = useState<Record<string, string>>({});
  const [missingDefaults, setMissingDefaults] = useState<Record<string, boolean>>({});

  const safeTemplates = useMemo(() => (Array.isArray(screenshotTemplates) ? screenshotTemplates : []), []);

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

  const handleSelectImage = (templateId: string, event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const nextUrl = URL.createObjectURL(file);
    setUploadedScreenshots((previous) => {
      const next = { ...previous };
      const old = previous[templateId];
      if (typeof old === "string" && old.startsWith("blob:")) {
        URL.revokeObjectURL(old);
      }
      next[templateId] = nextUrl;
      return next;
    });
  };

  const handleImageLoadError = (templateId: string) => {
    setMissingDefaults((previous) => ({ ...previous, [templateId]: true }));
  };

  const handleExport = async (template: ScreenshotTemplate) => {
    const uploaded = uploadedScreenshots[template.id] ?? null;
    const fallback = missingDefaults[template.id] ? null : template.defaultImagePath;
    const sourceImage = uploaded || fallback;

    try {
      await exportStoreScreenshot({
        template,
        sourceImage
      });
      setExportNotice(`${template.suggestedFileName} 저장을 시작했습니다.`);
    } catch {
      setExportNotice("이미지 저장에 실패했습니다.");
    }
  };

  const handleExportAll = async () => {
    if (!Array.isArray(safeTemplates) || safeTemplates.length === 0 || isBatchExporting) {
      return;
    }

    setIsBatchExporting(true);
    try {
      setExportNotice("5개 템플릿 PNG 저장을 시작합니다.");
      for (let index = 0; index < safeTemplates.length; index += 1) {
        const template = safeTemplates[index];
        setExportNotice(`${index + 1}/5 저장 중... (${template.suggestedFileName})`);
        const uploaded = uploadedScreenshots[template.id] ?? null;
        const fallback = missingDefaults[template.id] ? null : template.defaultImagePath;
        const sourceImage = uploaded || fallback;

        await exportStoreScreenshot({
          template,
          sourceImage
        });
        await new Promise((resolve) => setTimeout(resolve, 220));
      }
      setExportNotice("5개 템플릿 PNG 저장 요청을 모두 완료했습니다.");
    } catch {
      setExportNotice("일괄 저장에 실패했습니다. 각 카드에서 개별 저장을 시도해 주세요.");
    } finally {
      setIsBatchExporting(false);
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">Google Play Screenshot Export</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          1080×1920 스토어 스크린샷 템플릿으로 업로드용 PNG를 빠르게 제작하세요.
        </p>
        <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm font-semibold text-blue-800 dark:border-blue-900/50 dark:bg-blue-950/40 dark:text-blue-100">
          <p>1) 원본 스크린샷 업로드 → 2) 자동 스타일 적용 미리보기 확인 → 3) PNG 미리보기 저장</p>
          <p className="mt-1 text-xs font-medium text-blue-700 dark:text-blue-200">
            상단 주소창은 자동으로 일부 정리되며, 필요하면 더 깔끔한 원본을 다시 업로드해 주세요.
          </p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void handleExportAll();
            }}
            disabled={isBatchExporting}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-300 disabled:text-slate-100 dark:disabled:border-slate-700 dark:disabled:bg-slate-700"
          >
            {isBatchExporting ? "5장 저장 진행 중..." : "5장 한 번에 저장"}
          </button>
          <p className="inline-flex min-h-11 items-center rounded-md border border-line bg-white px-3 text-xs font-semibold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
            팝업 차단이 켜져 있으면 브라우저에서 다운로드를 허용해 주세요.
          </p>
        </div>
        {copyNotice ? (
          <p className="mt-3 inline-flex rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
            {copyNotice}
          </p>
        ) : null}
        {exportNotice ? (
          <p className="mt-2 inline-flex rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            {exportNotice}
          </p>
        ) : null}
      </section>

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
        {safeTemplates.map((template) => (
          <TemplateExportCard
            key={template.id}
            template={template}
            uploadedImage={uploadedScreenshots[template.id] ?? null}
            hideDefaultImage={Boolean(missingDefaults[template.id])}
            onImageLoadError={handleImageLoadError}
            onSelectImage={handleSelectImage}
            onCopy={handleCopy}
            onExport={handleExport}
          />
        ))}
      </section>
    </main>
  );
}
