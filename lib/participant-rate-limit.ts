/** Participant login rate limit (PRD P-07, FSD §5.2): failures per device and per IP. */
export const MAX_CODE_FAILURES_PER_DEVICE = 10;
export const MAX_CODE_FAILURES_PER_IP = 300;
export const CODE_ATTEMPT_WINDOW_MINUTES = 15;

export function codeAttemptWindowStart(now: Date = new Date()): Date {
  return new Date(now.getTime() - CODE_ATTEMPT_WINDOW_MINUTES * 60 * 1000);
}

/** One whole class shares an IP, so the IP limit is much higher than the device limit. */
export function isCodeRateLimited(failures: { device: number; ip: number }): boolean {
  return failures.device >= MAX_CODE_FAILURES_PER_DEVICE || failures.ip >= MAX_CODE_FAILURES_PER_IP;
}
