"use client";

import Link from "next/link";
import {
  CloudCog,
  HardDriveDownload,
  Home,
  RefreshCcw,
  ShieldCheck
} from "lucide-react";
import { useEffect, useState } from "react";
import { FaqAccordion, type FaqItem } from "@/components/pwa/FaqAccordion";
import { StepCard } from "@/components/pwa/StepCard";
import { ValueCard } from "@/components/pwa/ValueCard";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const androidSteps = [
  "Chrome에서 KRX Insight를 엽니다.",
  "우측 상단 메뉴(⋮)를 누릅니다.",
  "홈 화면에 추가 또는 앱 설치를 선택합니다.",
  "설치 버튼을 눌러 완료합니다.",
  "홈 화면 아이콘으로 앱처럼 실행합니다."
];

const iosSteps = [
  "Safari에서 KRX Insight를 엽니다.",
  "하단 공유 버튼을 누릅니다.",
  "홈 화면에 추가를 선택합니다.",
  "이름 확인 후 추가를 누릅니다.",
  "홈 화면 아이콘으로 실행합니다."
];

const faqItems: FaqItem[] = [
  {
    question: "설치 후 아이콘이 선명하지 않아요.",
    answer:
      "현재 아이콘은 베타용입니다. 정식 maskable 아이콘으로 개선 중입니다. 기존 아이콘을 삭제한 뒤 다시 설치하면 최신 아이콘이 반영됩니다."
  },
  {
    question: "iOS에서도 푸시 알림이 되나요?",
    answer:
      "iOS 푸시 지원은 기기와 OS 버전에 따라 달라질 수 있습니다. 현재는 핵심 분석 기능 중심으로 안정적으로 제공하고 있습니다."
  },
  {
    question: "데이터가 자동으로 클라우드에 업로드되나요?",
    answer:
      "로그인하지 않으면 로컬 모드로 사용됩니다. 로그인한 경우에만 클라우드 동기화 기능이 활성화됩니다."
  }
];

function scrollToSection(id: string) {
  const section = document.getElementById(id);
  if (!section) return;
  section.scrollIntoView({ behavior: "smooth", block: "start" });
}

export function PwaInstallGuide() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalling, setIsInstalling] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string>("");

  useEffect(() => {
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };

    const handleInstalled = () => {
      setStatusMessage("설치가 완료되었습니다. 홈 화면에서 KRX Insight를 실행해보세요.");
      setDeferredPrompt(null);
      setIsInstalling(false);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      scrollToSection("install-steps");
      return;
    }

    setIsInstalling(true);
    setStatusMessage("");
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === "accepted") {
        setStatusMessage("설치 요청이 수락되었습니다. 설치 완료 후 홈 화면에서 실행해보세요.");
      } else {
        setStatusMessage("설치를 취소했습니다. 아래 안내를 따라 수동 설치도 가능합니다.");
      }
    } catch {
      setStatusMessage("설치 요청을 처리하지 못했습니다. 아래 수동 설치 안내를 확인해주세요.");
    } finally {
      setIsInstalling(false);
      setDeferredPrompt(null);
    }
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-7">
        <p className="text-xs font-bold uppercase tracking-normal text-brand">PWA 설치 안내</p>
        <h1 className="mt-2 text-2xl font-bold text-ink dark:text-white sm:text-3xl">
          KRX Insight 앱처럼 설치하기
        </h1>
        <p className="mt-3 max-w-3xl text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          홈 화면에 추가하면 더 빠르게 열 수 있고, 일부 화면은 오프라인에서도 확인할 수 있습니다.
        </p>
        <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
          PWA 설치는 무료이며, 기존 웹 사용 방식과 동일합니다.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isInstalling}
          >
            {isInstalling ? "설치 준비 중..." : "설치 시작하기"}
          </button>
          <button
            type="button"
            onClick={() => scrollToSection("pwa-faq")}
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900 dark:text-slate-200"
          >
            설치 전 확인사항
          </button>
        </div>
        {statusMessage && (
          <p className="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-semibold leading-5 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-200">
            {statusMessage}
          </p>
        )}
      </section>

      <section id="install-steps" className="mt-4 grid gap-4 lg:grid-cols-2">
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-lg font-bold text-ink dark:text-white">Android Chrome 설치 방법</h2>
          <div className="mt-3 grid gap-3">
            {androidSteps.map((step, index) => (
              <StepCard
                key={`android-step-${index}`}
                step={index + 1}
                description={step}
                screenshotLabel={`Android Step ${index + 1}`}
              />
            ))}
          </div>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
          <h2 className="text-lg font-bold text-ink dark:text-white">iOS Safari 설치 방법</h2>
          <div className="mt-3 grid gap-3">
            {iosSteps.map((step, index) => (
              <StepCard
                key={`ios-step-${index}`}
                step={index + 1}
                description={step}
                screenshotLabel={`iOS Step ${index + 1}`}
              />
            ))}
          </div>
        </article>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-lg font-bold text-ink dark:text-white">설치 후 장점</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <ValueCard
            icon={HardDriveDownload}
            title="오프라인 확인"
            description="일부 핵심 화면은 네트워크가 불안정해도 확인할 수 있습니다."
          />
          <ValueCard
            icon={ShieldCheck}
            title="로컬 데이터 우선"
            description="보유종목과 체크리스트는 로컬 저장을 기본으로 사용합니다."
          />
          <ValueCard
            icon={Home}
            title="앱처럼 빠른 실행"
            description="홈 화면 아이콘으로 브라우저 탭 없이 바로 실행됩니다."
          />
          <ValueCard
            icon={RefreshCcw}
            title="자동 최신 상태"
            description="웹이 업데이트되면 앱도 최신 버전으로 반영됩니다."
          />
        </div>
      </section>

      <section id="pwa-faq" className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <h2 className="text-lg font-bold text-ink dark:text-white">자주 묻는 질문</h2>
        <div className="mt-3">
          <FaqAccordion items={faqItems} />
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <h2 className="text-xl font-bold text-ink dark:text-white">준비되셨나요?</h2>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          모바일 홈 화면에 추가하면 KRX Insight를 더 빠르게 확인할 수 있습니다.
        </p>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex min-h-11 items-center justify-center rounded-md bg-brand px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isInstalling}
          >
            지금 설치하기
          </button>
          <Link
            href="/"
            className="inline-flex min-h-11 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-900 dark:text-slate-200"
          >
            홈으로 돌아가기
          </Link>
        </div>
        <p className="mt-4 text-[11px] font-semibold leading-5 text-slate-500 dark:text-slate-400">
          이 서비스는 투자 참고 정보이며, 매수/매도 추천이 아닙니다.
        </p>
        <p className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
          <CloudCog className="h-3.5 w-3.5" />
          설치 지원이 보이지 않으면 브라우저 수동 설치 단계를 이용해주세요.
        </p>
      </section>
    </main>
  );
}
