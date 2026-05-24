"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { EmptyState, ErrorState, LoadingState } from "@/components/ui-states";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type FeedbackCategory = "사용성" | "데이터" | "로그인" | "모바일" | "기능 제안" | "기타";
type FeedbackFilter = "전체" | FeedbackCategory;

type FeedbackRow = {
  id: string;
  user_id: string | null;
  email: string | null;
  page: string | null;
  rating: number | null;
  category: FeedbackCategory;
  message: string;
  created_at: string | null;
};

const FILTERS: FeedbackFilter[] = ["전체", "사용성", "데이터", "로그인", "모바일", "기능 제안", "기타"];

function safeText(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function safeNumber(value: unknown, fallback = 0) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function isKnownCategory(value: string): value is FeedbackCategory {
  return (
    value === "사용성" ||
    value === "데이터" ||
    value === "로그인" ||
    value === "모바일" ||
    value === "기능 제안" ||
    value === "기타"
  );
}

function normalizeFeedbackRow(value: unknown): FeedbackRow | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const id = safeText(raw.id);
  const message = safeText(raw.message).trim();
  if (!id || !message) return null;

  const categoryRaw = safeText(raw.category, "기타");
  const category = isKnownCategory(categoryRaw) ? categoryRaw : "기타";
  const ratingRaw = safeNumber(raw.rating, NaN);
  const rating = Number.isFinite(ratingRaw) && ratingRaw >= 1 && ratingRaw <= 5 ? ratingRaw : null;

  return {
    id,
    user_id: safeText(raw.user_id) || null,
    email: safeText(raw.email) || null,
    page: safeText(raw.page) || null,
    rating,
    category,
    message,
    created_at: safeText(raw.created_at) || null
  };
}

function formatDateTime(value: string | null) {
  if (!value) return "시간 정보 없음";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "시간 정보 없음";
  return date.toLocaleString("ko-KR", { hour12: false });
}

function isRecent7Days(value: string | null) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const diff = Date.now() - date.getTime();
  return diff >= 0 && diff <= 7 * 24 * 60 * 60 * 1000;
}

function truncateMessage(message: string, expanded: boolean) {
  if (expanded || message.length <= 160) return message;
  return `${message.slice(0, 160)}...`;
}

export function AdminFeedbackPageClient() {
  const [feedbackRows, setFeedbackRows] = useState<FeedbackRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<FeedbackFilter>("전체");
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadFeedback() {
      if (!isSupabaseConfigured || !supabase) {
        if (!cancelled) {
          setError("피드백을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
          setIsLoading(false);
        }
        return;
      }

      setIsLoading(true);
      setError("");
      try {
        const { data, error: queryError } = await supabase
          .from("user_feedback")
          .select("id,user_id,email,page,rating,category,message,created_at")
          .order("created_at", { ascending: false });

        if (queryError) {
          throw queryError;
        }

        const rows = Array.isArray(data)
          ? data
              .map(normalizeFeedbackRow)
              .filter((item): item is FeedbackRow => Boolean(item))
          : [];

        if (!cancelled) {
          setFeedbackRows(rows);
        }
      } catch {
        if (!cancelled) {
          setError("피드백을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadFeedback();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredRows = useMemo(() => {
    const safeRows = Array.isArray(feedbackRows) ? feedbackRows : [];
    if (filter === "전체") return safeRows;
    return safeRows.filter((item) => item.category === filter);
  }, [feedbackRows, filter]);

  const stats = useMemo(() => {
    const safeRows = Array.isArray(feedbackRows) ? feedbackRows : [];
    const total = safeRows.length;
    const ratings = safeRows
      .map((item) => (Number.isFinite(item.rating) ? item.rating : NaN))
      .filter((value): value is number => Number.isFinite(value));
    const avgRating =
      ratings.length > 0 ? ratings.reduce((sum, value) => sum + value, 0) / ratings.length : null;
    const recent7DaysCount = safeRows.filter((item) => isRecent7Days(item.created_at)).length;

    const categoryCount = new Map<FeedbackCategory, number>();
    safeRows.forEach((item) => {
      const current = categoryCount.get(item.category) ?? 0;
      categoryCount.set(item.category, current + 1);
    });

    let mostCategory: FeedbackCategory | null = null;
    let mostCount = 0;
    for (const [key, value] of Array.from(categoryCount.entries())) {
      if (value > mostCount) {
        mostCategory = key;
        mostCount = value;
      }
    }

    return {
      total,
      avgRating,
      recent7DaysCount,
      mostCategory
    };
  }, [feedbackRows]);

  const averageRatingLabel =
    typeof stats.avgRating === "number" && Number.isFinite(stats.avgRating)
      ? `${stats.avgRating.toFixed(2)} / 5`
      : "데이터 없음";

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const safeCurrent = Array.isArray(current) ? current : [];
      return safeCurrent.includes(id)
        ? safeCurrent.filter((item) => item !== id)
        : [...safeCurrent, id];
    });
  }

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
      <section className="rounded-lg border border-line bg-white p-5 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-6">
        <p className="text-xs font-bold tracking-normal text-brand">Admin</p>
        <h1 className="mt-1 text-2xl font-bold text-ink dark:text-white sm:text-3xl">피드백 관리</h1>
        <p className="mt-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
          베타 테스트 사용자가 남긴 피드백을 확인합니다.
        </p>
      </section>

      <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">전체 피드백 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.total}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">평균 만족도</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{averageRatingLabel}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">최근 7일 피드백 수</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">{stats.recent7DaysCount}</p>
        </article>
        <article className="rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel">
          <p className="text-[11px] font-bold text-slate-500">가장 많은 카테고리</p>
          <p className="mt-1 text-xl font-bold text-ink dark:text-white">
            {stats.mostCategory ?? "데이터 없음"}
          </p>
        </article>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <button
                type="button"
                key={item}
                onClick={() => setFilter(item)}
                className={`inline-flex min-h-10 items-center justify-center rounded-md border px-3 text-xs font-bold ${
                  active
                    ? "border-brand bg-blue-50 text-brand dark:border-blue-500 dark:bg-blue-950/40 dark:text-blue-200"
                    : "border-line bg-slate-50 text-slate-600 dark:border-dark-line dark:bg-slate-900/60 dark:text-slate-300"
                }`}
              >
                {item}
              </button>
            );
          })}
        </div>
      </section>

      <section className="mt-4 rounded-lg border border-line bg-white p-4 shadow-soft dark:border-dark-line dark:bg-dark-panel sm:p-5">
        {isLoading ? (
          <LoadingState
            title="피드백 불러오는 중"
            description="최근 피드백 데이터를 가져오고 있습니다."
          />
        ) : error ? (
          <ErrorState title="피드백 로드 실패" description={error} />
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="아직 접수된 피드백이 없습니다."
            description="피드백이 접수되면 이 영역에서 확인할 수 있습니다."
          />
        ) : (
          <div className="grid gap-3">
            {filteredRows.map((item) => {
              const isExpanded = expandedIds.includes(item.id);
              const shortMessage = truncateMessage(item.message, isExpanded);
              const hasLongMessage = item.message.length > 160;
              return (
                <article
                  key={item.id}
                  className="rounded-lg border border-line bg-slate-50 p-3 dark:border-dark-line dark:bg-slate-900/50"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-700 dark:border-dark-line dark:bg-dark-panel dark:text-slate-200">
                          만족도 {Number.isFinite(item.rating) ? `${item.rating}/5` : "미입력"}
                        </span>
                        <span className="rounded-md border border-line bg-white px-2 py-1 text-xs font-bold text-slate-600 dark:border-dark-line dark:bg-dark-panel dark:text-slate-300">
                          {item.category}
                        </span>
                      </div>
                      <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                        {item.email ?? "익명 사용자"}
                      </p>
                    </div>
                    <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                      {formatDateTime(item.created_at)}
                    </p>
                  </div>

                  <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                    페이지: {item.page ?? "정보 없음"}
                  </p>

                  <p className="mt-2 text-sm font-semibold leading-6 text-ink dark:text-white">
                    {shortMessage}
                  </p>

                  {hasLongMessage ? (
                    <button
                      type="button"
                      onClick={() => toggleExpanded(item.id)}
                      className="mt-2 inline-flex min-h-9 items-center gap-1 rounded-md border border-line bg-white px-3 text-xs font-bold text-slate-600 hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-300"
                    >
                      {isExpanded ? (
                        <>
                          접기 <ChevronUp className="h-3.5 w-3.5" />
                        </>
                      ) : (
                        <>
                          자세히 보기 <ChevronDown className="h-3.5 w-3.5" />
                        </>
                      )}
                    </button>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-4">
        <Link
          href="/admin/checklist"
          className="inline-flex min-h-10 items-center justify-center rounded-md border border-line bg-white px-4 text-sm font-bold text-slate-700 hover:border-brand hover:text-brand dark:border-dark-line dark:bg-dark-panel dark:text-slate-200"
        >
          체크리스트로 돌아가기
        </Link>
      </section>
    </main>
  );
}
