"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageSquare, X } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { AuthModal } from "@/components/auth-modal";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type FeedbackCategory =
  | "사용성"
  | "데이터"
  | "로그인"
  | "모바일"
  | "기능 제안"
  | "기타";

const FEEDBACK_CATEGORIES: FeedbackCategory[] = [
  "사용성",
  "데이터",
  "로그인",
  "모바일",
  "기능 제안",
  "기타"
];

function buildFeedbackId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `feedback-${crypto.randomUUID()}`;
  }
  return `feedback-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export function FeedbackTrigger({
  label = "피드백 보내기",
  className = "",
  source = ""
}: {
  label?: string;
  className?: string;
  source?: string;
}) {
  const pathname = usePathname();
  const { user } = useAuth();

  const [isOpen, setIsOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [category, setCategory] = useState<FeedbackCategory>("사용성");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const userEmail = typeof user?.email === "string" ? user.email.trim() : "";
  const isLoggedIn = Boolean(user?.id);
  const pageLabel = useMemo(() => {
    const safePath = typeof pathname === "string" && pathname ? pathname : "/";
    const safeSource = typeof source === "string" ? source.trim() : "";
    return safeSource ? `${safePath}#${safeSource}` : safePath;
  }, [pathname, source]);

  useEffect(() => {
    if (!isOpen) return;
    if (isLoggedIn) {
      setEmail(userEmail);
    }
  }, [isLoggedIn, isOpen, userEmail]);

  useEffect(() => {
    if (typeof document === "undefined" || !isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  function resetForm() {
    setRating(5);
    setCategory("사용성");
    setMessage("");
    setNotice("");
    if (!isLoggedIn) {
      setEmail("");
    }
  }

  function openModal() {
    setIsOpen(true);
    setNotice("");
    if (isLoggedIn) {
      setEmail(userEmail);
    }
  }

  function closeModal() {
    setIsOpen(false);
    setNotice("");
  }

  async function handleSubmitFeedback() {
    const safeMessage = message.trim();
    const safeEmail = isLoggedIn ? userEmail : email.trim();
    const safeRating = Number.isFinite(rating) ? Math.floor(rating) : 0;

    if (!safeMessage) {
      setNotice("메시지를 입력해주세요.");
      return;
    }

    if (!Number.isFinite(safeRating) || safeRating < 1 || safeRating > 5) {
      setNotice("만족도를 1~5 사이에서 선택해주세요.");
      return;
    }

    if (!isLoggedIn && safeEmail && !isValidEmail(safeEmail)) {
      setNotice("이메일 형식을 확인해주세요.");
      return;
    }

    if (!supabase || !isSupabaseConfigured) {
      setNotice("피드백 제출에 실패했습니다. 잠시 후 다시 시도해주세요.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        id: buildFeedbackId(),
        user_id: user?.id ?? null,
        email: safeEmail || null,
        page: pageLabel,
        rating: safeRating,
        category,
        message: safeMessage
      };

      const { error } = await supabase.from("user_feedback").insert(payload);
      if (error) {
        throw error;
      }

      setNotice("피드백이 접수되었습니다. 감사합니다.");
      resetForm();
    } catch {
      setNotice("피드백 제출에 실패했습니다. 잠시 후 다시 시도해주세요.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <button type="button" onClick={openModal} className={className}>
        {label}
      </button>

      <AuthModal isOpen={isOpen} onClose={closeModal}>
        <div className="sticky top-0 z-10 -mx-4 -mt-4 mb-2 flex items-start justify-between gap-2 border-b border-line bg-white px-4 py-3 dark:border-dark-line dark:bg-dark-panel">
          <div>
            <p className="text-xs font-bold tracking-normal text-brand">Feedback</p>
            <h3 className="mt-1 text-base font-bold text-ink dark:text-white">피드백 보내기</h3>
          </div>
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-line bg-slate-50 text-slate-500 hover:text-slate-700 dark:border-dark-line dark:bg-slate-900 dark:text-slate-300"
            aria-label="피드백 닫기"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 rounded-md border border-line bg-slate-50 px-3 py-2 text-xs font-semibold leading-5 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300">
          현재 페이지: {pageLabel}
        </p>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            만족도 (1~5)
          </span>
          <select
            value={rating}
            onChange={(event) => setRating(Number(event.target.value))}
            className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
          >
            <option value={5}>5 - 매우 만족</option>
            <option value={4}>4 - 만족</option>
            <option value={3}>3 - 보통</option>
            <option value={2}>2 - 아쉬움</option>
            <option value={1}>1 - 개선 필요</option>
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            카테고리
          </span>
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as FeedbackCategory)}
            className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
          >
            {FEEDBACK_CATEGORIES.map((item) => (
              <option key={`feedback-category-${item}`} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            메시지
          </span>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="사용 중 불편한 점이나 제안하고 싶은 기능을 알려주세요."
            rows={5}
            className="w-full rounded-md border border-line bg-white px-3 py-2 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring dark:border-dark-line dark:bg-slate-950 dark:text-white"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-semibold text-slate-500 dark:text-slate-400">
            이메일 {isLoggedIn ? "(자동 입력)" : "(선택)"}
          </span>
          <input
            type="email"
            value={isLoggedIn ? userEmail : email}
            onChange={(event) => {
              if (!isLoggedIn) {
                setEmail(event.target.value);
              }
            }}
            readOnly={isLoggedIn}
            placeholder="you@example.com"
            className="h-10 w-full rounded-md border border-line bg-white px-3 text-sm font-semibold text-ink outline-none ring-brand/20 focus:ring read-only:bg-slate-50 read-only:text-slate-500 dark:border-dark-line dark:bg-slate-950 dark:text-white dark:read-only:bg-slate-900 dark:read-only:text-slate-300"
          />
        </label>

        {notice ? (
          <p className="mt-2 text-xs font-semibold leading-5 text-slate-600 dark:text-slate-300">{notice}</p>
        ) : null}

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={closeModal}
            className="inline-flex h-11 w-full items-center justify-center rounded-md border border-line bg-white px-3 text-sm font-semibold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-slate-950 dark:text-slate-200 sm:w-auto"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={() => void handleSubmitFeedback()}
            disabled={isSubmitting}
            className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-brand px-3 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400 sm:w-auto"
          >
            <MessageSquare className="h-4 w-4" />
            {isSubmitting ? "제출 중..." : "피드백 제출"}
          </button>
        </div>
      </AuthModal>
    </>
  );
}
