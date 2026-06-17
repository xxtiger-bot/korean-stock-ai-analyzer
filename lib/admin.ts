const DEFAULT_ADMIN_EMAILS = ["fengyuanxin67@gmail.com"];

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function parseAdminEmails(source: unknown) {
  if (typeof source !== "string") return [];
  return source
    .split(",")
    .map((item) => normalizeEmail(item))
    .filter(Boolean);
}

export function getAdminEmails() {
  const configured = parseAdminEmails(process.env.ADMIN_EMAILS);
  if (configured.length > 0) return configured;
  return DEFAULT_ADMIN_EMAILS.map((email) => normalizeEmail(email)).filter(Boolean);
}

export function isAdminEmail(email?: string | null): boolean {
  const normalized = normalizeEmail(email);
  if (!normalized) return false;
  return getAdminEmails().includes(normalized);
}
