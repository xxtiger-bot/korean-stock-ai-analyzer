import { createClient } from "@supabase/supabase-js";

const rawSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
const rawSupabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ?? "";

function validateSupabaseUrl(url: string) {
  if (!url) return "Supabase URL 설정을 확인해주세요.";

  const lower = url.toLowerCase();
  if (lower.includes("abcde")) return "Supabase URL 설정을 확인해주세요.";
  if (lower.includes("/rest/v1/")) return "Supabase URL 설정을 확인해주세요.";

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return "Supabase URL 설정을 확인해주세요.";
  }

  if (parsed.protocol !== "https:") return "Supabase URL 설정을 확인해주세요.";
  if (parsed.pathname && parsed.pathname !== "/") {
    return "Supabase URL 설정을 확인해주세요.";
  }

  const isSupabaseHost = /^[a-z0-9-]+\.supabase\.co$/i.test(parsed.hostname);
  if (!isSupabaseHost) return "Supabase URL 설정을 확인해주세요.";

  return null;
}

export const supabasePublicUrl = rawSupabaseUrl;
export const supabasePublicAnonKey = rawSupabaseAnonKey;
export const supabaseUrlError = validateSupabaseUrl(rawSupabaseUrl);
export const hasSupabaseAnonKey = Boolean(rawSupabaseAnonKey);

export const isSupabaseConfigured = Boolean(!supabaseUrlError && hasSupabaseAnonKey);
export const supabaseConfigMessage = supabaseUrlError
  ? supabaseUrlError
  : hasSupabaseAnonKey
    ? null
    : "클라우드 동기화 미설정";

export const supabase =
  isSupabaseConfigured
    ? createClient(rawSupabaseUrl, rawSupabaseAnonKey)
    : null;
