import { z } from "zod";
import type { ParticipantStatus } from "@/lib/db/types";

export const STATUS_LABELS: Record<ParticipantStatus, string> = {
  not_started: "Belum mulai",
  in_progress: "Sedang mengerjakan",
  completed: "Selesai",
  timed_out: "Waktu habis",
  cancelled: "Dibatalkan",
};
export const STATUSES = Object.keys(STATUS_LABELS) as ParticipantStatus[];

export const PAGE_SIZES = [25, 50, 100] as const;
export const SORTS = ["started_at_desc", "created_at_desc", "code_asc"] as const;
export type ParticipantSort = (typeof SORTS)[number];

/** Filters for the participant list, read from the query string (FSD-Admin §6.3). */
export type ParticipantFilters = {
  q: string;
  cells: number[];
  status: ParticipantStatus | null;
  batch: string | null;
  page: number;
  size: (typeof PAGE_SIZES)[number];
  sort: ParticipantSort;
};

type RawParams = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

export function parseParticipantFilters(params: RawParams): ParticipantFilters {
  const cells = first(params.cell)
    .split(",")
    .map(Number)
    .filter((n) => [1, 2, 3, 4].includes(n));
  const status = first(params.status);
  const size = Number(first(params.size));
  const page = Math.max(1, Math.floor(Number(first(params.page)) || 1));
  const sort = first(params.sort);
  const batch = first(params.batch);
  return {
    q: first(params.q).trim().slice(0, 20),
    cells: [...new Set(cells)].sort(),
    status: (STATUSES as string[]).includes(status) ? (status as ParticipantStatus) : null,
    batch: z.uuid().safeParse(batch).success ? batch : null,
    page,
    size: (PAGE_SIZES as readonly number[]).includes(size) ? (size as ParticipantFilters["size"]) : 25,
    sort: (SORTS as readonly string[]).includes(sort) ? (sort as ParticipantSort) : "started_at_desc",
  };
}

/** Query string for a filter set, dropping defaults. */
export function filtersToQuery(f: Partial<ParticipantFilters>): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.cells && f.cells.length) p.set("cell", f.cells.join(","));
  if (f.status) p.set("status", f.status);
  if (f.batch) p.set("batch", f.batch);
  if (f.size && f.size !== 25) p.set("size", String(f.size));
  if (f.sort && f.sort !== "started_at_desc") p.set("sort", f.sort);
  if (f.page && f.page > 1) p.set("page", String(f.page));
  const s = p.toString();
  return s ? `?${s}` : "";
}

export function loginLink(baseUrl: string, code: string): string {
  return `${baseUrl.replace(/\/+$/, "")}/login?code=${encodeURIComponent(code)}`;
}

// ---------------------------------------------------------------- request bodies
export const reasonSchema = z
  .string()
  .trim()
  .min(10, "Alasan minimal 10 karakter.")
  .max(300, "Alasan maksimal 300 karakter.");

export const createBatchSchema = z
  .object({
    quantity: z.number().int().min(1).max(200),
    label: z.string().trim().max(60).optional().default(""),
    mode: z.enum(["random", "manual"]),
    cell: z.number().int().min(1).max(4).nullable().optional(),
  })
  .refine((v) => v.mode !== "manual" || v.cell != null, { message: "Pilih sel tujuan.", path: ["cell"] });

export const changeCellSchema = z.object({ cell: z.number().int().min(1).max(4), reason: reasonSchema });
export const deactivateSchema = z.object({ reason: reasonSchema });

// ---------------------------------------------------------------- export of codes
export type CodeRow = { code: string; batch: string; loginLink: string };

function csvCell(value: string): string {
  return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** UTF-8 CSV with BOM (Excel friendly). Never contains the cell (G-08). */
export function codesToCsv(rows: CodeRow[]): string {
  const lines = [["code", "batch", "login_link"], ...rows.map((r) => [r.code, r.batch, r.loginLink])];
  return "﻿" + lines.map((l) => l.map(csvCell).join(",")).join("\n") + "\n";
}

/** File name per FSD-Admin §8: [SIT_]taxlab_codes_YYYY-MM-DD_HHmm.ext (WIB). */
export function exportFileName(
  kind: string,
  ext: string,
  env: "sit" | "production",
  now = new Date(),
): string {
  const wib = new Date(now.getTime() + 7 * 60 * 60 * 1000).toISOString();
  const stamp = `${wib.slice(0, 10)}_${wib.slice(11, 13)}${wib.slice(14, 16)}`;
  return `${env === "sit" ? "SIT_" : ""}taxlab_${kind}_${stamp}.${ext}`;
}
