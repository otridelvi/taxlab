/** Login rate limit (PRD L-03): max 5 failed attempts per 15 minutes per email. */
export const MAX_FAILED_ATTEMPTS = 5;
export const ATTEMPT_WINDOW_MINUTES = 15;

export function attemptWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - ATTEMPT_WINDOW_MINUTES * 60 * 1000);
}

/** True when the number of recent failures already reached the limit. */
export function isLockedOut(recentFailures: number): boolean {
  return recentFailures >= MAX_FAILED_ATTEMPTS;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
