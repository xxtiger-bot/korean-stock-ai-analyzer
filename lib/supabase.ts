import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

export type SupabaseUrlValidationStatus =
  | "ok"
  | "missing"
  | "contains-rest-v1"
  | "example-url"
  | "invalid-format";

type SupabaseUrlValidationResult = {
  status: SupabaseUrlValidationStatus;
  error: string | null;
};

function validateSupabaseUrl(url: string): SupabaseUrlValidationResult {
  if (!url) {
    return {
      status: "missing",
      error: "Supabase URL 설정을 확인해주세요."
    };
  }

  const lower = url.toLowerCase();
  if (lower.includes("abcde")) {
    return {
      status: "example-url",
      error: "Supabase URL 설정을 확인해주세요."
    };
  }
  if (lower.includes("/rest/v1/")) {
    return {
      status: "contains-rest-v1",
      error: "Supabase URL 설정을 확인해주세요."
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {
      status: "invalid-format",
      error: "Supabase URL 설정을 확인해주세요."
    };
  }

  if (parsed.protocol !== "https:") {
    return {
      status: "invalid-format",
      error: "Supabase URL 설정을 확인해주세요."
    };
  }
  if (parsed.pathname && parsed.pathname !== "/") {
    return {
      status: "invalid-format",
      error: "Supabase URL 설정을 확인해주세요."
    };
  }

  const isSupabaseHost = /^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname);
  if (!isSupabaseHost) {
    return {
      status: "invalid-format",
      error: "Supabase URL 설정을 확인해주세요."
    };
  }

  return {
    status: "ok",
    error: null
  };
}

export const supabasePublicUrl = rawSupabaseUrl;
export const supabasePublicAnonKey = rawSupabaseAnonKey;
const supabaseUrlValidationResult = validateSupabaseUrl(rawSupabaseUrl);
export const supabaseUrlValidationStatus = supabaseUrlValidationResult.status;
export const supabaseUrlError = supabaseUrlValidationResult.error;
export const hasSupabaseAnonKey = Boolean(rawSupabaseAnonKey);

export const isSupabaseConfigured = Boolean(!supabaseUrlError && hasSupabaseAnonKey);
export const supabaseConfigMessage = supabaseUrlError
  ? supabaseUrlError
  : hasSupabaseAnonKey
    ? null
    : "클라우드 동기화 미설정";

export const supabase =
  isSupabaseConfigured
    ? createClient(rawSupabaseUrl, rawSupabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          flowType: "pkce",
          storageKey: "krx-insight-auth"
        }
      })
    : null;
