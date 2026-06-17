"use client";

import Link from "next/link";
import { Copy, Mail, MessageSquare, CheckCircle2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";

type ChoiceValue = "매우 신뢰됨" | "보통" | "신뢰하기 어려움";
type UnderstandingValue = "이해하기 쉬움" | "보통" | "어렵다";
type HoldingsValue = "편함" | "보통" | "불편함";

function ChoiceGroup<T extends string>({
  title,
  value,
  onChange,
  options
}: {
  title: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly T[];
}) {
  return (
    <fieldset className="grid gap-2">
      <legend className="text-sm font-bold text-ink dark:text-white">{title}</legend>
      <div className="grid gap-2 sm:grid-cols-3">
        {options.map((option) => {
          const selected = option === value;
          return (
            <button
              key={option}
              type="button"
              onClick={() => onChange(option)}
              className={`min-h-11 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                selected
                  ? "border-brand bg-blue-50 text-brand dark:bg-blue-950/20 dark:text-blue-200"
                  : "border-line bg-white text-slate-600 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function FeedbackEntry() {
  const [priceTrust, setPriceTrust] = useState<ChoiceValue>("보통");
  const [analysisEase, setAnalysisEase] = useState<UnderstandingValue>("보통");
  const [holdingsEase, setHoldingsEase] = useState<HoldingsValue>("보통");
  const [painPoint, setPainPoint] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const previewRef = useRef<HTMLTextAreaElement | null>(null);

  const feedbackText = useMemo(
    () =>
      [
        "[KRX Insight 베타 피드백]",
        `가격 신뢰도: ${priceTrust}`,
        `AI 분석 이해도: ${analysisEase}`,
        `보유종목 관리: ${holdingsEase}`,
        `불편했던 점: ${painPoint.trim() || "없음"}`,
        `이메일: ${email.trim() || "미입력"}`
      ].join("\n"),
    [analysisEase, email, holdingsEase, painPoint, priceTrust]
  );

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(feedbackText);
      setNotice("피드백 내용이 복사되었습니다. 운영자에게 전달해 주세요.");
      return;
    } catch {
      previewRef.current?.focus();
      previewRef.current?.select();
      setNotice("자동 복사가 어려워 내용을 선택했습니다. 직접 복사해 주세요.");
    }
  }

  return (
    <section className="rounded-2xl border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-normal text-brand">Beta Feedback</p>
          <h1 className="mt-2 text-2xl font-bold tracking-normal text-ink dark:text-white sm:text-3xl">
            KRX Insight 베타 피드백
          </h1>
          <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
            사용 중 불편했던 점이나 가격, AI 분석, 보유종목 관리에 대한 의견을 남겨주세요.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-line bg-slate-50 px-3 py-1 text-[11px] font-bold text-slate-500 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          <MessageSquare className="h-3.5 w-3.5" />
          복사 후 전달
        </span>
      </div>

      <div className="mt-5 grid gap-5">
        <ChoiceGroup
          title="1. 가격 정보가 신뢰되나요?"
          value={priceTrust}
          onChange={setPriceTrust}
          options={["매우 신뢰됨", "보통", "신뢰하기 어려움"]}
        />

        <ChoiceGroup
          title="2. AI 분석이 이해하기 쉬웠나요?"
          value={analysisEase}
          onChange={setAnalysisEase}
          options={["이해하기 쉬움", "보통", "어렵다"]}
        />

        <ChoiceGroup
          title="3. 보유종목 관리가 편했나요?"
          value={holdingsEase}
          onChange={setHoldingsEase}
          options={["편함", "보통", "불편함"]}
        />

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink dark:text-white">4. 가장 불편했던 점은 무엇인가요?</span>
          <textarea
            value={painPoint}
            onChange={(event) => setPainPoint(event.target.value)}
            placeholder="불편했던 흐름, 헷갈렸던 문구, 개선되었으면 하는 점을 적어주세요."
            className="min-h-28 rounded-lg border border-line bg-slate-50 px-3 py-3 text-sm font-semibold text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white dark:border-dark-line dark:bg-slate-900/60 dark:text-white dark:focus:bg-slate-900"
          />
        </label>

        <label className="grid gap-2">
          <span className="text-sm font-bold text-ink dark:text-white">5. 연락 받을 이메일 (선택)</span>
          <div className="relative">
            <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="name@example.com"
              className="min-h-11 w-full rounded-lg border border-line bg-slate-50 pl-10 pr-3 text-sm font-semibold text-ink outline-none transition placeholder:text-slate-400 focus:border-brand focus:bg-white dark:border-dark-line dark:bg-slate-900/60 dark:text-white dark:focus:bg-slate-900"
            />
          </div>
        </label>

        <div className="rounded-xl border border-line bg-slate-50/80 p-4 dark:border-dark-line dark:bg-slate-900/50">
          <p className="text-xs font-bold uppercase tracking-normal text-slate-400">복사 미리보기</p>
          <textarea
            ref={previewRef}
            readOnly
            value={feedbackText}
            className="mt-3 min-h-40 w-full rounded-lg border border-line bg-white px-3 py-3 text-sm font-semibold leading-6 text-slate-700 outline-none dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
          />
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-ink px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-100"
          >
            <Copy className="h-4 w-4" />
            피드백 내용 복사
          </button>
          <Link
            href="/disclaimer"
            className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-slate-600 transition hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
          >
            투자 유의사항 보기
          </Link>
        </div>

        <div className="rounded-xl border border-brand/20 bg-blue-50 px-4 py-3 text-sm font-semibold leading-6 text-slate-600 dark:border-brand/20 dark:bg-blue-950/20 dark:text-slate-300">
          <p className="inline-flex items-center gap-2 font-bold text-brand dark:text-blue-200">
            <CheckCircle2 className="h-4 w-4" />
            현재는 베타 피드백 수집 준비 단계입니다.
          </p>
          <p className="mt-1">복사한 내용을 운영자에게 전달해 주세요.</p>
        </div>

        {notice ? (
          <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">{notice}</p>
        ) : null}
      </div>
    </section>
  );
}
