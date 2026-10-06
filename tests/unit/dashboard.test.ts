import { test } from "node:test";
import assert from "node:assert/strict";
import { computeTotals, findLaggingCells, progressRatio, type CellCounts } from "../../lib/dashboard";

const settings = { targetPerCell: 30, imbalanceThreshold: 0.2, imbalanceMinAvg: 5 };

function cell(cellNo: number, completed: number, extra: Partial<CellCounts> = {}): CellCounts {
  return {
    cell: cellNo,
    total: 32,
    notStarted: 0,
    inProgress: 0,
    completed,
    timedOut: 0,
    cancelled: 0,
    ...extra,
  };
}

test("flags Sel 4 when it is 29% below average (T-13)", () => {
  const lagging = findLaggingCells([cell(1, 22), cell(2, 21), cell(3, 26), cell(4, 15)], settings);
  assert.equal(lagging.length, 1);
  assert.equal(lagging[0].cell, 4);
  assert.equal(lagging[0].gapPercent, 29);
});

test("no warning while the average is below the minimum (T-14)", () => {
  assert.deepEqual(findLaggingCells([cell(1, 2), cell(2, 1), cell(3, 3), cell(4, 0)], settings), []);
});

test("totals and completed share", () => {
  const totals = computeTotals([cell(1, 22), cell(2, 21), cell(3, 26), cell(4, 15)], 30);
  assert.equal(totals.total, 128);
  assert.equal(totals.completed, 84);
  assert.equal(totals.completedShare, 0.7);
});

test("empty database gives zero totals", () => {
  const totals = computeTotals(
    [1, 2, 3, 4].map((n) => cell(n, 0, { total: 0 })),
    30,
  );
  assert.equal(totals.total, 0);
  assert.equal(totals.completedShare, 0);
});

test("progress ratio is clamped", () => {
  assert.equal(progressRatio(15, 30), 0.5);
  assert.equal(progressRatio(40, 30), 1);
  assert.equal(progressRatio(5, 0), 0);
});
