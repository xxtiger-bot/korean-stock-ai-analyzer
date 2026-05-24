export const ADMIN_EMAIL = "fengyuanxin67@gmail.com";

export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export function isAdminEmail(email: unknown) {
  return normalizeEmail(email) === normalizeEmail(ADMIN_EMAIL);
}
