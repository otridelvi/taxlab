import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOW_A } from "../../content/flow";
import { cellFactors } from "../../lib/cell";
import { getStep, isTaskStep, itemsForStep, nextStep, transition, FIRST_STEP_ID } from "../../lib/flow";
import { PAGE_NAMES } from "../../lib/pages";

test("flow A has the PRD pages in order, unique ids, known to the admin panel", () => {
  const ids = FLOW_A.map((s) => s.id);
  assert.equal(ids[0], FIRST_STEP_ID);
  assert.equal(ids.at(-1), "finish");
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 30); // 32 PRD pages minus consent and login (separate routes)
  for (const id of ids) assert.ok(PAGE_NAMES[id], `PAGE_NAMES lacks ${id}`);
  assert.ok(PAGE_NAMES.time_up);
});

test("exactly one timer start (role) and one end (confidence_r2)", () => {
  assert.deepEqual(
    FLOW_A.filter((s) => s.timer === "start").map((s) => s.id),
    ["role"],
  );
  assert.deepEqual(
    FLOW_A.filter((s) => s.timer === "end").map((s) => s.id),
    ["confidence_r2"],
  );
});

test("transition from welcome starts the timer; leaving confidence_r2 stops it", () => {
  assert.deepEqual(transition(FLOW_A, "welcome"), {
    nextPage: "role",
    nextRound: null,
    timerStart: true,
    timerEnd: false,
  });
  assert.deepEqual(transition(FLOW_A, "confidence_r2"), {
    nextPage: "mc_choice",
    nextRound: null,
    timerStart: false,
    timerEnd: true,
  });
  assert.equal(transition(FLOW_A, "memo")?.nextRound, 1);
  assert.equal(transition(FLOW_A, "finish"), null);
  assert.equal(transition(FLOW_A, "nope"), null);
});

test("after time_up the participant goes to the first step after the timer end", () => {
  assert.equal(nextStep(FLOW_A, "time_up")?.id, "mc_choice");
  assert.equal(getStep(FLOW_A, "time_up")?.kind, "time_up");
});

test("task part = role … confidence_r2", () => {
  assert.equal(isTaskStep(FLOW_A, "welcome"), false);
  assert.equal(isTaskStep(FLOW_A, "role"), true);
  assert.equal(isTaskStep(FLOW_A, "cases_r2"), true);
  assert.equal(isTaskStep(FLOW_A, "confidence_r2"), true);
  assert.equal(isTaskStep(FLOW_A, "mc_choice"), false);
});

test("round tags: _r1 pages in round 1, _r2 pages in round 2, review outside", () => {
  for (const s of FLOW_A) {
    if (s.id.endsWith("_r1")) assert.equal(s.round, 1, s.id);
    if (s.id.endsWith("_r2")) assert.equal(s.round, 2, s.id);
  }
  assert.equal(getStep(FLOW_A, "review")?.round, undefined);
});

test("minutes questions only for Implisit cells, name/email only for Kuat cells", () => {
  const minutes = getStep(FLOW_A, "minutes")!;
  const memo = getStep(FLOW_A, "memo")!;
  assert.deepEqual(
    itemsForStep(minutes, cellFactors(1)).map((i) => i.key),
    ["ba_q1", "ba_q2"],
  );
  assert.deepEqual(itemsForStep(minutes, cellFactors(2)), []);
  assert.deepEqual(
    itemsForStep(minutes, cellFactors(3)).map((i) => i.key),
    ["ba_q1", "ba_q2"],
  );
  assert.deepEqual(itemsForStep(memo, cellFactors(1)), []);
  assert.deepEqual(
    itemsForStep(memo, cellFactors(4)).map((i) => i.key),
    ["contact_name", "contact_email"],
  );
});

test("cell factors", () => {
  assert.deepEqual(cellFactors(1), { pref: "impl", acc: "weak" });
  assert.deepEqual(cellFactors(2), { pref: "expl", acc: "weak" });
  assert.deepEqual(cellFactors(3), { pref: "impl", acc: "strong" });
  assert.deepEqual(cellFactors(4), { pref: "expl", acc: "strong" });
  assert.throws(() => cellFactors(5));
});
