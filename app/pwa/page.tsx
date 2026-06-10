import type { Metadata } from "next";
import { PwaInstallGuide } from "@/components/pwa/PwaInstallGuide";

export const metadata: Metadata = {
  title: "PWA 설치 안내 | KRX Insight",
  description:
    "KRX Insight를 홈 화면에 추가하고 앱처럼 사용하는 방법을 안내합니다. Android Chrome, iOS Safari 설치 절차를 확인하세요."
};

export default function PwaPage() {
  return <PwaInstallGuide />;
}
