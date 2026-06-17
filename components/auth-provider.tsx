"use client";

import type { Session, User } from "@supabase/supabase-js";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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
import { isAdminEmail } from "@/lib/admin";
import { REFERRAL_CODE_STORAGE_KEY } from "@/lib/storage-keys";

type AuthActionResult = {
  ok: boolean;
  message?: string;
  statusCode?: number;
};

type OAuthProvider = "google" | "kakao";

type AuthContextValue = {
  user: User | null;
  isAdmin: boolean;
  session: Session | null;
  isLoading: boolean;
  isSupabaseReady: boolean;
  supabaseUrl: string;
  supabaseUrlStatus: SupabaseUrlValidationStatus;
  supabaseNotice: string;
  refreshSession: () => Promise<Session | null>;
  sendEmailOtpCode: (email: string) => Promise<AuthActionResult>;
  verifyEmailOtpCode: (email: string, code: string) => Promise<AuthActionResult>;
  signInWithOAuthProvider: (provider: OAuthProvider) => Promise<AuthActionResult>;
  signOut: () => Promise<AuthActionResult>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const NETWORK_BLOCKED_MESSAGE =
  "Supabase 서버에 연결할 수 없습니다. 현재 네트워크 또는 DNS 환경에서 Supabase 접속이 차단되었을 수 있습니다.";
const SESSION_TIMEOUT_MS = 5000;
const REFERRAL_REWARD_DAYS = 3;

function toIsoString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildReferralCode(userId: string) {
  const normalized = typeof userId === "string" ? userId.replace(/[^a-zA-Z0-9]/g, "").toLowerCase() : "";
  const seed = normalized.slice(0, 12) || Math.random().toString(36).slice(2, 10);
  return `krx_${seed}`;
}

function buildReferralRecordId() {
  return `ref-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function addDaysFromBase(baseIso: string | null, days: number) {
  const now = Date.now();
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : REFERRAL_REWARD_DAYS;
  const baseTime = (() => {
    if (!baseIso) return now;
    const parsed = new Date(baseIso).getTime();
    if (!Number.isFinite(parsed)) return now;
    return parsed > now ? parsed : now;
  })();
  return new Date(baseTime + safeDays * 24 * 60 * 60 * 1000).toISOString();
}

function clearStoredReferralCode() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(REFERRAL_CODE_STORAGE_KEY);
  } catch {
    // localStorage can be blocked in restricted contexts.
  }
}

function resolveUserDisplayName(user: User | null): string {
  if (!user) return "";

  const metadata = user.user_metadata as Record<string, unknown> | null;
  const provider =
    typeof user.app_metadata?.provider === "string" ? user.app_metadata.provider.toLowerCase() : "";

  const safeName = typeof metadata?.name === "string" ? metadata.name.trim() : "";
  const safeNickname = typeof metadata?.nickname === "string" ? metadata.nickname.trim() : "";

  if (safeName) return safeName;
  if (safeNickname) return safeNickname;
  if (provider === "kakao") return "Kakao 사용자";

  return "로그인 사용자";
}

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
  const profileSyncKeyRef = useRef("");
  const referralProcessKeyRef = useRef("");

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

  const isAdmin = Boolean(user?.email && isAdminEmail(user.email));

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

  useEffect(() => {
    const supabaseClient = supabase;
    const userId = user?.id ?? "";
    const safeEmail = typeof user?.email === "string" ? user.email.trim() : "";
    const safeDisplayName = resolveUserDisplayName(user);

    if (!supabaseClient || !isSupabaseConfigured || !userId) {
      profileSyncKeyRef.current = "";
      referralProcessKeyRef.current = "";
      return;
    }

    const client = supabaseClient;
    const syncKey = `${userId}:${safeEmail}:${safeDisplayName}`;

    if (profileSyncKeyRef.current === syncKey) {
      return;
    }
    profileSyncKeyRef.current = syncKey;

    let cancelled = false;

    async function syncProfile() {
      try {
        const { data: rows, error: selectError } = await client
          .from("profiles")
          .select("id, plan, referral_code, pro_expires_at")
          .eq("id", userId)
          .limit(1);

        if (cancelled) return;

        if (selectError) {
          console.warn("[auth-profile] select failed:", selectError.message ?? "unknown error");
          return;
        }

        const existingProfile =
          Array.isArray(rows) && rows.length > 0
            ? (rows[0] as {
                id?: string;
                plan?: string;
                referral_code?: string | null;
                pro_expires_at?: string | null;
              })
            : null;
        const nowIso = new Date().toISOString();
        const existingReferralCode =
          typeof existingProfile?.referral_code === "string" ? existingProfile.referral_code.trim() : "";
        const referralCodeForUser = existingReferralCode || buildReferralCode(userId);
        const payload = {
          id: userId,
          email: safeEmail || null,
          display_name: safeDisplayName || null,
          updated_at: nowIso
        };

        if (existingProfile?.id) {
          const updatePayload =
            existingReferralCode && existingReferralCode.length > 0
              ? payload
              : { ...payload, referral_code: referralCodeForUser };
          const { error: updateError } = await client
            .from("profiles")
            .update(updatePayload)
            .eq("id", userId);

          if (cancelled) return;
          if (updateError) {
            console.warn("[auth-profile] update failed:", updateError.message ?? "unknown error");
          }
        } else {
          const { error: insertError } = await client.from("profiles").insert({
            ...payload,
            plan: "free",
            referral_code: referralCodeForUser
          });

          if (cancelled) return;
          if (insertError) {
            console.warn("[auth-profile] insert failed:", insertError.message ?? "unknown error");
            return;
          }
        }

        if (typeof window === "undefined") return;
        const rawStoredCode = window.localStorage.getItem(REFERRAL_CODE_STORAGE_KEY) ?? "";
        const storedReferralCode = rawStoredCode.trim();
        if (!storedReferralCode) {
          referralProcessKeyRef.current = "";
          return;
        }

        const referralProcessKey = `${userId}:${storedReferralCode}`;
        if (referralProcessKeyRef.current === referralProcessKey) return;
        referralProcessKeyRef.current = referralProcessKey;

        const { data: referrerRows, error: referrerError } = await client
          .from("profiles")
          .select("id, pro_expires_at")
          .eq("referral_code", storedReferralCode)
          .limit(1);

        if (cancelled) return;
        if (referrerError) {
          console.warn("[auth-referral] referrer lookup failed:", referrerError.message ?? "unknown error");
          referralProcessKeyRef.current = "";
          return;
        }

        const referrerProfile =
          Array.isArray(referrerRows) && referrerRows.length > 0
            ? (referrerRows[0] as { id?: string; pro_expires_at?: string | null })
            : null;
        const referrerUserId = typeof referrerProfile?.id === "string" ? referrerProfile.id : "";

        if (!referrerUserId) {
          referralProcessKeyRef.current = "";
          clearStoredReferralCode();
          return;
        }

        if (referrerUserId === userId) {
          referralProcessKeyRef.current = "";
          clearStoredReferralCode();
          return;
        }

        const { data: existingReferralRows, error: existingReferralError } = await client
          .from("referrals")
          .select("id")
          .eq("referred_user_id", userId)
          .limit(1);

        if (cancelled) return;
        if (existingReferralError) {
          console.warn(
            "[auth-referral] existing referral check failed:",
            existingReferralError.message ?? "unknown error"
          );
          referralProcessKeyRef.current = "";
          return;
        }

        if (Array.isArray(existingReferralRows) && existingReferralRows.length > 0) {
          referralProcessKeyRef.current = "";
          clearStoredReferralCode();
          return;
        }

        const updatedExpiry = addDaysFromBase(toIsoString(referrerProfile?.pro_expires_at), REFERRAL_REWARD_DAYS);
        const rewardNowIso = new Date().toISOString();

        const { error: rewardUpdateError } = await client
          .from("profiles")
          .update({
            pro_expires_at: updatedExpiry,
            updated_at: rewardNowIso
          })
          .eq("id", referrerUserId);

        if (cancelled) return;
        if (rewardUpdateError) {
          console.warn("[auth-referral] reward update failed:", rewardUpdateError.message ?? "unknown error");
          referralProcessKeyRef.current = "";
          return;
        }

        const { error: insertReferralError } = await client.from("referrals").insert({
          id: buildReferralRecordId(),
          referrer_user_id: referrerUserId,
          referred_user_id: userId,
          referral_code: storedReferralCode,
          status: "completed",
          reward_days: REFERRAL_REWARD_DAYS,
          rewarded_at: rewardNowIso
        });

        if (cancelled) return;
        if (insertReferralError) {
          const code = typeof insertReferralError.code === "string" ? insertReferralError.code : "";
          const message =
            typeof insertReferralError.message === "string" ? insertReferralError.message.toLowerCase() : "";
          const duplicated = code === "23505" || message.includes("duplicate");
          if (duplicated) {
            referralProcessKeyRef.current = "";
            clearStoredReferralCode();
          } else {
            referralProcessKeyRef.current = "";
          }
          console.warn("[auth-referral] insert failed:", insertReferralError.message ?? "unknown error");
          return;
        }

        referralProcessKeyRef.current = "";
        clearStoredReferralCode();
      } catch (error) {
        referralProcessKeyRef.current = "";
        const message = error instanceof Error ? error.message : "unknown error";
        console.warn("[auth-profile] sync failed:", message);
      }
    }

    void syncProfile();

    return () => {
      cancelled = true;
    };
  }, [user]);

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

  const signInWithOAuthProvider = useCallback(
    async (provider: OAuthProvider): Promise<AuthActionResult> => {
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

      const safeProvider: OAuthProvider = provider === "kakao" ? "kakao" : "google";
      const redirectTo = `${window.location.origin}/auth/callback?next=/portfolio`;
      const oauthOptions =
        safeProvider === "kakao"
          ? { redirectTo, scopes: "profile_nickname" }
          : { redirectTo };

      try {
        console.log(`[auth] oauth provider: ${safeProvider}`);
        console.log(
          `[auth] oauth options: ${JSON.stringify({
            provider: safeProvider,
            redirectTo: oauthOptions.redirectTo,
            ...(safeProvider === "kakao" ? { scopes: oauthOptions.scopes } : {})
          })}`
        );
        const { error } = await supabase.auth.signInWithOAuth({
          provider: safeProvider,
          options: oauthOptions
        });

        if (error) {
          const rawMessage = mapAuthErrorMessage(error.message ?? "");
          const lower = rawMessage.toLowerCase();
          const statusCode =
            typeof (error as { status?: unknown }).status === "number"
              ? ((error as { status: number }).status ?? 0)
              : 0;
          const needsConfigCheck =
            lower.includes("provider") ||
            lower.includes("oauth") ||
            lower.includes("not enabled") ||
            lower.includes("unsupported") ||
            lower.includes("invalid") ||
            lower.includes("redirect");
          return {
            ok: false,
            message: needsConfigCheck
              ? safeProvider === "kakao"
                ? "카카오 로그인 설정을 확인해주세요."
                : "소셜 로그인 설정을 확인해주세요."
              : rawMessage || "소셜 로그인에 실패했습니다. 다시 시도해주세요.",
            statusCode
          };
        }

        return {
          ok: true,
          message: "소셜 로그인으로 이동합니다.",
          statusCode: 200
        };
      } catch (error) {
        const fallbackMessage =
          error instanceof Error ? mapAuthErrorMessage(error.message) : NETWORK_BLOCKED_MESSAGE;
        return {
          ok: false,
          message:
            fallbackMessage === NETWORK_BLOCKED_MESSAGE
              ? "소셜 로그인에 실패했습니다. 다시 시도해주세요."
              : fallbackMessage || "소셜 로그인에 실패했습니다. 다시 시도해주세요.",
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
      isAdmin,
      session,
      isLoading,
      isSupabaseReady: isSupabaseConfigured,
      supabaseUrl: supabasePublicUrl,
      supabaseUrlStatus: supabaseUrlValidationStatus,
      supabaseNotice: supabaseConfigMessage || "",
      refreshSession,
      sendEmailOtpCode,
      verifyEmailOtpCode,
      signInWithOAuthProvider,
      signOut
    }),
    [
      isAdmin,
      isLoading,
      refreshSession,
      sendEmailOtpCode,
      session,
      signInWithOAuthProvider,
      signOut,
      user,
      verifyEmailOtpCode
    ]
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
