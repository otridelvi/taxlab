import "server-only";
import type { FlowVersion, Json } from "./types";
import { serviceClient } from "./service";

/** Data access for the participant app (PLAN-03). Writes go through Postgres functions. */

export type ParticipantSettings = {
  flowVersion: FlowVersion;
  timerMinutes: number;
  timerWarningMinutes: number;
};

let settingsCache: { at: number; value: ParticipantSettings } | undefined;
const SETTINGS_TTL_MS = 30_000;

export async function getParticipantSettings(): Promise<ParticipantSettings> {
  if (settingsCache && Date.now() - settingsCache.at < SETTINGS_TTL_MS) return settingsCache.value;
  const { data, error } = await serviceClient()
    .from("settings")
    .select("key, value")
    .in("key", ["flow_version", "timer_minutes", "timer_warning_minutes"]);
  if (error) throw new Error(`Failed to load settings: ${error.message}`);
  const map = new Map((data ?? []).map((r) => [r.key, r.value]));
  const flow = map.get("flow_version");
  const value: ParticipantSettings = {
    flowVersion: flow === "B" ? "B" : "A",
    timerMinutes: Number(map.get("timer_minutes") ?? 40) || 40,
    timerWarningMinutes: Number(map.get("timer_warning_minutes") ?? 5) || 5,
  };
  settingsCache = { at: Date.now(), value };
  return value;
}

// ---------------------------------------------------------------- login
export async function countRecentCodeFailures(deviceId: string | null, ip: string | null, since: Date) {
  const db = serviceClient();
  const count = async (column: "device_id" | "ip", value: string | null) => {
    if (!value) return 0;
    const { count: n, error } = await db
      .from("code_attempts")
      .select("id", { count: "exact", head: true })
      .eq(column, value)
      .eq("success", false)
      .gte("created_at", since.toISOString());
    if (error) throw new Error(`Failed to count code attempts: ${error.message}`);
    return n ?? 0;
  };
  const [device, byIp] = await Promise.all([count("device_id", deviceId), count("ip", ip)]);
  return { device, ip: byIp };
}

export async function recordCodeAttempt(deviceId: string | null, ip: string | null, success: boolean) {
  const { error } = await serviceClient().from("code_attempts").insert({ device_id: deviceId, ip, success });
  if (error) console.error(`Failed to record code attempt: ${error.message}`);
}

export type LoginResult =
  "started" | "resumed" | "not_found" | "cancelled" | "completed" | "closed" | "consent_required";

export async function participantLogin(args: {
  code: string;
  sessionId: string;
  consentAt: Date | null;
  flowVersion: FlowVersion;
  contentVersion: string;
  firstPage: string;
}): Promise<{ result: LoginResult; participantId: string | null; page: string | null }> {
  const { data, error } = await serviceClient().rpc("participant_login", {
    p_code: args.code,
    p_session_id: args.sessionId,
    p_consent_at: args.consentAt ? args.consentAt.toISOString() : null,
    p_flow_version: args.flowVersion,
    p_content_version: args.contentVersion,
    p_first_page: args.firstPage,
  });
  if (error) throw new Error(`participant_login failed: ${error.message}`);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) throw new Error("participant_login returned no row");
  return {
    result: row.out_result as LoginResult,
    participantId: row.out_participant_id,
    page: row.out_page,
  };
}

// ---------------------------------------------------------------- state
export type ParticipantState = {
  id: string;
  accessCode: string;
  cell: number;
  status: string;
  sessionId: string | null;
  flowVersion: FlowVersion | null;
  currentPage: string | null;
  currentRound: number | null;
  taskDeadline: string | null;
  taskEndAt: string | null;
  timedOut: boolean;
};

export async function getParticipantState(id: string): Promise<ParticipantState | null> {
  const { data, error } = await serviceClient()
    .from("participants")
    .select(
      "id, access_code, cell, status, session_id, flow_version, current_page, current_round, task_deadline, task_end_at, timed_out",
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Failed to load participant: ${error.message}`);
  if (!data) return null;
  return {
    id: data.id,
    accessCode: data.access_code,
    cell: data.cell,
    status: data.status,
    sessionId: data.session_id,
    flowVersion: data.flow_version,
    currentPage: data.current_page,
    currentRound: data.current_round,
    taskDeadline: data.task_deadline,
    taskEndAt: data.task_end_at,
    timedOut: data.timed_out,
  };
}

/** Saved values for the given item keys (responses + contact fields as contact_<field>). */
export async function getSavedValues(
  participantId: string,
  keys: string[],
): Promise<Record<string, unknown>> {
  if (keys.length === 0) return {};
  const db = serviceClient();
  const responseKeys = keys.filter((k) => !k.startsWith("contact_"));
  const wantsContact = keys.some((k) => k.startsWith("contact_"));
  const [responses, contact] = await Promise.all([
    responseKeys.length
      ? db
          .from("responses")
          .select("item_key, value")
          .eq("participant_id", participantId)
          .in("item_key", responseKeys)
      : Promise.resolve({ data: [], error: null }),
    wantsContact
      ? db
          .from("contacts")
          .select("name, email, ewallet, phone")
          .eq("participant_id", participantId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);
  if (responses.error) throw new Error(`Failed to load responses: ${responses.error.message}`);
  if (contact.error) throw new Error(`Failed to load contact: ${contact.error.message}`);
  const values: Record<string, unknown> = {};
  for (const r of responses.data ?? []) values[r.item_key] = r.value;
  if (contact.data) {
    for (const [field, v] of Object.entries(contact.data)) if (v !== null) values[`contact_${field}`] = v;
  }
  return values;
}

// ---------------------------------------------------------------- writes
export type WriteResult = "ok" | "not_active" | "session_replaced" | "stale_page" | "expired" | "not_expired";

export async function saveResponses(args: {
  participantId: string;
  sessionId: string;
  page: string;
  items: Record<string, unknown>;
  contact: Record<string, string>;
}): Promise<WriteResult> {
  const { data, error } = await serviceClient().rpc("save_responses", {
    p_participant_id: args.participantId,
    p_session_id: args.sessionId,
    p_page: args.page,
    p_items: args.items as Json,
    p_contact: args.contact as Json,
  });
  if (error) throw new Error(`save_responses failed: ${error.message}`);
  return data as WriteResult;
}

export async function advanceStep(args: {
  participantId: string;
  sessionId: string;
  from: string;
  items: Record<string, unknown>;
  contact: Record<string, string>;
  reason: "next" | "timer_expired";
  nextPage: string;
  nextRound: number | null;
  timerStart: boolean;
  timerEnd: boolean;
  timerMinutes: number;
}): Promise<WriteResult> {
  const { data, error } = await serviceClient().rpc("advance_step", {
    p_participant_id: args.participantId,
    p_session_id: args.sessionId,
    p_from: args.from,
    p_items: args.items as Json,
    p_contact: args.contact as Json,
    p_reason: args.reason,
    p_next_page: args.nextPage,
    p_next_round: args.nextRound,
    p_timer_start: args.timerStart,
    p_timer_end: args.timerEnd,
    p_timer_minutes: args.timerMinutes,
  });
  if (error) throw new Error(`advance_step failed: ${error.message}`);
  return data as WriteResult;
}

export async function finishSession(participantId: string, sessionId: string, finishPage: string) {
  const { data, error } = await serviceClient().rpc("finish_session", {
    p_participant_id: participantId,
    p_session_id: sessionId,
    p_finish_page: finishPage,
  });
  if (error) throw new Error(`finish_session failed: ${error.message}`);
  return data as "ok" | "not_active" | "session_replaced" | "not_at_finish";
}

export type ClientEvent = {
  seq: number;
  type: string;
  target: string | null;
  round: number | null;
  page_id: string | null;
  client_ts: string;
  duration_ms: number | null;
  meta: Json | null;
};

/** Inserts browser events; duplicates (same participant, session, seq) are ignored. */
export async function insertEvents(participantId: string, sessionId: string, events: ClientEvent[]) {
  if (events.length === 0) return 0;
  const rows = events.map((e) => ({
    ...e,
    participant_id: participantId,
    session_id: sessionId,
    source: "client" as const,
  }));
  const { error } = await serviceClient()
    .from("events")
    .upsert(rows, { onConflict: "participant_id,session_id,seq", ignoreDuplicates: true });
  if (error) throw new Error(`Failed to insert events: ${error.message}`);
  return rows.length;
}

/**
 * Case numbers (1–14) whose detail the participant opened in a round (events `case_open`),
 * so the "Sudah dibuka" mark survives a refresh or resume (PLAN-04 D-6).
 */
export async function getOpenedCases(participantId: string, round: 1 | 2): Promise<number[]> {
  const { data, error } = await serviceClient()
    .from("events")
    .select("target")
    .eq("participant_id", participantId)
    .eq("type", "case_open")
    .eq("round", round);
  if (error) throw new Error(`Failed to load opened cases: ${error.message}`);
  const numbers = new Set<number>();
  for (const row of data ?? []) {
    const match = /^case(\d{2})$/.exec(row.target ?? "");
    if (match) numbers.add(Number(match[1]));
  }
  return [...numbers].sort((a, b) => a - b);
}

/**
 * Documents the participant has opened with "Buka memo" / "Buka reviu" (events `doc_open`, flow B).
 * Used to show the open document after a refresh and to let Next through (PLAN-05 D-3, D-4).
 */
export async function getOpenedDocs(participantId: string): Promise<("memo" | "review")[]> {
  const { data, error } = await serviceClient()
    .from("events")
    .select("target")
    .eq("participant_id", participantId)
    .eq("type", "doc_open");
  if (error) throw new Error(`Failed to load opened documents: ${error.message}`);
  const found = new Set<"memo" | "review">();
  for (const row of data ?? []) if (row.target === "memo" || row.target === "review") found.add(row.target);
  return [...found];
}

/** Marks abandoned sessions as timed_out (FSD-Participant §6.3). Returns the number closed. */
export async function closeStaleSessions(): Promise<number> {
  const { data, error } = await serviceClient().rpc("close_stale_sessions");
  if (error) {
    console.error(`close_stale_sessions failed: ${error.message}`);
    return 0;
  }
  return data ?? 0;
}
