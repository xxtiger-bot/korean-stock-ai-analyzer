"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

function sanitizeNextPath(value: string | null) {
  if (typeof value !== "string") return "/portfolio";
  if (!value.startsWith("/")) return "/portfolio";
  if (value.startsWith("//")) return "/portfolio";
  return value;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("로그인 정보를 확인하는 중입니다...");
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams]
  );

  useEffect(() => {
    let mounted = true;

    async function handleCallback() {
      if (!supabase || !isSupabaseConfigured) {
        if (mounted) {
          setMessage("클라우드 동기화 미설정 상태입니다. 홈으로 이동합니다.");
          router.replace("/");
        }
        return;
      }

      try {
        const code = searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (mounted) {
              setMessage(error.message || "로그인 세션 처리에 실패했습니다.");
            }
            return;
          }
        } else {
          await supabase.auth.getSession();
        }

        if (mounted) {
          setMessage("로그인 확인이 완료되었습니다. 이동 중입니다...");
          router.replace(nextPath);
        }
      } catch {
        if (mounted) {
          setMessage("로그인 세션 처리 중 문제가 발생했습니다.");
        }
      }
    }

    void handleCallback();
    return () => {
      mounted = false;
    };
  }, [nextPath, router, searchParams]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-line bg-white p-6 text-center shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h1 className="text-base font-bold text-ink dark:text-white">Auth Callback</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </section>
    </main>
  );
}
