import { secureRandomInt, shuffle, type RandomInt } from "./random";

export const CELLS = [1, 2, 3, 4] as const;
export type Cell = (typeof CELLS)[number];
export type AllocationMode = "random" | "manual";

/** Completed participants per cell, indexed by cell number. */
export type CompletedPerCell = Record<Cell, number>;

/**
 * Cell for each new code (FSD-Admin §7.2).
 * - manual: every code goes to `cell`.
 * - random: blocks of 4 in shuffled order (each cell exactly once per block);
 *   the remainder goes to the cells with the fewest completed participants,
 *   ties broken at random.
 */
export function allocateCells(
  n: number,
  mode: AllocationMode,
  cell: Cell | null,
  completed: CompletedPerCell,
  randomInt: RandomInt = secureRandomInt,
): Cell[] {
  if (mode === "manual") {
    if (!cell) throw new Error("manual mode requires a cell");
    return Array<Cell>(n).fill(cell);
  }
  const out: Cell[] = [];
  for (let i = 0; i < Math.floor(n / 4); i++) out.push(...shuffle(CELLS, randomInt));
  const rest = n % 4;
  if (rest > 0) {
    const order = shuffle(CELLS, randomInt).sort((a, b) => completed[a] - completed[b]);
    out.push(...shuffle(order.slice(0, rest), randomInt));
  }
  return out;
}

/**
 * How many new codes each cell gets, for the preview before generating.
 * Same rule as allocateCells, but ties in the remainder are broken by cell
 * number so the preview is stable. The server may break ties differently.
 */
export function previewAllocation(
  n: number,
  mode: AllocationMode,
  cell: Cell | null,
  completed: CompletedPerCell,
): CompletedPerCell {
  const counts: CompletedPerCell = { 1: 0, 2: 0, 3: 0, 4: 0 };
  if (n <= 0) return counts;
  if (mode === "manual") {
    if (cell) counts[cell] = n;
    return counts;
  }
  const base = Math.floor(n / 4);
  for (const c of CELLS) counts[c] = base;
  const order = [...CELLS].sort((a, b) => completed[a] - completed[b] || a - b);
  for (const c of order.slice(0, n % 4)) counts[c] += 1;
  return counts;
}

export function countByCell(cells: readonly Cell[]): CompletedPerCell {
  const counts: CompletedPerCell = { 1: 0, 2: 0, 3: 0, 4: 0 };
  for (const c of cells) counts[c] += 1;
  return counts;
}
