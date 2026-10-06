export const DEFAULT_AFTER_LOGIN = "/admin";

/**
 * Only allow redirecting back to an admin page on this site after login.
 * Anything else (external URLs, protocol-relative URLs, the login page) falls
 * back to the dashboard.
 */
export function safeNextPath(next: string | null | undefined): string {
  if (!next) return DEFAULT_AFTER_LOGIN;
  if (!next.startsWith("/admin")) return DEFAULT_AFTER_LOGIN;
  if (next.startsWith("//") || next.includes("\\")) return DEFAULT_AFTER_LOGIN;
  if (next === "/admin/login" || next.startsWith("/admin/login?") || next.startsWith("/admin/login/")) {
    return DEFAULT_AFTER_LOGIN;
  }
  return next;
}
