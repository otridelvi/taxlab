/** Pure dashboard calculations (FSD-Admin §6.2). */

export type CellCounts = {
  cell: number;
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  timedOut: number;
  cancelled: number;
};

export type DashboardSettings = {
  targetPerCell: number;
  imbalanceThreshold: number;
  imbalanceMinAvg: number;
};

export const CELL_LABELS: Record<number, string> = {
  1: "Implisit · Lemah",
  2: "Eksplisit · Lemah",
  3: "Implisit · Kuat",
  4: "Eksplisit · Kuat",
};

export type DashboardTotals = {
  total: number;
  notStarted: number;
  inProgress: number;
  completed: number;
  timedOut: number;
  /** completed / (target × 4), 0–1 */
  completedShare: number;
};

export function computeTotals(cells: CellCounts[], targetPerCell: number): DashboardTotals {
  const sum = (pick: (c: CellCounts) => number) => cells.reduce((acc, c) => acc + pick(c), 0);
  const completed = sum((c) => c.completed);
  const target = targetPerCell * 4;
  return {
    total: sum((c) => c.total),
    notStarted: sum((c) => c.notStarted),
    inProgress: sum((c) => c.inProgress),
    completed,
    timedOut: sum((c) => c.timedOut),
    completedShare: target > 0 ? completed / target : 0,
  };
}

/** Meter fill for one cell, clamped to 0–1. */
export function progressRatio(completed: number, targetPerCell: number): number {
  if (targetPerCell <= 0) return 0;
  return Math.min(Math.max(completed / targetPerCell, 0), 1);
}

export type LaggingCell = { cell: number; completed: number; average: number; gapPercent: number };

/**
 * A cell is lagging when its completed count is below the average by more
 * than the threshold. No warnings until the average reaches minAvg, to avoid
 * false alarms at the start of data collection.
 */
export function findLaggingCells(cells: CellCounts[], settings: DashboardSettings): LaggingCell[] {
  if (cells.length === 0) return [];
  const average = cells.reduce((acc, c) => acc + c.completed, 0) / cells.length;
  if (average < settings.imbalanceMinAvg) return [];
  const limit = average * (1 - settings.imbalanceThreshold);
  return cells
    .filter((c) => c.completed < limit)
    .map((c) => ({
      cell: c.cell,
      completed: c.completed,
      average,
      gapPercent: Math.round(((average - c.completed) / average) * 100),
    }));
}
