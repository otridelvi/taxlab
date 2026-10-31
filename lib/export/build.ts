import { DATASET_COLUMNS, CODEBOOK_HEADERS, buildCodebook } from "@/lib/codebook";
import { computeMetrics, isoWib, type MetricEvent, type MetricParticipant } from "@/lib/metrics";
import type { Row } from "./files";

/** Turns the rows read from the database into export rows (pure, unit-tested). */

export type ExportParticipant = MetricParticipant & { id: string };
export type ExportEvent = MetricEvent & { seq: number | null; source: string };

export type ExportBundle = {
  participants: ExportParticipant[];
  responses: Map<string, Record<string, unknown>>;
  events: Map<string, ExportEvent[]>;
};

export const DATASET_COLS = DATASET_COLUMNS;

export function buildDatasetRows(bundle: ExportBundle): Row[] {
  return bundle.participants.map(
    (p) =>
      computeMetrics({
        participant: p,
        responses: bundle.responses.get(p.id) ?? {},
        events: bundle.events.get(p.id) ?? [],
      }).row,
  );
}

export const EVENT_COLS = ["code", "cell", "seq", "round", "ts", "type", "target", "page_id", "duration_ms"] as const;

export function buildEventRows(bundle: ExportBundle): Row[] {
  const rows: Row[] = [];
  for (const p of bundle.participants) {
    for (const e of bundle.events.get(p.id) ?? []) {
      rows.push({
        code: p.code,
        cell: p.cell,
        seq: e.seq,
        round: e.round,
        ts: isoWib(e.ts),
        type: e.type,
        target: e.target,
        page_id: e.page_id,
        duration_ms: e.duration_ms,
      });
    }
  }
  return rows;
}

export const CONTACT_COLS = ["code", "batch", "status", "name", "email", "ewallet", "phone"] as const;

export type ContactRecord = { name: string | null; email: string | null; ewallet: string | null; phone: string | null };

export function buildContactRows(
  participants: ExportParticipant[],
  contacts: Map<string, ContactRecord>,
  ewalletLabel: (value: string) => string,
): Row[] {
  const rows: Row[] = [];
  for (const p of participants) {
    const c = contacts.get(p.id);
    if (!c || (!c.name && !c.email && !c.ewallet && !c.phone)) continue;
    rows.push({
      code: p.code,
      batch: p.batch,
      status: p.status,
      name: c.name,
      email: c.email,
      ewallet: c.ewallet ? ewalletLabel(c.ewallet) : null,
      phone: c.phone,
    });
  }
  return rows;
}

export function buildCodebookRows(): Row[] {
  return buildCodebook().map((v) => ({
    variable: v.name,
    group: v.group,
    round: v.round,
    description: v.description,
    type: v.type,
    values_unit: v.values,
    source: v.source,
  }));
}

export { CODEBOOK_HEADERS };
