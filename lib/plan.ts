export type UserPlan = "free" | "pro" | "business";

export type PlanResolution = {
  basePlan: UserPlan;
  effectivePlan: UserPlan;
  proTrialActive: boolean;
  proExpiresAt: string | null;
};

export const FREE_LIMITS = {
  watchlist: 5,
  holdings: 3,
  dailyReportSave: 1,
  riskTimelineItems: 3
} as const;

export function normalizeUserPlan(value: unknown): UserPlan {
  if (typeof value !== "string") return "free";
  const normalized = value.trim().toLowerCase();
  if (normalized === "pro") return "pro";
  if (normalized === "business") return "business";
  return "free";
}

function normalizeIsoDatetime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function isProTrialActive(proExpiresAt: unknown, now = Date.now()) {
  const normalized = normalizeIsoDatetime(proExpiresAt);
  if (!normalized) return false;
  const expireMs = new Date(normalized).getTime();
  return Number.isFinite(expireMs) && expireMs > now;
}

export function resolvePlanFromProfile(
  profile: { plan?: unknown; pro_expires_at?: unknown } | null | undefined,
  now = Date.now()
): PlanResolution {
  const basePlan = normalizeUserPlan(profile?.plan);
  const proExpiresAt = normalizeIsoDatetime(profile?.pro_expires_at);
  const proTrialActive = basePlan === "free" && isProTrialActive(proExpiresAt, now);
  const effectivePlan = proTrialActive ? "pro" : basePlan;

  return {
    basePlan,
    effectivePlan,
    proTrialActive,
    proExpiresAt
  };
}

export function resolveEffectivePlan(plan: unknown, proExpiresAt: unknown, now = Date.now()): UserPlan {
  return resolvePlanFromProfile({ plan, pro_expires_at: proExpiresAt }, now).effectivePlan;
}

export function isPaidPlan(plan: UserPlan) {
  return plan === "pro" || plan === "business";
}

export function toPlanLabel(plan: UserPlan) {
  if (plan === "pro") return "Pro";
  if (plan === "business") return "Business";
  return "Free";
}

export function toPlanStatusLabel(plan: PlanResolution | UserPlan) {
  if (typeof plan === "string") {
    return toPlanLabel(plan);
  }
  if (plan.proTrialActive) {
    return "Pro 체험중";
  }
  return toPlanLabel(plan.effectivePlan);
}
