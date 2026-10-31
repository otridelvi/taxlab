import "server-only";
import { dateBounds, type ExportFilter } from "@/lib/export/filter";
import type { ContactRecord, ExportBundle, ExportEvent, ExportParticipant } from "@/lib/export/build";
import type { ParticipantStatus } from "./types";
import { serviceClient } from "./service";

/** Reads for the export and the participant detail page (PLAN-07 D-3). Service role: callers check permission first. */

const CHUNK = 40;
const PAGE = 1000;

const PARTICIPANT_COLUMNS =
  "id, access_code, cell, status, content_version, flow_version, consent_at, started_at, finished_at, timed_out, timed_out_at_page, current_page, current_round, batches(label)";

type ParticipantRow = {
  id: string;
  access_code: string;
  cell: number;
  status: ParticipantStatus;
  content_version: string | null;
  flow_version: "A" | "B" | null;
  consent_at: string | null;
  started_at: string | null;
  finished_at: string | null;
  timed_out: boolean;
  timed_out_at_page: string | null;
  current_page: string | null;
  current_round: number | null;
  batches: { label: string | null } | { label: string | null }[] | null;
};

function toParticipant(r: ParticipantRow): ExportParticipant & { currentPage: string | null; currentRound: number | null } {
  const batch = Array.isArray(r.batches) ? r.batches[0] : r.batches;
  return {
    id: r.id,
    code: r.access_code,
    cell: r.cell,
    batch: batch?.label ?? null,
    status: r.status,
    content_version: r.content_version,
    flow_version: r.flow_version,
    consent_at: r.consent_at,
    started_at: r.started_at,
    finished_at: r.finished_at,
    timed_out: r.timed_out,
    timed_out_at_page: r.timed_out_at_page,
    currentPage: r.current_page,
    currentRound: r.current_round,
  };
}

type Filterable<Q> = {
  eq(column: string, value: string): Q;
  in(column: string, values: readonly (string | number)[]): Q;
  gte(column: string, value: string): Q;
  lt(column: string, value: string): Q;
};

function applyFilter<Q extends Filterable<Q>>(query: Q, f: ExportFilter): Q {
  let q = query.in("cell", f.cells).in("status", f.statuses);
  if (f.batch) q = q.eq("batch_id", f.batch);
  if (f.code) q = q.eq("access_code", f.code);
  const { fromIso, toIso } = dateBounds(f);
  if (fromIso) q = q.gte("started_at", fromIso);
  if (toIso) q = q.lt("started_at", toIso);
  return q;
}

export async function countExportParticipants(f: ExportFilter): Promise<number> {
  const query = serviceClient().from("participants").select("id", { count: "exact", head: true });
  const { count, error } = await applyFilter(query, f);
  if (error) throw new Error(`Failed to count export rows: ${error.message}`);
  return count ?? 0;
}

export async function listExportParticipants(f: ExportFilter): Promise<ExportParticipant[]> {
  const out: ExportParticipant[] = [];
  for (let from = 0; ; from += PAGE) {
    const query = serviceClient().from("participants").select(PARTICIPANT_COLUMNS);
    const { data, error } = await applyFilter(query, f)
      .order("access_code", { ascending: true })
      .range(from, from + PAGE - 1);
    if (error) throw new Error(`Failed to list export participants: ${error.message}`);
    const rows = (data ?? []) as unknown as ParticipantRow[];
    out.push(...rows.map(toParticipant));
    if (rows.length < PAGE) break;
  }
  return out;
}

const chunks = <T>(list: T[], size = CHUNK): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
};

export async function loadResponses(ids: string[]): Promise<Map<string, Record<string, unknown>>> {
  const map = new Map<string, Record<string, unknown>>();
  for (const part of chunks(ids)) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await serviceClient()
        .from("responses")
        .select("participant_id, item_key, value")
        .in("participant_id", part)
        .order("participant_id")
        .order("item_key")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Failed to read responses: ${error.message}`);
      for (const r of data ?? []) {
        const bag = map.get(r.participant_id) ?? {};
        bag[r.item_key] = r.value;
        map.set(r.participant_id, bag);
      }
      if ((data ?? []).length < PAGE) break;
    }
  }
  return map;
}

export async function loadEvents(ids: string[]): Promise<Map<string, ExportEvent[]>> {
  const map = new Map<string, ExportEvent[]>();
  for (const part of chunks(ids, 10)) {
    for (let from = 0; ; from += PAGE) {
      const { data, error } = await serviceClient()
        .from("events")
        .select("id, participant_id, seq, source, type, target, round, page_id, client_ts, duration_ms, meta")
        .in("participant_id", part)
        .order("participant_id")
        .order("client_ts")
        .order("id")
        .range(from, from + PAGE - 1);
      if (error) throw new Error(`Failed to read events: ${error.message}`);
      for (const e of data ?? []) {
        const list = map.get(e.participant_id) ?? [];
        list.push({
          seq: e.seq,
          source: e.source,
          type: e.type,
          target: e.target,
          round: e.round,
          page_id: e.page_id,
          ts: e.client_ts,
          duration_ms: e.duration_ms,
          meta: (e.meta as Record<string, unknown> | null) ?? null,
        });
        map.set(e.participant_id, list);
      }
      if ((data ?? []).length < PAGE) break;
    }
  }
  return map;
}

export async function loadContacts(ids: string[]): Promise<Map<string, ContactRecord>> {
  const map = new Map<string, ContactRecord>();
  for (const part of chunks(ids)) {
    const { data, error } = await serviceClient()
      .from("contacts")
      .select("participant_id, name, email, ewallet, phone")
      .in("participant_id", part);
    if (error) throw new Error(`Failed to read contacts: ${error.message}`);
    for (const c of data ?? []) map.set(c.participant_id, { name: c.name, email: c.email, ewallet: c.ewallet, phone: c.phone });
  }
  return map;
}

export async function loadBundle(f: ExportFilter, withEvents = true): Promise<ExportBundle> {
  const participants = await listExportParticipants(f);
  const ids = participants.map((p) => p.id);
  const [responses, events] = await Promise.all([loadResponses(ids), withEvents ? loadEvents(ids) : Promise.resolve(new Map<string, ExportEvent[]>())]);
  return { participants, responses, events };
}

export async function batchLabelOf(batchId: string | null): Promise<string | null> {
  if (!batchId) return null;
  const { data } = await serviceClient().from("batches").select("label").eq("id", batchId).maybeSingle();
  return data?.label ?? null;
}

/** One participant by access code, for the detail page. Never reads `contacts` (DT-08). */
export async function getParticipantByCode(code: string) {
  const { data, error } = await serviceClient()
    .from("participants")
    .select(PARTICIPANT_COLUMNS)
    .eq("access_code", code)
    .maybeSingle();
  if (error) throw new Error(`Failed to read participant: ${error.message}`);
  return data ? toParticipant(data as unknown as ParticipantRow) : null;
}
