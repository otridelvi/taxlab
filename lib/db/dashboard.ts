import "server-only";
import type { CellCounts, DashboardSettings } from "@/lib/dashboard";
import { serviceClient } from "./service";

export async function getCellSummary(): Promise<CellCounts[]> {
  const { data, error } = await serviceClient()
    .from("v_cell_summary")
    .select("cell, total, not_started, in_progress, completed, timed_out, cancelled")
    .order("cell");
  if (error) throw new Error(`Failed to load cell summary: ${error.message}`);
  return (data ?? []).map((row) => ({
    cell: row.cell,
    total: row.total,
    notStarted: row.not_started,
    inProgress: row.in_progress,
    completed: row.completed,
    timedOut: row.timed_out,
    cancelled: row.cancelled,
  }));
}

export async function getBatchCount(): Promise<number> {
  const { count, error } = await serviceClient().from("batches").select("id", { count: "exact", head: true });
  if (error) throw new Error(`Failed to count batches: ${error.message}`);
  return count ?? 0;
}

export async function getDashboardSettings(): Promise<DashboardSettings> {
  const { data, error } = await serviceClient()
    .from("settings")
    .select("key, value")
    .in("key", ["target_per_cell", "imbalance_threshold", "imbalance_min_avg"]);
  if (error) throw new Error(`Failed to load settings: ${error.message}`);
  const map = new Map((data ?? []).map((row) => [row.key, Number(row.value)]));
  return {
    targetPerCell: map.get("target_per_cell") ?? 30,
    imbalanceThreshold: map.get("imbalance_threshold") ?? 0.2,
    imbalanceMinAvg: map.get("imbalance_min_avg") ?? 5,
  };
}
