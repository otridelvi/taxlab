/**
 * Tracks what the participant is reading: one case detail and one reference
 * file (menu Berkas) at a time (PLAN-04 D-7). Every open/close becomes a raw
 * event; `duration_ms` is the browser's own stopwatch, while the official
 * reading time is computed at export from the open/close pair minus
 * tab_hidden periods (FSD-Admin §7.3).
 */
import { flushEvents, track } from "./events-client";

type Opened = { target: string; startedAt: number };

let openCase: Opened | null = null;
let openRef: Opened | null = null;

export const caseTarget = (no: number) => `case${String(no).padStart(2, "0")}`;

function elapsed(since: Opened) {
  return Math.max(0, Math.round(performance.now() - since.startedAt));
}

/** Why a case or file was closed: the participant closed it, opened another, or left the page. */
export type CloseReason = "toggle" | "switch" | "leave";

/** Opens case `no`; a case that is still open is closed first (reason "switch"). */
export function startCase(no: number) {
  if (openCase) stopCase("switch");
  openCase = { target: caseTarget(no), startedAt: performance.now() };
  track("case_open", openCase.target);
  // Sent at once so "Sudah dibuka" survives an immediate refresh (the 5 s timer is too slow).
  void flushEvents();
}

export function stopCase(reason: CloseReason) {
  if (!openCase) return;
  track("case_close", openCase.target, { reason }, elapsed(openCase));
  openCase = null;
}

export function startRef(doc: string) {
  if (openRef) stopRef("switch");
  openRef = { target: doc, startedAt: performance.now() };
  track("ref_open", doc);
}

export function stopRef(reason: CloseReason) {
  if (!openRef) return;
  track("ref_close", openRef.target, { reason }, elapsed(openRef));
  openRef = null;
}

/** Closes whatever is open (Next, time up, leaving the page). Safe to call when nothing is open. */
export function closeAllReading(reason: CloseReason = "leave") {
  stopCase(reason);
  stopRef(reason);
}
