"use client";

import Image from "next/image";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";

const CANVAS_WIDTH = 1024;
const CANVAS_HEIGHT = 500;

const DEFAULT_TITLE = "KRX Insight";
const DEFAULT_SUBTITLE = "한국 주식 AI 분석과 보유종목 리스크 진단";
const DEFAULT_HELPER = "오늘 시장 브리핑 · AI 종목 분석 · 보유종목 진단";
const DEFAULT_FILENAME = "krx-insight-feature-graphic-1024x500.png";
const DEFAULT_ICON = "/icons/icon-512.png";

type MockCard = {
  title: string;
  lines: string[];
};

const mockCards: MockCard[] = [
  {
    title: "오늘 시장 브리핑",
    lines: ["시장 방향: 관망", "TOP 3: 삼성전자 · SK하이닉스 · NAVER"]
  },
  {
    title: "AI 종목 분석",
    lines: ["삼성전자 005930", "AI Score 78"]
  },
  {
    title: "포트폴리오 리스크",
    lines: ["리스크 점수 62/100", "변동성: 보통"]
  },
  {
    title: "보유 Top 3",
    lines: ["삼성전자", "SK하이닉스 · NAVER"]
  }
];

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

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("이미지를 불러올 수 없습니다."));
    image.src = src;
  });
}

function drawMockCards(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) {
  const cardGap = 12;
  const rowHeight = (height - cardGap) / 2;
  const colWidth = (width - cardGap) / 2;

  mockCards.forEach((card, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const cardX = x + col * (colWidth + cardGap);
    const cardY = y + row * (rowHeight + cardGap);

    drawRoundedRect(ctx, cardX, cardY, colWidth, rowHeight, 14);
    ctx.fillStyle = "rgba(10, 34, 94, 0.82)";
    ctx.fill();
    ctx.strokeStyle = "rgba(125, 179, 255, 0.28)";
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = "#dbeafe";
    ctx.font = "700 20px system-ui, -apple-system, Segoe UI, sans-serif";
    ctx.fillText(card.title, cardX + 16, cardY + 34);

    ctx.fillStyle = "#bfdbfe";
    ctx.font = "600 15px system-ui, -apple-system, Segoe UI, sans-serif";
    card.lines.forEach((line, lineIndex) => {
      ctx.fillText(line, cardX + 16, cardY + 62 + lineIndex * 24);
    });
  });
}

async function exportFeatureGraphic(options: {
  title: string;
  subtitle: string;
  helper: string;
  fileName: string;
  iconSrc: string;
  mockupSrc: string | null;
}) {
  const { title, subtitle, helper, fileName, iconSrc, mockupSrc } = options;
  if (typeof window === "undefined") return;

  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_WIDTH;
  canvas.height = CANVAS_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const bgGradient = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  bgGradient.addColorStop(0, "#020f32");
  bgGradient.addColorStop(0.55, "#07286f");
  bgGradient.addColorStop(1, "#041438");
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.strokeStyle = "rgba(59, 130, 246, 0.22)";
  ctx.lineWidth = 1;
  for (let i = 0; i < 9; i += 1) {
    const y = 58 + i * 44;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(CANVAS_WIDTH, y + 14);
    ctx.stroke();
  }

  const curve = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  curve.addColorStop(0, "rgba(56, 189, 248, 0)");
  curve.addColorStop(0.42, "rgba(56, 189, 248, 0.6)");
  curve.addColorStop(1, "rgba(96, 165, 250, 0)");
  ctx.strokeStyle = curve;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 390);
  ctx.bezierCurveTo(260, 360, 420, 460, 700, 345);
  ctx.bezierCurveTo(760, 320, 900, 265, 1024, 252);
  ctx.stroke();

  drawRoundedRect(ctx, 54, 86, 194, 194, 42);
  ctx.fillStyle = "rgba(8, 20, 58, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(110, 183, 255, 0.8)";
  ctx.lineWidth = 2;
  ctx.stroke();

  try {
    const iconImage = await loadImageElement(iconSrc);
    drawRoundedRect(ctx, 64, 96, 174, 174, 36);
    ctx.save();
    ctx.clip();
    ctx.drawImage(iconImage, 64, 96, 174, 174);
    ctx.restore();
  } catch {
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fillRect(64, 96, 174, 174);
  }

  ctx.fillStyle = "#9cc9ff";
  ctx.font = "700 74px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(title, 284, 202);

  ctx.fillStyle = "#f1f5f9";
  ctx.font = "700 58px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(subtitle, 284, 292);

  ctx.fillStyle = "#a5b4fc";
  ctx.font = "600 34px system-ui, -apple-system, Segoe UI, sans-serif";
  ctx.fillText(helper, 286, 350);

  drawRoundedRect(ctx, 590, 46, 388, 418, 30);
  ctx.fillStyle = "rgba(5, 20, 60, 0.86)";
  ctx.fill();
  ctx.strokeStyle = "rgba(125, 179, 255, 0.42)";
  ctx.lineWidth = 2;
  ctx.stroke();

  const contentX = 610;
  const contentY = 68;
  const contentW = 348;
  const contentH = 374;

  if (mockupSrc) {
    try {
      const mockup = await loadImageElement(mockupSrc);
      const scale = Math.max(contentW / mockup.width, contentH / mockup.height);
      const drawW = mockup.width * scale;
      const drawH = mockup.height * scale;
      const dx = contentX + (contentW - drawW) / 2;
      const dy = contentY + (contentH - drawH) / 2;

      drawRoundedRect(ctx, contentX, contentY, contentW, contentH, 20);
      ctx.save();
      ctx.clip();
      ctx.drawImage(mockup, dx, dy, drawW, drawH);
      ctx.restore();
    } catch {
      drawMockCards(ctx, contentX, contentY, contentW, contentH);
    }
  } else {
    drawMockCards(ctx, contentX, contentY, contentW, contentH);
  }

  const dataUrl = canvas.toDataURL("image/png");
  const anchor = document.createElement("a");
  anchor.href = dataUrl;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
}

function MockPreviewGrid() {
  return (
    <div className="grid h-full w-full grid-cols-2 gap-3 rounded-2xl border border-blue-200/30 bg-[#081f57]/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]">
      {Array.isArray(mockCards)
        ? mockCards.map((card) => (
            <article
              key={card.title}
              className="rounded-xl border border-blue-200/20 bg-[#0a2d78]/85 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]"
            >
              <p className="text-[11px] font-bold text-blue-100">{card.title}</p>
              {Array.isArray(card.lines)
                ? card.lines.map((line) => (
                    <p key={line} className="mt-1 text-[10px] font-semibold text-blue-200/90">
                      {line}
                    </p>
                  ))
                : null}
            </article>
          ))
        : null}
    </div>
  );
}

export function AdminFeatureGraphicExportPageClient() {
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [subtitle, setSubtitle] = useState(DEFAULT_SUBTITLE);
  const [helper, setHelper] = useState(DEFAULT_HELPER);
  const [fileName, setFileName] = useState(DEFAULT_FILENAME);
  const [iconUpload, setIconUpload] = useState<string | null>(null);
  const [mockupUpload, setMockupUpload] = useState<string | null>(null);
  const [copyNotice, setCopyNotice] = useState("");
  const [exportNotice, setExportNotice] = useState("");

  useEffect(() => {
    return () => {
      if (typeof iconUpload === "string" && iconUpload.startsWith("blob:")) {
        URL.revokeObjectURL(iconUpload);
      }
      if (typeof mockupUpload === "string" && mockupUpload.startsWith("blob:")) {
        URL.revokeObjectURL(mockupUpload);
      }
    };
  }, [iconUpload, mockupUpload]);

  const iconSrc = useMemo(() => iconUpload || DEFAULT_ICON, [iconUpload]);
  const safeFileName = useMemo(() => (fileName.trim() ? fileName.trim() : DEFAULT_FILENAME), [fileName]);

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

  const handleSelectIcon = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const next = URL.createObjectURL(file);
    if (typeof iconUpload === "string" && iconUpload.startsWith("blob:")) {
      URL.revokeObjectURL(iconUpload);
    }
    setIconUpload(next);
  };

  const handleSelectMockup = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const next = URL.createObjectURL(file);
    if (typeof mockupUpload === "string" && mockupUpload.startsWith("blob:")) {
      URL.revokeObjectURL(mockupUpload);
    }
    setMockupUpload(next);
  };

  const handleExport = async () => {
    try {
      await exportFeatureGraphic({
        title,
        subtitle,
        helper,
        fileName: safeFileName,
        iconSrc,
        mockupSrc: mockupUpload
      });
      setExportNotice("Feature Graphic 이미지가 저장되었습니다.");
    } catch {
      setExportNotice("Feature Graphic 저장에 실패했습니다.");
    }
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">Feature Graphic Export</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          Google Play용 1024×500 Feature Graphic을 미리보고 바로 PNG로 저장하세요.
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              void handleExport();
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-brand bg-brand px-4 text-sm font-bold text-white transition-colors hover:bg-brand-strong"
          >
            Feature Graphic 저장
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopy(title);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
          >
            제목 복사
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopy(subtitle);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
          >
            부제목 복사
          </button>
          <button
            type="button"
            onClick={() => {
              void handleCopy(safeFileName);
            }}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
          >
            파일명 복사
          </button>
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

      <section className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_380px]">
        <article className="rounded-xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <h2 className="text-sm font-bold text-ink dark:text-white">1024×500 미리보기</h2>
          <div className="mt-3 overflow-hidden rounded-xl border border-blue-200/40 bg-slate-950 p-2 dark:border-blue-900/50">
            <div className="relative mx-auto w-full max-w-[1024px] overflow-hidden rounded-lg border border-blue-200/30 bg-gradient-to-br from-[#020f32] via-[#07286f] to-[#041438] shadow-[0_18px_42px_rgba(2,6,23,0.55)] aspect-[1024/500]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_72%_20%,rgba(96,165,250,0.28),transparent_52%),radial-gradient(circle_at_20%_80%,rgba(56,189,248,0.2),transparent_46%)]" />
              <div className="relative z-10 flex h-full w-full items-stretch px-7 py-6">
                <div className="flex w-[54%] flex-col justify-between pr-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <div className="relative h-24 w-24 overflow-hidden rounded-3xl border border-blue-200/60 bg-slate-900 shadow-[0_12px_28px_rgba(15,23,42,0.5)]">
                        {iconSrc.startsWith("blob:") ? (
                          <img src={iconSrc} alt="Feature graphic icon" className="h-full w-full object-cover" />
                        ) : (
                          <Image src={iconSrc} alt="Feature graphic icon" fill className="object-cover" sizes="96px" />
                        )}
                      </div>
                      <div className="space-y-1">
                        <p className="text-4xl font-extrabold leading-tight text-blue-200">{title}</p>
                        <p className="text-xl font-bold text-slate-100">{subtitle}</p>
                      </div>
                    </div>
                    <p className="text-base font-semibold text-blue-100">{helper}</p>
                  </div>
                  <p className="text-sm font-bold text-blue-100">KRX Insight</p>
                </div>

                <div className="w-[46%]">
                  <div className="h-full overflow-hidden rounded-3xl border border-blue-200/45 bg-slate-900/75 p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                    {mockupUpload ? (
                      <img
                        src={mockupUpload}
                        alt="Dashboard mockup"
                        className="h-full w-full rounded-2xl border border-blue-200/20 object-cover object-top"
                      />
                    ) : (
                      <MockPreviewGrid />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Google Play 권장 비율(1024×500)로 제작되며, 저장 시 PNG 파일로 다운로드됩니다.
          </p>
        </article>

        <aside className="space-y-4">
          <article className="rounded-xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <h3 className="text-sm font-bold text-ink dark:text-white">문구 설정</h3>
            <div className="mt-3 space-y-3">
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">메인 타이틀</span>
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none dark:border-dark-line dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">서브 타이틀</span>
                <input
                  value={subtitle}
                  onChange={(event) => setSubtitle(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none dark:border-dark-line dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">보조 문구</span>
                <input
                  value={helper}
                  onChange={(event) => setHelper(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none dark:border-dark-line dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="block">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">권장 파일명</span>
                <input
                  value={fileName}
                  onChange={(event) => setFileName(event.target.value)}
                  className="mt-1 h-10 w-full rounded-md border border-line px-3 text-sm font-semibold text-ink focus:border-brand focus:outline-none dark:border-dark-line dark:bg-slate-950 dark:text-white"
                />
              </label>
            </div>
          </article>

          <article className="rounded-xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <h3 className="text-sm font-bold text-ink dark:text-white">이미지 교체</h3>
            <div className="mt-3 space-y-2">
              <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
                App icon 업로드
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleSelectIcon}
                />
              </label>
              <label className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-md border border-line bg-slate-50 px-4 text-sm font-bold text-slate-700 transition-colors hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200">
                Dashboard mockup 업로드
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  onChange={handleSelectMockup}
                />
              </label>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                업로드가 없으면 기본 아이콘과 내장 Mock UI를 사용합니다.
              </p>
            </div>
          </article>

          <article className="rounded-xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <h3 className="text-sm font-bold text-ink dark:text-white">디자인 체크리스트</h3>
            <ul className="mt-3 space-y-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
              <li>• 1024×500 비율 유지</li>
              <li>• 과도한 수익 보장 문구 금지</li>
              <li>• 핵심 가치 1~2줄로 간결하게</li>
              <li>• 아이콘/대시보드 시각 요소 명확히 유지</li>
              <li>• 파일명: {safeFileName}</li>
            </ul>
          </article>
        </aside>
      </section>
    </main>
  );
}
