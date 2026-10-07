import { test } from "node:test";
import assert from "node:assert/strict";
import { allocateCells, countByCell, previewAllocation, type CompletedPerCell } from "../../lib/allocate";

const zero: CompletedPerCell = { 1: 0, 2: 0, 3: 0, 4: 0 };

test("random mode with a multiple of 4 gives exactly n/4 per cell (P2-1)", () => {
  for (let i = 0; i < 50; i++) {
    assert.deepEqual(countByCell(allocateCells(40, "random", null, zero)), { 1: 10, 2: 10, 3: 10, 4: 10 });
  }
});

test("remainder goes to the cells with the fewest completed (T-02)", () => {
  const completed: CompletedPerCell = { 1: 22, 2: 21, 3: 26, 4: 15 };
  for (let i = 0; i < 50; i++) {
    assert.deepEqual(countByCell(allocateCells(6, "random", null, completed)), { 1: 1, 2: 2, 3: 1, 4: 2 });
  }
});

test("each block of 4 contains every cell once", () => {
  const cells = allocateCells(12, "random", null, zero);
  for (let b = 0; b < 3; b++) assert.deepEqual([...cells.slice(b * 4, b * 4 + 4)].sort(), [1, 2, 3, 4]);
});

test("manual mode puts every code in the chosen cell (P2-2)", () => {
  assert.deepEqual(countByCell(allocateCells(8, "manual", 4, zero)), { 1: 0, 2: 0, 3: 0, 4: 8 });
  assert.throws(() => allocateCells(3, "manual", null, zero));
});

test("preview matches the allocation counts when there are no ties", () => {
  const completed: CompletedPerCell = { 1: 22, 2: 21, 3: 26, 4: 15 };
  assert.deepEqual(previewAllocation(6, "random", null, completed), { 1: 1, 2: 2, 3: 1, 4: 2 });
  assert.deepEqual(previewAllocation(8, "manual", 4, completed), { 1: 0, 2: 0, 3: 0, 4: 8 });
  assert.deepEqual(previewAllocation(0, "random", null, completed), zero);
});

test("preview breaks ties by cell number", () => {
  assert.deepEqual(previewAllocation(2, "random", null, zero), { 1: 1, 2: 1, 3: 0, 4: 0 });
});
