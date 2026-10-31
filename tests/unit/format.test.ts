import { test } from "node:test";
import assert from "node:assert/strict";
import { arrowDelta, durationText, rankShift, rupiah, rupiahDelta } from "../../lib/format";

test("durationText: mm:ss and h:mm:ss", () => {
  assert.equal(durationText(65), "1:05");
  assert.equal(durationText(3725), "1:02:05");
  assert.equal(durationText(null), "—");
});

test("rupiah and signed difference", () => {
  assert.equal(rupiah(1250000), "Rp1.250.000");
  assert.equal(rupiah(-50000), "−Rp50.000");
  assert.equal(rupiahDelta(50000), "+Rp50.000");
  assert.equal(rupiahDelta(-50000), "−Rp50.000");
  assert.equal(rupiahDelta(0), "=");
});

test("rank 1 → 5 shows ▼ 4 (T-17); arrows never rely on colour", () => {
  assert.equal(rankShift(1, 5), "▼ 4");
  assert.equal(rankShift(5, 1), "▲ 4");
  assert.equal(rankShift(3, 3), "=");
  assert.equal(rankShift(null, 3), "—");
  assert.equal(arrowDelta(2), "▲ 2");
});
