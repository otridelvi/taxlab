import "server-only";
import { cookies } from "next/headers";
import type { Step } from "@/content/flow";
import { cellFactors, type Factors } from "./cell";
import { serverEnv } from "./env";
import { getFlow, getStep, TIME_UP_STEP_ID } from "./flow";
import { P_MESSAGES } from "./participant-messages";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  DEVICE_COOKIE,
  DEVICE_MAX_AGE_SECONDS,
  PARTICIPANT_COOKIE,
  PARTICIPANT_MAX_AGE_SECONDS,
  verifyParticipantToken,
  type ParticipantToken,
} from "./participant-session";
import {
  advanceStep,
  getParticipantSettings,
  getParticipantState,
  type ParticipantState,
} from "./db/participant-flow";

/** Error body, same shape as /api/admin: { error: { code, message } }. */
export function pError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return Response.json({ error: { code, message, ...extra } }, { status });
}

export type ActiveSession = {
  kind: "active";
  token: ParticipantToken;
  participant: ParticipantState;
  flow: readonly Step[];
  step: Step;
  factors: Factors;
};

export type SessionCheck =
  | { kind: "none" }
  | { kind: "replaced"; participant: ParticipantState }
  | { kind: "inactive"; participant: ParticipantState }
  | ActiveSession;

/** Reads tx_p and the participant row. Never sets cookies (usable from Server Components). */
export async function readParticipantSession(): Promise<SessionCheck> {
  const store = await cookies();
  const token = await verifyParticipantToken(
    store.get(PARTICIPANT_COOKIE)?.value,
    serverEnv().SESSION_SECRET,
  );
  if (!token) return { kind: "none" };
  const participant = await getParticipantState(token.participantId);
  if (!participant) return { kind: "none" };
  if (participant.status !== "in_progress") return { kind: "inactive", participant };
  if (participant.sessionId !== token.sessionId) return { kind: "replaced", participant };
  const flow = getFlow(participant.flowVersion);
  const step = getStep(flow, participant.currentPage);
  if (!step) throw new Error(`Unknown page "${participant.currentPage}" for participant ${participant.id}`);
  return { kind: "active", token, participant, flow, step, factors: cellFactors(participant.cell) };
}

export function isTimerRunning(p: ParticipantState): boolean {
  return Boolean(p.taskDeadline && !p.taskEndAt);
}

/** Milliseconds left on the task timer, or null when no timer is running. */
export function remainingMs(p: ParticipantState, now = Date.now()): number | null {
  if (!isTimerRunning(p)) return null;
  return Math.max(0, new Date(p.taskDeadline!).getTime() - now);
}

/**
 * When the deadline has passed, moves the participant to the time_up step
 * (FSD §6.3) and returns the refreshed session. Otherwise returns it unchanged.
 */
export async function applyTimeout(session: ActiveSession): Promise<SessionCheck> {
  const left = remainingMs(session.participant);
  if (left === null || left > 0) return session;
  const settings = await getParticipantSettings();
  const result = await advanceStep({
    participantId: session.participant.id,
    sessionId: session.token.sessionId,
    from: session.step.id,
    items: {},
    contact: {},
    reason: "timer_expired",
    nextPage: TIME_UP_STEP_ID,
    nextRound: null,
    timerStart: false,
    timerEnd: false,
    timerMinutes: settings.timerMinutes,
  });
  if (result === "ok") {
    // Build the new state here: inside a Server Component render, a second identical
    // GET through fetch would be memoized and return the old row.
    return {
      ...session,
      step: getStep(session.flow, TIME_UP_STEP_ID)!,
      participant: {
        ...session.participant,
        currentPage: TIME_UP_STEP_ID,
        currentRound: null,
        taskEndAt: session.participant.taskDeadline,
        timedOut: true,
      },
    };
  }
  // A concurrent request changed the row first: report it as replaced/stale via a fresh read.
  return readParticipantSession();
}

/** For /api/p/* handlers: the active session (after the timeout check) or an error response. */
export async function requireActiveSession(): Promise<ActiveSession | Response> {
  let session = await readParticipantSession();
  if (session.kind === "active") session = await applyTimeout(session);
  switch (session.kind) {
    case "active":
      return session;
    case "replaced":
      return pError(409, "SESSION_REPLACED", P_MESSAGES.sessionReplaced);
    case "inactive":
      return pError(409, "NOT_ACTIVE", P_MESSAGES.unauthenticated);
    default:
      return pError(401, "UNAUTHENTICATED", P_MESSAGES.unauthenticated);
  }
}

export function contentVersion(): string {
  return process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 12) || "local";
}

export function clientIp(request: Request): string | null {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null;
}

/** Parses a JSON body (also from navigator.sendBeacon); null when invalid. */
export async function readBody(request: Request): Promise<unknown> {
  try {
    return JSON.parse(await request.text());
  } catch {
    return null;
  }
}

const secureCookies = process.env.NODE_ENV === "production";

/** Route handlers only (cookies cannot be set while rendering). */
export async function setParticipantCookies(
  values: Partial<Record<"participant" | "consent" | "device", string | null>>,
) {
  const store = await cookies();
  const base = { httpOnly: true, secure: secureCookies, sameSite: "lax" as const, path: "/" };
  const entries: [string, string | null | undefined, number][] = [
    [PARTICIPANT_COOKIE, values.participant, PARTICIPANT_MAX_AGE_SECONDS],
    [CONSENT_COOKIE, values.consent, CONSENT_MAX_AGE_SECONDS],
    [DEVICE_COOKIE, values.device, DEVICE_MAX_AGE_SECONDS],
  ];
  for (const [name, value, maxAge] of entries) {
    if (value === undefined) continue;
    if (value === null) store.delete(name);
    else store.set(name, value, { ...base, maxAge });
  }
}
