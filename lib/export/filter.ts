import { z } from "zod";
import type { ParticipantStatus } from "@/lib/db/types";
import { STATUS_LABELS } from "@/lib/participants";

/** Filter shared by all export cards (FSD-Admin §6.6, PLAN-07 D-6). Pure: safe in the browser too. */
export type ExportFilter = {
  cells: number[];
  statuses: ParticipantStatus[];
  batch: string | null;
  /** YYYY-MM-DD (WIB), on `started_at`; empty = no bound. */
  from: string | null;
  to: string | null;
  /** One access code (event log of a single participant, from the detail page). */
  code: string | null;
};

export const ALL_CELLS = [1, 2, 3, 4];
const ALL_STATUSES = Object.keys(STATUS_LABELS) as ParticipantStatus[];
export const DEFAULT_FILTER: ExportFilter = {
  cells: ALL_CELLS,
  statuses: ["completed"],
  batch: null,
  from: null,
  to: null,
  code: null,
};

const dateText = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

function listOf(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.map(String);
  if (typeof raw === "string") return raw.split(",").map((s) => s.trim()).filter(Boolean);
  return [];
}

type RawFilter = {
  cells?: unknown;
  statuses?: unknown;
  batch?: unknown;
  from?: unknown;
  to?: unknown;
  code?: unknown;
};

/** Cleans a raw filter (query string or JSON body); anything invalid falls back to the default. */
export function normalizeFilter(raw: RawFilter | null | undefined): ExportFilter {
  const r = raw ?? {};
  const cells = [...new Set(listOf(r.cells).map(Number).filter((n) => ALL_CELLS.includes(n)))].sort();
  const statuses = [...new Set(listOf(r.statuses).filter((s): s is ParticipantStatus => (ALL_STATUSES as string[]).includes(s)))];
  const batch = typeof r.batch === "string" && z.uuid().safeParse(r.batch).success ? r.batch : null;
  const from = typeof r.from === "string" && dateText.safeParse(r.from).success ? r.from : null;
  const to = typeof r.to === "string" && dateText.safeParse(r.to).success ? r.to : null;
  const code = typeof r.code === "string" && /^TX-[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(r.code.trim().toUpperCase()) ? r.code.trim().toUpperCase() : null;
  return {
    cells: cells.length ? cells : DEFAULT_FILTER.cells,
    statuses: statuses.length ? statuses : DEFAULT_FILTER.statuses,
    batch,
    from,
    to,
    code,
  };
}

export function filterFromParams(params: URLSearchParams): ExportFilter {
  return normalizeFilter({
    cells: params.get("cell"),
    statuses: params.get("status"),
    batch: params.get("batch"),
    from: params.get("from"),
    to: params.get("to"),
    code: params.get("code"),
  });
}

/** Query string for a filter: only what differs from "everything" is written. */
export function filterToParams(f: ExportFilter): URLSearchParams {
  const p = new URLSearchParams();
  p.set("cell", f.cells.join(","));
  p.set("status", f.statuses.join(","));
  if (f.batch) p.set("batch", f.batch);
  if (f.from) p.set("from", f.from);
  if (f.to) p.set("to", f.to);
  if (f.code) p.set("code", f.code);
  return p;
}

/** Time bounds of the date range as ISO instants (WIB days; `to` is inclusive of that day). */
export function dateBounds(f: ExportFilter): { fromIso: string | null; toIso: string | null } {
  const fromIso = f.from ? new Date(`${f.from}T00:00:00+07:00`).toISOString() : null;
  const toIso = f.to ? new Date(new Date(`${f.to}T00:00:00+07:00`).getTime() + 24 * 3600_000).toISOString() : null;
  return { fromIso, toIso };
}

/** One line for the XLSX info sheet. */
export function describeFilter(f: ExportFilter, batchLabel?: string | null): string {
  const parts = [
    `Sel ${f.cells.join(", ")}`,
    `status: ${f.statuses.map((s) => STATUS_LABELS[s]).join(", ")}`,
    `batch: ${f.batch ? (batchLabel ?? f.batch) : "semua"}`,
    `tanggal mulai: ${f.from ?? "…"} s/d ${f.to ?? "…"}`,
  ];
  if (f.code) parts.push(`kode: ${f.code}`);
  return parts.join(" · ");
}

export const contactsBodySchema = z.object({
  filter: z.record(z.string(), z.unknown()).optional(),
  acknowledged: z.boolean().optional(),
});
