import "server-only";
import { dateBounds, type ExportFilter } from "@/lib/export/filter";
import { toLiveRow, sortLive, type LiveRow } from "@/lib/live";
import type { Json } from "./types";
import { serviceClient } from "./service";

/** Reads and writes for PLAN-07b. Service role: callers check permission first. */

export async function getParticipantCode(id: string): Promise<string | null> {
  const { data, error } = await serviceClient().from("participants").select("access_code").eq("id", id).maybeSingle();
  if (error) throw new Error(`Failed to load participant: ${error.message}`);
  return data?.access_code ?? null;
}

export async function resetSession(
  adminId: string,
  participantId: string,
  reason: string,
): Promise<"ok" | "not_found" | "not_resettable"> {
  const { data, error } = await serviceClient().rpc("reset_session", {
    p_participant_id: participantId,
    p_admin_id: adminId,
    p_reason: reason,
  });
  if (error) throw new Error(`reset_session failed: ${error.message}`);
  return data === "ok" || data === "not_found" ? data : "not_resettable";
}

/** Deletes incentive contacts (all, or one batch). Returns rows deleted; audit is written in the same transaction. */
export async function deleteContacts(adminId: string, batchId: string | null): Promise<number> {
  const { data, error } = await serviceClient().rpc("delete_contacts", { p_admin_id: adminId, p_batch_id: batchId });
  if (error) throw new Error(`delete_contacts failed: ${error.message}`);
  return data ?? 0;
}

export async function getTarget(): Promise<number> {
  const { data, error } = await serviceClient().from("settings").select("value").eq("key", "target_per_cell").maybeSingle();
  if (error) throw new Error(`Failed to load target: ${error.message}`);
  const n = Number(data?.value);
  return Number.isFinite(n) ? n : 30;
}

export async function setTarget(adminId: string, value: number): Promise<void> {
  const { error } = await serviceClient()
    .from("settings")
    .upsert({ key: "target_per_cell", value, updated_by: adminId, updated_at: new Date().toISOString() });
  if (error) throw new Error(`Failed to save target: ${error.message}`);
}

/** Participants currently in progress with their latest activity (D-10). */
export async function listLive(now = Date.now()): Promise<LiveRow[]> {
  const db = serviceClient();
  const { data, error } = await db
    .from("participants")
    .select("id, access_code, cell, current_page, current_round, task_end_at, started_at, last_seen_at")
    .eq("status", "in_progress");
  if (error) throw new Error(`Failed to load live participants: ${error.message}`);
  const rows = data ?? [];
  const lastEvent = new Map<string, string>();
  if (rows.length) {
    const { data: ev, error: evError } = await db
      .from("events")
      .select("participant_id, received_at")
      .in("participant_id", rows.map((r) => r.id))
      .gte("received_at", new Date(now - 60 * 60 * 1000).toISOString())
      .order("received_at", { ascending: false })
      .limit(2000);
    if (evError) throw new Error(`Failed to load recent events: ${evError.message}`);
    for (const e of ev ?? []) if (!lastEvent.has(e.participant_id)) lastEvent.set(e.participant_id, e.received_at);
  }
  return sortLive(
    rows.map((r) =>
      toLiveRow(
        {
          id: r.id,
          code: r.access_code,
          cell: r.cell,
          currentPage: r.current_page,
          currentRound: r.current_round,
          taskEndAt: r.task_end_at,
          startedAt: r.started_at,
          lastSeenAt: r.last_seen_at,
          lastEventAt: lastEvent.get(r.id) ?? null,
        },
        now,
      ),
    ),
  );
}

// ------------------------------------------------------------------ audit log
export const AUDIT_PAGE_SIZE = 50;

export type AuditFilter = {
  action: string | null;
  admin: string | null;
  code: string | null;
  from: string | null;
  to: string | null;
  page: number;
};

export type AuditEntry = {
  id: number;
  at: string;
  action: string;
  adminName: string | null;
  code: string | null;
  detail: Json;
};

export async function listAudit(f: AuditFilter): Promise<{ rows: AuditEntry[]; total: number }> {
  const db = serviceClient();
  let query = db
    .from("audit_logs")
    .select("id, admin_id, action, participant_id, detail, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .order("id", { ascending: false });
  if (f.action) query = query.eq("action", f.action);
  if (f.admin) query = query.eq("admin_id", f.admin);
  if (f.code) {
    const { data } = await db.from("participants").select("id").eq("access_code", f.code).maybeSingle();
    if (!data) return { rows: [], total: 0 };
    query = query.eq("participant_id", data.id);
  }
  const { fromIso, toIso } = dateBounds({ from: f.from, to: f.to } as ExportFilter);
  if (fromIso) query = query.gte("created_at", fromIso);
  if (toIso) query = query.lt("created_at", toIso);

  const start = (f.page - 1) * AUDIT_PAGE_SIZE;
  const { data, error, count } = await query.range(start, start + AUDIT_PAGE_SIZE - 1);
  if (error) throw new Error(`Failed to load audit log: ${error.message}`);
  const rows = data ?? [];

  const adminIds = [...new Set(rows.map((r) => r.admin_id).filter((v): v is string => !!v))];
  const participantIds = [...new Set(rows.map((r) => r.participant_id).filter((v): v is string => !!v))];
  const [admins, participants] = await Promise.all([
    adminIds.length ? db.from("admins").select("id, name").in("id", adminIds) : Promise.resolve({ data: [], error: null }),
    participantIds.length
      ? db.from("participants").select("id, access_code").in("id", participantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (admins.error) throw new Error(`Failed to load admins: ${admins.error.message}`);
  if (participants.error) throw new Error(`Failed to load participants: ${participants.error.message}`);
  const adminName = new Map((admins.data ?? []).map((a) => [a.id, a.name]));
  const codeOf = new Map((participants.data ?? []).map((p) => [p.id, p.access_code]));

  return {
    total: count ?? 0,
    rows: rows.map((r) => ({
      id: r.id,
      at: r.created_at,
      action: r.action,
      adminName: r.admin_id ? (adminName.get(r.admin_id) ?? null) : null,
      code: r.participant_id ? (codeOf.get(r.participant_id) ?? null) : null,
      detail: r.detail,
    })),
  };
}

export async function listAdminNames(): Promise<{ id: string; name: string }[]> {
  const { data, error } = await serviceClient().from("admins").select("id, name").order("name");
  if (error) throw new Error(`Failed to load admins: ${error.message}`);
  return data ?? [];
}
