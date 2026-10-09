import { test } from "node:test";
import assert from "node:assert/strict";
import { INACTIVE_AFTER_MS, parseTarget, sortLive, toLiveRow, type LiveInput } from "../../lib/live";

const NOW = Date.parse("2026-10-10T03:00:00.000Z");
const ago = (ms: number) => new Date(NOW - ms).toISOString();

function input(extra: Partial<LiveInput> = {}): LiveInput {
  return {
    id: "p1",
    code: "TX-AAAA-BBBB",
    cell: 2,
    currentPage: "cases_r1",
    currentRound: 1,
    taskEndAt: new Date(NOW + 20 * 60_000).toISOString(),
    startedAt: ago(30 * 60_000),
    lastSeenAt: ago(10_000),
    lastEventAt: ago(60_000),
    ...extra,
  };
}

test("PA-14: remaining time and position fields", () => {
  const row = toLiveRow(input(), NOW);
  assert.equal(row.remainingSec, 20 * 60);
  assert.equal(row.page, "cases_r1");
  assert.equal(row.round, 1);
  assert.equal(row.inactive, false);
});

test("PA-14: latest of last_seen and event is the last activity", () => {
  const row = toLiveRow(input({ lastSeenAt: ago(9 * 60_000), lastEventAt: ago(20_000) }), NOW);
  assert.equal(row.lastActiveAt, ago(20_000));
  assert.equal(row.inactive, false);
});

test("PA-14: idle longer than 5 minutes is inactive; exactly 5 minutes is not", () => {
  assert.equal(toLiveRow(input({ lastSeenAt: ago(INACTIVE_AFTER_MS + 1000), lastEventAt: null }), NOW).inactive, true);
  assert.equal(toLiveRow(input({ lastSeenAt: ago(INACTIVE_AFTER_MS), lastEventAt: null }), NOW).inactive, false);
});

test("no activity at all counts as inactive", () => {
  const row = toLiveRow(input({ lastSeenAt: null, lastEventAt: null, startedAt: null }), NOW);
  assert.equal(row.lastActiveAt, null);
  assert.equal(row.inactive, true);
});

test("timer: never negative, hidden after the timed part", () => {
  assert.equal(toLiveRow(input({ taskEndAt: ago(5000) }), NOW).remainingSec, 0);
  assert.equal(toLiveRow(input({ currentPage: "demographics" }), NOW).remainingSec, null);
  assert.equal(toLiveRow(input({ taskEndAt: null }), NOW).remainingSec, null);
});

test("sortLive puts inactive first, then by code", () => {
  const a = toLiveRow(input({ id: "a", code: "TX-AAAA-AAAA" }), NOW);
  const b = toLiveRow(input({ id: "b", code: "TX-BBBB-BBBB", lastSeenAt: ago(10 * 60_000), lastEventAt: null }), NOW);
  const c = toLiveRow(input({ id: "c", code: "TX-CCCC-CCCC" }), NOW);
  assert.deepEqual(sortLive([c, a, b]).map((r) => r.id), ["b", "a", "c"]);
});

test("PA-15: target accepts whole numbers 1–500 only", () => {
  assert.equal(parseTarget(1), 1);
  assert.equal(parseTarget(500), 500);
  for (const bad of [0, 501, -3, 2.5, "30", null, undefined, NaN]) assert.equal(parseTarget(bad), null);
});
