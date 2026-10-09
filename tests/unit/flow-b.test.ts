import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOW_A, FLOW_B } from "../../content/flow";
import * as T from "../../content/text";
import { cellFactors } from "../../lib/cell";
import {
  FIRST_STEP_ID,
  getFlow,
  getStep,
  isTaskStep,
  itemsForStep,
  nextStep,
  transition,
} from "../../lib/flow";
import { PAGE_NAMES } from "../../lib/pages";

/** PLAN-05: flow B (Opsi B). PB-1, PB-2. */

const CELLS = [1, 2, 3, 4] as const;

function allKeys(flow: typeof FLOW_A, cell: number) {
  const keys: string[] = [];
  for (const step of flow) for (const item of itemsForStep(step, cellFactors(cell))) keys.push(item.key);
  return keys;
}

test("flow B: 18 steps with unique ids, all known to the admin panel", () => {
  const ids = FLOW_B.map((s) => s.id);
  assert.equal(ids[0], FIRST_STEP_ID);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(ids.length, 18); // 20 pages minus consent and login
  for (const id of ids) assert.ok(PAGE_NAMES[id], `PAGE_NAMES lacks ${id}`);
});

test("flow B: the merged pages are gone, the new ones are in", () => {
  const ids = new Set(FLOW_B.map((s) => s.id));
  for (const gone of [
    "role",
    "rules",
    "case_info",
    "facts_2",
    "facts_3",
    "facts_4",
    "memo_intro",
    "cases_intro_r2",
    "rec_intro_r1",
    "rec_intro_r2",
    "client_draft_r1",
    "client_draft_r2",
    "mc_choice",
    "mc_likert",
    "finish",
  ]) {
    assert.ok(!ids.has(gone), `${gone} should not be in flow B`);
  }
  for (const page of ["instructions", "facts_costs", "questionnaire", "cases_r2", "rec_r1", "rec_r2"]) {
    assert.ok(ids.has(page), `${page} missing`);
  }
});

test("flow B: same item keys as flow A for every cell (PR-3)", () => {
  for (const cell of CELLS) {
    assert.deepEqual([...allKeys(FLOW_B, cell)].sort(), [...allKeys(FLOW_A, cell)].sort(), `cell ${cell}`);
  }
});

test("flow B: one timer start (instructions) and one end (confidence_r2); task part in between", () => {
  assert.deepEqual(
    FLOW_B.filter((s) => s.timer === "start").map((s) => s.id),
    ["instructions"],
  );
  assert.deepEqual(
    FLOW_B.filter((s) => s.timer === "end").map((s) => s.id),
    ["confidence_r2"],
  );
  assert.equal(isTaskStep(FLOW_B, "welcome"), false);
  assert.equal(isTaskStep(FLOW_B, "instructions"), true);
  assert.equal(isTaskStep(FLOW_B, "review"), true);
  assert.equal(isTaskStep(FLOW_B, "confidence_r2"), true);
  assert.equal(isTaskStep(FLOW_B, "questionnaire"), false);
});

test("flow B transitions: welcome starts the timer; confidence_r2 and time_up lead to the questionnaire", () => {
  assert.deepEqual(transition(FLOW_B, "welcome"), {
    nextPage: "instructions",
    nextRound: null,
    timerStart: true,
    timerEnd: false,
  });
  assert.deepEqual(transition(FLOW_B, "confidence_r2"), {
    nextPage: "questionnaire",
    nextRound: null,
    timerStart: false,
    timerEnd: true,
  });
  assert.equal(nextStep(FLOW_B, "time_up")?.id, "questionnaire");
  assert.equal(transition(FLOW_B, "memo")?.nextPage, "cases_intro_r1");
  assert.equal(transition(FLOW_B, "memo")?.nextRound, 1);
  assert.equal(transition(FLOW_B, "review")?.nextPage, "cases_r2");
  assert.equal(transition(FLOW_B, "review")?.nextRound, 2);
  assert.equal(transition(FLOW_B, "debriefing"), null); // last page; the button ends the session
});

test("flow B: memo and review are gated documents; only debriefing ends the session", () => {
  assert.deepEqual(
    FLOW_B.filter((s) => s.gate).map((s) => [s.id, s.gate]),
    [
      ["memo", "memo"],
      ["review", "review"],
    ],
  );
  assert.deepEqual(
    FLOW_B.filter((s) => s.ends).map((s) => s.id),
    ["debriefing"],
  );
  assert.ok(
    FLOW_A.every((s) => !s.gate && !s.ends && !s.map),
    "flow A has no flow B features",
  );
});

test("flow B: file map on the file pages only, in reading order", () => {
  assert.deepEqual(
    FLOW_B.filter((s) => s.map).map((s) => [s.id, s.map]),
    [
      ["facts_1", "facts"],
      ["facts_costs", "facts"],
      ["minutes", "minutes"],
      ["memo", "memo"],
    ],
  );
});

test("flow B: menu Berkas from the case list of round 1 to confidence 2; Reviu only after the review", () => {
  const withMenu = FLOW_B.filter((s) => s.menu).map((s) => s.id);
  assert.equal(withMenu[0], "cases_r1");
  assert.equal(withMenu.at(-1), "confidence_r2");
  const reviewAt = FLOW_B.findIndex((s) => s.id === "review");
  for (const s of FLOW_B) {
    if (!s.menu) continue;
    assert.equal(s.menu.includes("review"), FLOW_B.indexOf(s) > reviewAt, s.id);
  }
});

test("flow B covariates: no letters, option 4 renamed, same numbering and option count (B-12)", () => {
  const a = itemsForStep(getStep(FLOW_A, "covariates")!, cellFactors(1));
  const b = itemsForStep(getStep(FLOW_B, "covariates")!, cellFactors(1));
  assert.equal(b.length, 5);
  for (const [i, item] of b.entries()) {
    assert.equal(item.type, "choice");
    assert.ok(!(item.type === "choice" && item.letters), "no letters in flow B");
    assert.equal(item.key, a[i].key);
    if (item.type === "choice" && a[i].type === "choice") {
      assert.equal(item.options.length, a[i].options.length);
    }
  }
  const options = T.COV_B.flatMap((q) => q.options) as string[];
  assert.ok(options.includes("Kedua jawaban di atas benar"));
  assert.ok(!options.includes("A dan B benar"));
  assert.ok((T.COV.flatMap((q) => q.options) as string[]).includes("A dan B benar"), "flow A text untouched");
});

test("getFlow: B by default, A for participants who started on A", () => {
  assert.equal(getFlow("A"), FLOW_A);
  assert.equal(getFlow("B"), FLOW_B);
  assert.equal(getFlow(null), FLOW_B);
});

test("flow B texts do not leak rounds or cells", () => {
  const shown = JSON.stringify([T.ENVELOPE, T.INSTRUCTION_TITLES, T.FILE_MAP, T.COV_B, T.REC_TEXT.footB]);
  assert.doesNotMatch(shown, /putaran|sel \d|implisit|eksplisit|lemah|kuat/i);
});
