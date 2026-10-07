import "server-only";
import { generateAccessCodes, codeSearchKey } from "@/lib/access-code";
import { allocateCells, countByCell, type Cell, type CompletedPerCell } from "@/lib/allocate";
import type { ParticipantFilters } from "@/lib/participants";
import type { AssignmentMode, ParticipantStatus } from "./types";
import { serviceClient } from "./service";

export type ParticipantRow = {
  id: string;
  code: string;
  cell: number;
  batchLabel: string | null;
  status: ParticipantStatus;
  currentPage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  createdAt: string;
  /** finished − started, or now − started while in progress; null if not started. */
  durationSeconds: number | null;
};

export type BatchSummary = {
  id: string;
  label: string | null;
  quantity: number;
  mode: AssignmentMode;
  createdAt: string;
};

export async function listParticipants(
  f: ParticipantFilters,
): Promise<{ rows: ParticipantRow[]; total: number }> {
  let query = serviceClient()
    .from("participants")
    .select(
      "id, access_code, cell, status, current_page, started_at, finished_at, created_at, batches(label)",
      { count: "exact" },
    );
  const key = codeSearchKey(f.q).replace(/^TX/, "");
  if (key) query = query.ilike("code_key", `%${key}%`);
  if (f.cells.length) query = query.in("cell", f.cells);
  if (f.status) query = query.eq("status", f.status);
  if (f.batch) query = query.eq("batch_id", f.batch);

  if (f.sort === "code_asc") query = query.order("access_code", { ascending: true });
  else if (f.sort === "created_at_desc") query = query.order("created_at", { ascending: false });
  else
    query = query
      .order("started_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });

  const from = (f.page - 1) * f.size;
  const { data, error, count } = await query.range(from, from + f.size - 1);
  if (error) throw new Error(`Failed to list participants: ${error.message}`);
  const now = Date.now();
  return {
    total: count ?? 0,
    rows: (data ?? []).map((r) => ({
      id: r.id,
      code: r.access_code,
      cell: r.cell,
      batchLabel: r.batches?.label ?? null,
      status: r.status,
      currentPage: r.current_page,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      createdAt: r.created_at,
      durationSeconds: r.started_at
        ? Math.max(
            0,
            Math.round(((r.finished_at ? Date.parse(r.finished_at) : now) - Date.parse(r.started_at)) / 1000),
          )
        : null,
    })),
  };
}

export async function listBatches(limit = 100): Promise<BatchSummary[]> {
  const { data, error } = await serviceClient()
    .from("batches")
    .select("id, label, quantity, mode, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Failed to list batches: ${error.message}`);
  return (data ?? []).map((b) => ({
    id: b.id,
    label: b.label,
    quantity: b.quantity,
    mode: b.mode,
    createdAt: b.created_at,
  }));
}

export async function getCompletedPerCell(): Promise<{
  completed: CompletedPerCell;
  total: CompletedPerCell;
}> {
  const { data, error } = await serviceClient().from("v_cell_summary").select("cell, total, completed");
  if (error) throw new Error(`Failed to load cell summary: ${error.message}`);
  const completed: CompletedPerCell = { 1: 0, 2: 0, 3: 0, 4: 0 };
  const total: CompletedPerCell = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const row of data ?? []) {
    completed[row.cell as Cell] = row.completed;
    total[row.cell as Cell] = row.total;
  }
  return { completed, total };
}

export type CreatedBatch = {
  batchId: string;
  label: string | null;
  codes: string[];
  allocation: CompletedPerCell;
};

/**
 * Generates codes, allocates cells and stores everything atomically
 * (create_batch). Retries with fresh codes on a duplicate code.
 */
export async function createBatch(input: {
  adminId: string;
  quantity: number;
  label: string;
  mode: AssignmentMode;
  cell: Cell | null;
}): Promise<CreatedBatch> {
  const { completed } = await getCompletedPerCell();
  const cells = allocateCells(input.quantity, input.mode, input.cell, completed);
  for (let attempt = 1; attempt <= 3; attempt++) {
    const codes = generateAccessCodes(input.quantity);
    const { data, error } = await serviceClient().rpc("create_batch", {
      p_admin_id: input.adminId,
      p_label: input.label,
      p_mode: input.mode,
      p_manual_cell: input.mode === "manual" ? input.cell : null,
      p_codes: codes,
      p_cells: cells,
    });
    if (!error && data) {
      return { batchId: data, label: input.label.trim() || null, codes, allocation: countByCell(cells) };
    }
    if (error?.code !== "23505") throw new Error(`create_batch failed: ${error?.message}`);
  }
  throw new Error("create_batch failed: duplicate codes after 3 attempts");
}

export async function getBatchCodes(
  batchId: string,
): Promise<{ batch: BatchSummary; codes: string[] } | null> {
  const db = serviceClient();
  const { data: batch, error } = await db
    .from("batches")
    .select("id, label, quantity, mode, created_at")
    .eq("id", batchId)
    .maybeSingle();
  if (error) throw new Error(`Failed to load batch: ${error.message}`);
  if (!batch) return null;
  const { data: rows, error: e2 } = await db
    .from("participants")
    .select("access_code")
    .eq("batch_id", batchId)
    .order("access_code");
  if (e2) throw new Error(`Failed to load codes: ${e2.message}`);
  return {
    batch: {
      id: batch.id,
      label: batch.label,
      quantity: batch.quantity,
      mode: batch.mode,
      createdAt: batch.created_at,
    },
    codes: (rows ?? []).map((r) => r.access_code),
  };
}

export type ChangeCellResult = "ok" | "not_found" | "locked" | "same_cell";
export type DeactivateResult = "ok" | "not_found" | "not_deactivatable";

export async function changeParticipantCell(
  adminId: string,
  participantId: string,
  cell: number,
  reason: string,
) {
  const { data, error } = await serviceClient().rpc("change_participant_cell", {
    p_admin_id: adminId,
    p_participant_id: participantId,
    p_cell: cell,
    p_reason: reason,
  });
  if (error) throw new Error(`change_participant_cell failed: ${error.message}`);
  return data as ChangeCellResult;
}

export async function deactivateParticipant(adminId: string, participantId: string, reason: string) {
  const { data, error } = await serviceClient().rpc("deactivate_participant", {
    p_admin_id: adminId,
    p_participant_id: participantId,
    p_reason: reason,
  });
  if (error) throw new Error(`deactivate_participant failed: ${error.message}`);
  return data as DeactivateResult;
}
