export type UserPlan = "free" | "pro" | "business";

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

export function isPaidPlan(plan: UserPlan) {
  return plan === "pro" || plan === "business";
}

export function toPlanLabel(plan: UserPlan) {
  if (plan === "pro") return "Pro";
  if (plan === "business") return "Business";
  return "Free";
}
