import type { Metadata } from "next";
import { FeedbackEntry } from "@/components/feedback/feedback-entry";

export const metadata: Metadata = {
  title: "KRX Insight 베타 피드백",
  description: "KRX Insight 베타 사용 경험에 대한 의견을 정리해 전달할 수 있는 피드백 페이지입니다."
};

export default function FeedbackPage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
      <FeedbackEntry />
    </main>
  );
}
