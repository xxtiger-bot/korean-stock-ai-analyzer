"use client";

import type { EmailOtpType } from "@supabase/supabase-js";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { useAuth } from "@/components/auth-provider";

function sanitizeNextPath(value: string | null) {
  if (typeof value !== "string") return "/portfolio";
  if (!value.startsWith("/")) return "/portfolio";
  if (value.startsWith("//")) return "/portfolio";
  return value;
}

export function AuthCallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { refreshSession } = useAuth();
  const [message, setMessage] = useState("로그인 정보를 확인하는 중입니다...");
  const nextPath = useMemo(
    () => sanitizeNextPath(searchParams.get("next")),
    [searchParams]
  );

  useEffect(() => {
    let mounted = true;
    let redirectTimer: ReturnType<typeof setTimeout> | null = null;

    function getHashParams() {
      if (typeof window === "undefined") {
        return new URLSearchParams();
      }
      const rawHash = window.location.hash ?? "";
      const withoutPrefix = rawHash.startsWith("#") ? rawHash.slice(1) : rawHash;
      return new URLSearchParams(withoutPrefix);
    }

    function normalizeOtpType(value: string | null): EmailOtpType | null {
      if (typeof value !== "string") return null;
      const safeValue = value.trim();
      if (!safeValue) return null;

      const allowedTypes = new Set([
        "magiclink",
        "signup",
        "recovery",
        "invite",
        "email",
        "email_change",
        "email_change_new",
        "email_change_current"
      ]);

      if (!allowedTypes.has(safeValue)) {
        return null;
      }

      return safeValue as EmailOtpType;
    }

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
        const tokenHash = searchParams.get("token_hash");
        const typeParam = normalizeOtpType(searchParams.get("type"));
        const hashParams = getHashParams();
        const accessToken = hashParams.get("access_token");
        const refreshToken = hashParams.get("refresh_token");
        let flowErrorMessage = "";

        console.log(`[auth-callback] code exists: ${Boolean(code)}`);

        const initialSessionResult = await supabase.auth.getSession();
        const initialSession = initialSessionResult.data.session ?? null;
        if (initialSession?.user) {
          const userEmail =
            typeof initialSession.user.email === "string" ? initialSession.user.email : "";
          console.log("[auth-callback] session exists: true");
          console.log(`[auth-callback] user email: ${userEmail || "(none)"}`);
          if (mounted) {
            setMessage("로그인되었습니다. 포트폴리오로 이동합니다.");
            redirectTimer = setTimeout(() => {
              router.replace("/portfolio");
            }, 500);
          }
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            flowErrorMessage = error.message ?? "";
          }
        } else if (tokenHash && typeParam) {
          const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: typeParam
          });
          if (error) {
            flowErrorMessage = error.message ?? "";
          }
        } else if (accessToken && refreshToken) {
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          if (error) {
            flowErrorMessage = error.message ?? "";
          }
          if (typeof window !== "undefined") {
            window.history.replaceState({}, "", window.location.pathname + window.location.search);
          }
        } else {
          await supabase.auth.getSession();
        }

        const session = await refreshSession();
        const userEmail =
          typeof session?.user?.email === "string" ? session.user.email : "";
        console.log(`[auth-callback] session exists: ${Boolean(session)}`);
        console.log(`[auth-callback] user email: ${userEmail || "(none)"}`);

        if (session?.user) {
          if (mounted) {
            setMessage("로그인되었습니다. 포트폴리오로 이동합니다.");
            redirectTimer = setTimeout(() => {
              router.replace("/portfolio");
            }, 500);
          }
          return;
        }

        if (flowErrorMessage && mounted) {
          setMessage("로그인 처리에 실패했습니다. 다시 로그인해주세요.");
          return;
        }

        if (mounted) {
          setMessage("로그인 처리에 실패했습니다. 다시 로그인해주세요.");
        }
      } catch {
        if (mounted) {
          setMessage("로그인 처리에 실패했습니다. 다시 로그인해주세요.");
        }
      }
    }

    void handleCallback();
    return () => {
      mounted = false;
      if (redirectTimer) {
        clearTimeout(redirectTimer);
      }
    };
  }, [nextPath, refreshSession, router, searchParams]);

  return (
    <main className="mx-auto flex min-h-[60vh] w-full max-w-3xl items-center justify-center px-4 py-10">
      <section className="w-full max-w-lg rounded-lg border border-line bg-white p-6 text-center shadow-soft dark:border-dark-line dark:bg-dark-panel">
        <h1 className="text-base font-bold text-ink dark:text-white">로그인 처리</h1>
        <p className="mt-2 text-sm font-semibold leading-6 text-slate-600 dark:text-slate-300">
          {message}
        </p>
      </section>
    </main>
  );
}
