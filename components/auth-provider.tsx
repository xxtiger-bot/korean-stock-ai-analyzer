"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from "react";
import {
  type SupabaseUrlValidationStatus,
  isSupabaseConfigured,
  supabase,
  supabaseConfigMessage,
  supabasePublicUrl,
  supabaseUrlValidationStatus,
  supabaseUrlError
} from "@/lib/supabase";

type AuthActionResult = {
  ok: boolean;
  message?: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSupabaseReady: boolean;
  supabaseUrl: string;
  supabaseUrlStatus: SupabaseUrlValidationStatus;
  supabaseNotice: string;
  signInWithMagicLink: (email: string, redirectTo?: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const NETWORK_BLOCKED_MESSAGE =
  "Supabase 서버에 연결할 수 없습니다. 현재 네트워크 또는 DNS 환경에서 Supabase 접속이 차단되었을 수 있습니다.";

function mapAuthErrorMessage(rawMessage: string): string {
  const message = typeof rawMessage === "string" ? rawMessage : "";
  const lower = message.toLowerCase();

  if (
    lower.includes("err_name_not_resolved") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed")
  ) {
    return NETWORK_BLOCKED_MESSAGE;
  }

  return message || "로그인 링크 전송에 실패했습니다.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        const nextSession = data.session ?? null;
        setSession(nextSession);
        setUser(nextSession?.user ?? null);
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession ?? null);
      setUser(nextSession?.user ?? null);
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signInWithMagicLink = useCallback(
    async (email: string, redirectTo?: string): Promise<AuthActionResult> => {
      if (supabaseUrlError) {
        return {
          ok: false,
          message: "Supabase URL 설정을 확인해주세요."
        };
      }

      if (!supabase || !isSupabaseConfigured || typeof window === "undefined") {
        return {
          ok: false,
          message: "클라우드 동기화 미설정"
        };
      }

      const safeEmail = typeof email === "string" ? email.trim() : "";
      if (!safeEmail) {
        return {
          ok: false,
          message: "이메일을 확인해주세요."
        };
      }
      try {
        const emailRedirectTo =
          typeof redirectTo === "string" && redirectTo.trim()
            ? redirectTo.trim()
            : `${window.location.origin}/auth/callback`;

        const { error } = await supabase.auth.signInWithOtp({
          email: safeEmail,
          options: {
            emailRedirectTo
          }
        });

        if (error) {
          return {
            ok: false,
            message: mapAuthErrorMessage(error.message ?? "")
          };
        }

        return {
          ok: true,
          message: "로그인 링크를 이메일로 보냈습니다."
        };
      } catch (error) {
        const fallbackMessage =
          error instanceof Error ? mapAuthErrorMessage(error.message) : NETWORK_BLOCKED_MESSAGE;
        return {
          ok: false,
          message: fallbackMessage
        };
      }
    },
    []
  );

  const signOut = useCallback(async (): Promise<AuthActionResult> => {
    if (!supabase || !isSupabaseConfigured) {
      return { ok: true };
    }

    const { error } = await supabase.auth.signOut();
    if (error) {
      return {
        ok: false,
        message: "로그아웃에 실패했습니다. 잠시 후 다시 시도해주세요."
      };
    }

    return { ok: true };
  }, []);

  const value = useMemo(
    () => ({
      user,
      session,
      isLoading,
      isSupabaseReady: isSupabaseConfigured,
      supabaseUrl: supabasePublicUrl,
      supabaseUrlStatus: supabaseUrlValidationStatus,
      supabaseNotice: supabaseConfigMessage || "",
      signInWithMagicLink,
      signOut
    }),
    [isLoading, session, signInWithMagicLink, signOut, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
