"use client";

import { useEffect, useMemo } from "react";
import { REFERRAL_CODE_STORAGE_KEY } from "@/lib/storage-keys";

type BetaReferralBannerProps = {
  referralCode: string;
};

function normalizeReferralCode(value: string) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (!trimmed) return "";
  const compact = trimmed.slice(0, 64);
  return /^[a-zA-Z0-9_-]+$/.test(compact) ? compact : "";
}

export function BetaReferralBanner({ referralCode }: BetaReferralBannerProps) {
  const safeReferralCode = useMemo(() => normalizeReferralCode(referralCode), [referralCode]);

  useEffect(() => {
    if (!safeReferralCode || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(REFERRAL_CODE_STORAGE_KEY, safeReferralCode);
    } catch {
      // localStorage may be blocked in restricted contexts.
    }
  }, [safeReferralCode]);

  if (!safeReferralCode) {
    return null;
  }

  return (
    <p className="mt-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold leading-5 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-200">
      초대 링크로 방문했습니다. 로그인하면 초대한 사용자에게 Pro 리워드가 지급됩니다.
    </p>
  );
}
