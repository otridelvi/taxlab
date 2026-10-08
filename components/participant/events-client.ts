/**
 * Browser event queue (FSD-Participant §10.1). Events get an increasing seq per
 * session, are kept in sessionStorage until the server confirms them, sent every
 * 5 s and with navigator.sendBeacon when the page is hidden. The server ignores
 * duplicates, so resending is always safe.
 */
import type { ClientEventType } from "@/lib/participant-events";

type QueuedEvent = {
  seq: number;
  type: ClientEventType;
  target: string | null;
  page_id: string | null;
  client_ts: string;
  duration_ms: number | null;
  meta: Record<string, string | number | boolean | null> | null;
};

const ENDPOINT = "/api/p/events";
const MAX_BATCH = 200;

let sessionId = "";
let nextSeq = 0;
let queue: QueuedEvent[] = [];
let currentPage: string | null = null;
let inflight: Promise<void> | null = null;

function storageKey() {
  return `tx_ev_${sessionId}`;
}

function persist() {
  try {
    sessionStorage.setItem(storageKey(), JSON.stringify({ nextSeq, queue }));
  } catch {
    // Storage full or blocked: events stay in memory only.
  }
}

export function initEvents(sid: string) {
  if (sessionId === sid) return;
  sessionId = sid;
  nextSeq = 0;
  queue = [];
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey()) ?? "null");
    if (saved && typeof saved.nextSeq === "number" && Array.isArray(saved.queue)) {
      nextSeq = saved.nextSeq;
      queue = saved.queue;
    }
  } catch {
    // Ignore unreadable storage.
  }
}

/** Returns true when the page changed (so page_view is logged once per step). */
export function setCurrentPage(page: string): boolean {
  if (currentPage === page) return false;
  currentPage = page;
  return true;
}

export function track(
  type: ClientEventType,
  target: string | null = null,
  meta: QueuedEvent["meta"] = null,
  durationMs: number | null = null,
) {
  if (!sessionId) return;
  queue.push({
    seq: nextSeq++,
    type,
    target,
    page_id: currentPage,
    client_ts: new Date().toISOString(),
    duration_ms: durationMs,
    meta,
  });
  persist();
}

/** Sends queued events. With beacon=true (page hidden/closing) it does not wait for an answer. */
export async function flushEvents(beacon = false): Promise<void> {
  if (!sessionId) return;
  // A send already under way: wait for it, so the caller knows everything queued before is delivered.
  if (!beacon && inflight) await inflight;
  if (queue.length === 0) return;
  const batch = queue.slice(0, MAX_BATCH);
  const body = JSON.stringify({ events: batch });
  if (beacon && typeof navigator.sendBeacon === "function") {
    navigator.sendBeacon(ENDPOINT, new Blob([body], { type: "application/json" }));
    return; // kept in the queue; the next normal flush confirms (duplicates are ignored)
  }
  if (inflight) return;
  const run = (async () => {
    try {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body,
        keepalive: body.length < 60_000,
      });
      // 4xx (session ended/replaced, invalid): drop the batch, it can never be accepted.
      if (res.ok || (res.status >= 400 && res.status < 500)) {
        const sent = new Set(batch.map((e) => e.seq));
        queue = queue.filter((e) => !sent.has(e.seq));
        persist();
      }
    } catch {
      // Offline: retry on the next flush.
    }
  })();
  inflight = run;
  try {
    await run;
  } finally {
    inflight = null;
  }
}
