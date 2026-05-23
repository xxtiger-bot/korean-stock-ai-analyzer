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
  statusCode?: number;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  isSupabaseReady: boolean;
  supabaseUrl: string;
  supabaseUrlStatus: SupabaseUrlValidationStatus;
  supabaseNotice: string;
  refreshSession: () => Promise<Session | null>;
  sendEmailOtpCode: (email: string) => Promise<AuthActionResult>;
  verifyEmailOtpCode: (email: string, code: string) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const NETWORK_BLOCKED_MESSAGE =
  "Supabase 서버에 연결할 수 없습니다. 현재 네트워크 또는 DNS 환경에서 Supabase 접속이 차단되었을 수 있습니다.";
const SESSION_TIMEOUT_MS = 5000;

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

  return message || "인증코드 전송에 실패했습니다.";
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshSession = useCallback(async () => {
    if (!supabase || !isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return null;
    }

    try {
      const sessionPromise = supabase.auth.getSession();
      let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
      const timeoutPromise = new Promise<null>((resolve) => {
        timeoutHandle = setTimeout(() => {
          resolve(null);
        }, SESSION_TIMEOUT_MS);
      });
      const result = await Promise.race([sessionPromise, timeoutPromise]);
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (!result) {
        setSession(null);
        setUser(null);
        return null;
      }
      const { data } = result;
      const nextSession = data.session ?? null;
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      return nextSession;
    } catch {
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!supabase || !isSupabaseConfigured) {
      setSession(null);
      setUser(null);
      setIsLoading(false);
      return;
    }

    let mounted = true;
    void refreshSession().finally(() => {
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
  }, [refreshSession]);

  const sendEmailOtpCode = useCallback(async (email: string): Promise<AuthActionResult> => {
    if (supabaseUrlError) {
      return {
        ok: false,
        message: "Supabase URL 설정을 확인해주세요.",
        statusCode: 0
      };
    }

    if (!supabase || !isSupabaseConfigured || typeof window === "undefined") {
      return {
        ok: false,
        message: "클라우드 동기화 미설정",
        statusCode: 0
      };
    }

    const safeEmail = typeof email === "string" ? email.trim() : "";
    if (!safeEmail) {
      return {
        ok: false,
        message: "이메일을 확인해주세요.",
        statusCode: 0
      };
    }

    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: safeEmail,
        options: {
          shouldCreateUser: true
        }
      });

      if (error) {
        const statusCode =
          typeof (error as { status?: unknown }).status === "number"
            ? ((error as { status: number }).status ?? 0)
            : 0;
        return {
          ok: false,
          message: mapAuthErrorMessage(error.message ?? ""),
          statusCode
        };
      }

      return {
        ok: true,
        message: "인증코드를 이메일로 보냈습니다.",
        statusCode: 200
      };
    } catch (error) {
      const fallbackMessage =
        error instanceof Error ? mapAuthErrorMessage(error.message) : NETWORK_BLOCKED_MESSAGE;
      return {
        ok: false,
        message: fallbackMessage,
        statusCode: 0
      };
    }
  }, []);

  const verifyEmailOtpCode = useCallback(
    async (email: string, code: string): Promise<AuthActionResult> => {
      if (supabaseUrlError) {
        return {
          ok: false,
          message: "Supabase URL 설정을 확인해주세요.",
          statusCode: 0
        };
      }

      if (!supabase || !isSupabaseConfigured || typeof window === "undefined") {
        return {
          ok: false,
          message: "클라우드 동기화 미설정",
          statusCode: 0
        };
      }

      const safeEmail = typeof email === "string" ? email.trim() : "";
      const safeCode = typeof code === "string" ? code.trim() : "";
      if (!safeEmail) {
        return {
          ok: false,
          message: "이메일을 확인해주세요.",
          statusCode: 0
        };
      }
      if (!safeCode) {
        return {
          ok: false,
          message: "인증코드를 입력해주세요.",
          statusCode: 0
        };
      }
      if (!/^\d{6,8}$/.test(safeCode)) {
        return {
          ok: false,
          message: "인증코드는 6~8자리 숫자로 입력해주세요.",
          statusCode: 0
        };
      }
      try {
        const { error } = await supabase.auth.verifyOtp({
          email: safeEmail,
          token: safeCode,
          type: "email"
        });

        if (error) {
          const statusCode =
            typeof (error as { status?: unknown }).status === "number"
              ? ((error as { status: number }).status ?? 0)
              : 0;
          return {
            ok: false,
            message: mapAuthErrorMessage(error.message ?? ""),
            statusCode
          };
        }

        return {
          ok: true,
          message: "로그인되었습니다.",
          statusCode: 200
        };
      } catch (error) {
        const fallbackMessage =
          error instanceof Error ? mapAuthErrorMessage(error.message) : NETWORK_BLOCKED_MESSAGE;
        return {
          ok: false,
          message: fallbackMessage,
          statusCode: 0
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
      refreshSession,
      sendEmailOtpCode,
      verifyEmailOtpCode,
      signOut
    }),
    [isLoading, refreshSession, sendEmailOtpCode, session, signOut, user, verifyEmailOtpCode]
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
