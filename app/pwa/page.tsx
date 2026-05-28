"use client";

import Link from "next/link";
import Image from "next/image";
import { type ButtonHTMLAttributes, type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowDownToLine,
  ChevronDown,
  ChevronUp,
  HardDrive,
  Home,
  ImagePlus,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  WifiOff,
  Zap
} from "lucide-react";

type InstallOutcome = "accepted" | "dismissed";
type InstallChoice = { outcome: InstallOutcome; platform?: string };
type NavigatorWithStandalone = Navigator & { standalone?: boolean };

interface BeforeInstallPromptEvent extends Event {
  readonly platforms?: string[];
  prompt: () => Promise<void>;
  readonly userChoice: Promise<InstallChoice>;
}

type InstallStepCardProps = {
  title: string;
  steps: string[];
  platform: "Android" | "iOS";
  screenshotMap?: Record<number, { src: string; alt: string }>;
};

type ValueCardProps = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
};

type FaqItem = {
  question: string;
  answer: string;
};

const primaryButtonClassName =
  "inline-flex min-h-12 items-center justify-center rounded-xl bg-ink px-5 text-sm font-bold text-white shadow-md transition hover:-translate-y-0.5 hover:bg-slate-800 hover:shadow-lg dark:bg-brand dark:hover:bg-blue-500";

function PrimaryActionButton({
  children,
  icon,
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; icon?: ReactNode }) {
  return (
    <button type="button" className={`${primaryButtonClassName} ${className ?? ""}`.trim()} {...props}>
      {icon ? <span className="mr-2 inline-flex items-center">{icon}</span> : null}
      {children}
    </button>
  );
}

function ScreenshotPlaceholder({ label }: { label: string }) {
  return (
    <div className="mt-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-6 text-center dark:border-slate-600 dark:bg-slate-900/50">
      <div className="mx-auto inline-flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300">
        <ImagePlus className="h-3.5 w-3.5" />
      </div>
      <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
        실제 설치 안내 이미지로 교체 예정
      </p>
    </div>
  );
}

function InstallStepCard({ title, steps, platform, screenshotMap }: InstallStepCardProps) {
  const safeSteps = Array.isArray(steps) ? steps : [];

  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
      <h3 className="text-base font-bold text-ink dark:text-white">{title}</h3>
      <ol className="mt-3 space-y-3">
        {safeSteps.map((step, index) => (
          <li
            key={`${platform}-${index + 1}`}
            className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-700 dark:bg-slate-900/55"
          >
            <div className="flex items-start gap-2">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-bold text-brand">
                {index + 1}
              </span>
              <p className="pt-0.5 text-sm font-semibold leading-5 text-slate-700 dark:text-slate-200">{step}</p>
            </div>
            {screenshotMap?.[index + 1] ? (
              <div className="mt-3 overflow-hidden rounded-xl border border-line bg-slate-50 p-2 shadow-sm dark:border-dark-line dark:bg-slate-900/60">
                <div className="relative w-full rounded-lg border border-slate-200/80 bg-white/90 p-1 dark:border-slate-700 dark:bg-slate-900/80">
                  <Image
                    src={screenshotMap[index + 1].src}
                    alt={screenshotMap[index + 1].alt}
                    width={1080}
                    height={2340}
                    className="h-auto max-h-[280px] w-full rounded-md object-contain"
                    sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 420px"
                  />
                </div>
              </div>
            ) : (
              <ScreenshotPlaceholder label={`${platform} Step ${index + 1}`} />
            )}
          </li>
        ))}
      </ol>
    </article>
  );
}

function ValueCard({ title, description, icon: Icon }: ValueCardProps) {
  return (
    <article className="rounded-2xl border border-line bg-white p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-dark-line dark:bg-dark-panel">
      <div className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand/10 text-brand">
        <Icon className="h-4 w-4" />
      </div>
      <h3 className="mt-3 text-sm font-bold text-ink dark:text-white">{title}</h3>
      <p className="mt-1.5 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{description}</p>
    </article>
  );
}

function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <div className="space-y-2">
      {safeItems.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <article
            key={`faq-${index + 1}`}
            className="overflow-hidden rounded-xl border border-line bg-white shadow-soft dark:border-dark-line dark:bg-dark-panel"
          >
            <button
              type="button"
              className="flex min-h-12 w-full items-center justify-between gap-3 px-4 py-3 text-left"
              onClick={() => setOpenIndex(isOpen ? null : index)}
            >
              <span className="text-sm font-bold text-ink dark:text-white">{item.question}</span>
              {isOpen ? (
                <ChevronUp className="h-4 w-4 shrink-0 text-slate-500" />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
              )}
            </button>
            {isOpen ? (
              <div className="border-t border-line px-4 py-3 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:text-slate-300">
                {item.answer}
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}

function PwaHero({
  onInstallClick,
  onScrollToSteps,
  installSupported,
  installStateText
}: {
  onInstallClick: () => void;
  onScrollToSteps: () => void;
  installSupported: boolean;
  installStateText: string | null;
}) {
  return (
    <section className="rounded-3xl border border-line bg-gradient-to-br from-white via-slate-50 to-blue-50 p-5 shadow-soft dark:border-dark-line dark:from-dark-panel dark:via-slate-900/70 dark:to-slate-950 sm:p-6">
      <div className="inline-flex items-center gap-2 rounded-full bg-brand/10 px-3 py-1 text-xs font-bold text-brand">
        <Smartphone className="h-3.5 w-3.5" />
        PWA 설치 가이드
      </div>
      <h1 className="mt-2 text-2xl font-bold text-ink dark:text-white sm:text-3xl">KRX Insight 앱처럼 설치하기</h1>
      <p className="mt-2 text-sm font-semibold leading-6 text-slate-700 dark:text-slate-200">
        홈 화면에 추가하면 더 빠르게 열 수 있고, 일부 화면은 오프라인에서도 확인할 수 있습니다.
      </p>
      <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
        PWA 설치는 무료이며, 기존 웹 사용 방식과 동일합니다.
      </p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <PrimaryActionButton
          onClick={onInstallClick}
        >
          설치 시작하기
        </PrimaryActionButton>
        <button
          type="button"
          onClick={onScrollToSteps}
          className="inline-flex min-h-12 items-center justify-center rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          설치 전 확인사항
        </button>
      </div>
      <p className="mt-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
        {installStateText ??
          (installSupported
            ? "설치 버튼으로 앱 설치를 바로 진행할 수 있습니다."
            : "설치 팝업이 보이지 않으면 아래 단계 안내로 수동 설치를 진행해 주세요.")}
      </p>
    </section>
  );
}

export default function PwaInstallGuidePage() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installSupported, setInstallSupported] = useState(false);
  const [installStateText, setInstallStateText] = useState<string | null>(null);
  const stepsRef = useRef<HTMLElement | null>(null);

  const androidSteps = useMemo(
    () => [
      "Chrome에서 KRX Insight를 엽니다.",
      "우측 상단 메뉴(⋮)를 눌러 브라우저 메뉴를 엽니다.",
      "메뉴에서 홈 화면에 추가 또는 앱 설치를 선택합니다.",
      "표시되는 앱 설치 팝업에서 설치를 눌러 진행합니다.",
      "홈 화면 아이콘으로 앱처럼 실행합니다."
    ],
    []
  );

  const iosSteps = useMemo(
    () => [
      "Safari에서 KRX Insight를 엽니다.",
      "브라우저 공유 메뉴(공유 아이콘)를 열어 공유 시트를 표시합니다.",
      "공유 시트에서 홈 화면에 추가를 선택합니다.",
      "이름을 확인하고 추가를 눌러 홈 화면 등록을 완료합니다.",
      "홈 화면 아이콘으로 실행합니다."
    ],
    []
  );

  const faqItems = useMemo<FaqItem[]>(
    () => [
      {
        question: "Q1：설치 후 아이콘이 선명하지 않아요.",
        answer:
          "현재 아이콘은 베타용입니다. 정식 maskable 아이콘으로 개선 중입니다. 기존 아이콘 삭제 후 재설치하면 반영됩니다."
      },
      {
        question: "Q2：iOS에서도 푸시 알림이 되나요?",
        answer: "브라우저/OS 버전에 따라 제한이 있습니다. 현재는 핵심 기능 중심으로 제공됩니다."
      },
      {
        question: "Q3：데이터가 자동으로 클라우드에 업로드되나요?",
        answer:
          "로그인하지 않으면 로컬 모드로 사용됩니다. 로그인 시에만 클라우드 동기화 기능이 활성화됩니다."
      }
    ],
    []
  );

  useEffect(() => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true;

    if (isStandalone) {
      setInstallStateText("이미 홈 화면에 추가되어 앱처럼 사용 중입니다.");
    } else {
      setInstallStateText("이 브라우저에서 설치 가능 여부를 확인 중입니다.");
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setInstallSupported(true);
      setInstallStateText("이 브라우저에서는 설치 버튼으로 앱 설치를 진행할 수 있습니다.");
    };

    const handleAppInstalled = () => {
      setDeferredPrompt(null);
      setInstallSupported(false);
      setInstallStateText("설치가 완료되었습니다. 홈 화면에서 KRX Insight를 실행해 보세요.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
    window.addEventListener("appinstalled", handleAppInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt as EventListener);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const scrollToSteps = useCallback(() => {
    if (stepsRef.current) {
      stepsRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  const handleInstallClick = useCallback(async () => {
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as NavigatorWithStandalone).standalone === true;

    if (isStandalone) {
      setInstallStateText("이미 설치된 상태입니다. 홈 화면 아이콘으로 바로 실행할 수 있습니다.");
      return;
    }

    if (!deferredPrompt) {
      scrollToSteps();
      setInstallStateText("이 브라우저에서는 단계 안내를 따라 수동 설치를 진행해 주세요.");
      return;
    }

    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice?.outcome === "accepted") {
        setInstallStateText("설치를 승인했습니다. 브라우저 안내에 따라 설치를 완료해 주세요.");
      } else {
        setInstallStateText("설치를 보류했습니다. 필요할 때 언제든 다시 시도할 수 있습니다.");
      }
    } catch {
      setInstallStateText("설치 요청 중 문제가 발생했습니다. 아래 단계 안내를 확인해 주세요.");
    } finally {
      setDeferredPrompt(null);
      setInstallSupported(false);
    }
  }, [deferredPrompt, scrollToSteps]);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="space-y-5 sm:space-y-6">
        <PwaHero
          onInstallClick={handleInstallClick}
          onScrollToSteps={scrollToSteps}
          installSupported={installSupported}
          installStateText={installStateText}
        />

        <section id="install-steps" ref={stepsRef} className="space-y-3 sm:space-y-4">
          <div className="rounded-2xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
            <h2 className="text-base font-bold text-ink dark:text-white">설치 단계 안내</h2>
            <p className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
              사용 중인 기기에 맞는 방법을 따라 설치해 주세요.
            </p>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <InstallStepCard
              title="Android Chrome 설치 방법"
              steps={androidSteps}
              platform="Android"
              screenshotMap={{
                1: {
                  src: "/screenshots/pwa/android-step1-open-site.jpg",
                  alt: "Android Chrome 설치 단계 1: KRX Insight 열기"
                },
                2: {
                  src: "/screenshots/pwa/android-step2-open-menu.jpg",
                  alt: "Android Chrome 설치 단계 2: 우측 상단 메뉴 열기"
                },
                3: {
                  src: "/screenshots/pwa/android-step3-install-popup.jpg",
                  alt: "Android Chrome 설치 단계 3: 앱 설치 팝업"
                },
                4: {
                  src: "/screenshots/pwa/android-step4-installing.jpg",
                  alt: "Android Chrome 설치 단계 4: 설치 진행 화면"
                },
                5: {
                  src: "/screenshots/pwa/android-step5-after-install.jpg",
                  alt: "Android Chrome 설치 단계 5: 설치 후 홈 화면 확인"
                }
              }}
            />
            <InstallStepCard
              title="iOS Safari 설치 방법"
              steps={iosSteps}
              platform="iOS"
              screenshotMap={{
                1: {
                  src: "/screenshots/pwa/ios-step1-open-site.png",
                  alt: "iOS Safari 설치 단계 1: KRX Insight 열기"
                },
                2: {
                  src: "/screenshots/pwa/ios-step2-open-share-sheet.png",
                  alt: "iOS Safari 설치 단계 2: 공유 메뉴 열기"
                },
                3: {
                  src: "/screenshots/pwa/ios-step3-select-add-to-home.png",
                  alt: "iOS Safari 설치 단계 3: 홈 화면에 추가 선택"
                },
                4: {
                  src: "/screenshots/pwa/ios-step4-confirm-name-and-add.png",
                  alt: "iOS Safari 설치 단계 4: 이름 확인 후 추가"
                },
                5: {
                  src: "/screenshots/pwa/ios-step5-open-from-home-screen.png",
                  alt: "iOS Safari 설치 단계 5: 홈 화면 아이콘 실행"
                }
              }}
            />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">설치 후 기대할 수 있는 가치</h2>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <ValueCard
              icon={WifiOff}
              title="오프라인 확인"
              description="일부 핵심 화면은 네트워크가 불안정해도 확인할 수 있습니다."
            />
            <ValueCard
              icon={HardDrive}
              title="로컬 데이터 우선"
              description="보유종목/체크리스트는 로컬 저장을 기본으로 사용합니다."
            />
            <ValueCard
              icon={Zap}
              title="앱처럼 빠른 실행"
              description="홈 화면 아이콘으로 브라우저 탭 없이 바로 실행됩니다."
            />
            <ValueCard
              icon={RefreshCw}
              title="자동 최신 상태"
              description="웹이 업데이트되면 앱도 최신 버전으로 반영됩니다."
            />
          </div>
        </section>

        <section className="rounded-2xl border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-base font-bold text-ink dark:text-white">자주 묻는 질문</h2>
          <div className="mt-3">
            <FaqAccordion items={faqItems} />
          </div>
        </section>

        <section className="rounded-2xl border border-brand/30 bg-gradient-to-r from-white to-blue-50 p-5 shadow-soft dark:border-brand/35 dark:from-dark-panel dark:to-slate-900">
          <h2 className="text-xl font-bold text-ink dark:text-white">준비되셨나요?</h2>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            설치 후 KRX Insight를 앱처럼 열고, 시장 브리핑과 종목 분석을 더 빠르게 확인해보세요.
          </p>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <PrimaryActionButton
              onClick={handleInstallClick}
              icon={<ArrowDownToLine className="h-4 w-4" />}
            >
              지금 설치하기
            </PrimaryActionButton>
            <Link
              href="/"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-line bg-white px-5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:bg-slate-50 hover:shadow-md dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <Home className="h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </div>
          <p className="mt-3 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            이 서비스는 투자 참고 정보이며, 매수/매도 추천이 아닙니다.
          </p>
        </section>
      </div>
    </main>
  );
}
