/** Live monitor of participants in progress (FSD-Admin §10, PLAN-07 D-10). Pure. */

export const INACTIVE_AFTER_MS = 5 * 60 * 1000;

/** Pages after the timer stopped: no countdown there. */
const AFTER_TIMER = new Set([
  "mc_choice",
  "mc_likert",
  "questionnaire",
  "demographics",
  "debriefing",
  "finish",
  "time_up",
]);

export type LiveInput = {
  id: string;
  code: string;
  cell: number;
  currentPage: string | null;
  currentRound: number | null;
  taskEndAt: string | null;
  startedAt: string | null;
  lastSeenAt: string | null;
  lastEventAt: string | null;
};

export type LiveRow = {
  id: string;
  code: string;
  cell: number;
  page: string | null;
  round: number | null;
  /** Seconds left on the timer; null when it is not running. */
  remainingSec: number | null;
  lastActiveAt: string | null;
  inactive: boolean;
};

export function toLiveRow(p: LiveInput, now: number): LiveRow {
  const times = [p.lastSeenAt, p.lastEventAt, p.startedAt]
    .map((t) => (t ? Date.parse(t) : NaN))
    .filter((t) => Number.isFinite(t));
  const last = times.length ? Math.max(...times) : null;
  const timerRunning = p.taskEndAt && p.currentPage && !AFTER_TIMER.has(p.currentPage);
  return {
    id: p.id,
    code: p.code,
    cell: p.cell,
    page: p.currentPage,
    round: p.currentRound,
    remainingSec: timerRunning ? Math.max(0, Math.round((Date.parse(p.taskEndAt as string) - now) / 1000)) : null,
    lastActiveAt: last === null ? null : new Date(last).toISOString(),
    inactive: last === null ? true : now - last > INACTIVE_AFTER_MS,
  };
}

/** Longest idle first; the rest by code. */
export function sortLive(rows: LiveRow[]): LiveRow[] {
  return [...rows].sort((a, b) => Number(b.inactive) - Number(a.inactive) || a.code.localeCompare(b.code));
}

/** Target per cell (D-10): whole number 1–500. */
export function parseTarget(value: unknown): number | null {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 500 ? value : null;
}
