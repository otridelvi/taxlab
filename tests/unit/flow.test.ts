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

// ---------------------------------------------------------------- PLAN-04
import { REQUIRE_ALL_CASES, rankKey, saveKey } from "../../content/flow";
import { validateStep } from "../../lib/flow";
import { problemsMessage } from "../../lib/items";

const keysOf = (id: string, cell = 1) =>
  itemsForStep(getStep(FLOW_A, id)!, cellFactors(cell)).map((i) => i.key);

test("cases pages: 14 ranks + 14 saves per round, keys end with the round, same for every cell", () => {
  for (const round of [1, 2] as const) {
    const keys = keysOf(`cases_r${round}`);
    assert.equal(keys.length, 28);
    assert.equal(keys[0], `rank_case01_r${round}`);
    assert.equal(keys[13], `rank_case14_r${round}`);
    assert.equal(keys[14], `save_case01_r${round}`);
    assert.equal(keys[27], `save_case14_r${round}`);
    assert.ok(keys.every((k) => k.endsWith(`_r${round}`)));
    assert.deepEqual(keys, keysOf(`cases_r${round}`, 4));
  }
  assert.equal(rankKey(3, 1), "rank_case03_r1");
  assert.equal(saveKey(14, 2), "save_case14_r2");
});

test("round 1 and round 2 never share an item key (answers are stored separately)", () => {
  const r1 = new Set<string>();
  const r2 = new Set<string>();
  for (const step of FLOW_A) {
    for (const item of itemsForStep(step, cellFactors(4))) (step.round === 2 ? r2 : r1).add(item.key);
  }
  for (const k of r2) assert.ok(!r1.has(k), `${k} appears in both rounds`);
  for (const k of r2) assert.match(k, /_r2$/);
});

test("covariates: 5 required questions with letters; recommendation: 4 amounts; confidence: 0–100", () => {
  assert.deepEqual(keysOf("covariates"), ["cov_q1", "cov_q2", "cov_q3", "cov_q4", "cov_q5"]);
  const cov = itemsForStep(getStep(FLOW_A, "covariates")!, cellFactors(1));
  assert.ok(cov.every((i) => i.type === "choice" && i.letters && i.options.length === 3));
  assert.deepEqual(keysOf("rec_r1"), [
    "rec_knowhow_r1",
    "rec_entertain_r1",
    "rec_repair_r1",
    "rec_marketing_r1",
  ]);
  assert.deepEqual(keysOf("rec_r2"), [
    "rec_knowhow_r2",
    "rec_entertain_r2",
    "rec_repair_r2",
    "rec_marketing_r2",
  ]);
  const [conf] = itemsForStep(getStep(FLOW_A, "confidence_r2")!, cellFactors(1));
  assert.equal(conf.type, "integer");
  assert.deepEqual(conf.type === "integer" && [conf.min, conf.max], [0, 100]);
  assert.equal(getStep(FLOW_A, "confidence_r1")?.next, "Simpan");
});

test("validateStep: cases need all 14 ranks and saves, and no repeated rank", () => {
  assert.equal(REQUIRE_ALL_CASES, true);
  const step = getStep(FLOW_A, "cases_r1")!;
  const f = cellFactors(1);
  const empty = validateStep(step, f, {});
  assert.equal(empty.missing.length, 28);
  assert.equal(
    problemsMessage(itemsForStep(step, f), empty),
    "Lengkapi peringkat (0 dari 14) dan pilihan simpan (0 dari 14) terlebih dahulu.",
  );

  const values: Record<string, number> = {};
  for (let n = 1; n <= 14; n++) {
    values[rankKey(n, 1)] = n;
    values[saveKey(n, 1)] = n % 2;
  }
  assert.deepEqual(validateStep(step, f, values), { missing: [], duplicate: [] });

  values[rankKey(5, 1)] = 4; // 4 is now used twice
  const dup = validateStep(step, f, values);
  assert.deepEqual(dup.missing, []);
  assert.deepEqual(dup.duplicate, [rankKey(4, 1), rankKey(5, 1)]);

  // round 2 keys are not accepted on the round 1 page
  assert.deepEqual(validateStep(step, f, { ...values, [rankKey(5, 1)]: 5, [rankKey(1, 2)]: 3 }).missing, []);
});

test("menu Berkas: from the case list of round 1 to confidence 2; Reviu Atasan only after the review", () => {
  const withMenu = FLOW_A.filter((s) => s.menu).map((s) => s.id);
  assert.equal(withMenu[0], "cases_r1");
  assert.ok(!withMenu.includes("cases_intro_r1"));
  assert.equal(withMenu.at(-1), "confidence_r2");
  for (const s of FLOW_A) {
    const idx = FLOW_A.findIndex((x) => x.id === "review");
    const i = FLOW_A.indexOf(s);
    if (!s.menu) continue;
    assert.equal(s.menu.includes("review"), i > idx, `${s.id}: review file only after the review page`);
    assert.ok(s.menu.includes("facts") && s.menu.includes("minutes") && s.menu.includes("memo"));
  }
});

test("content: 14 cases in fixed order with identical text for both rounds; no 'Putaran' or cell names", async () => {
  const cases = (await import("../../content/cases.json", { with: { type: "json" } })).default;
  assert.deepEqual(
    cases.map((c: { no: number }) => c.no),
    Array.from({ length: 14 }, (_, i) => i + 1),
  );
  for (const c of cases) assert.ok(c.name && c.summary && c.detail.length > 0);
  const text = await import("../../content/text");
  const shown = JSON.stringify([text.CASES_TEXT, text.REC_TEXT, text.COV, text.CONF_TEXT, text.REF_LABELS]);
  assert.doesNotMatch(shown, /putaran|sel \d|implisit|eksplisit|lemah|kuat/i);
});
