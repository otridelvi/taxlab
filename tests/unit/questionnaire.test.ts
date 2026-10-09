import { test } from "node:test";
import assert from "node:assert/strict";
import { FLOW_A, FLOW_B } from "../../content/flow";
import { cellFactors } from "../../lib/cell";
import { COV_KEY, mcKey } from "../../lib/answer-keys";
import { itemsForStep } from "../../lib/flow";
import { checkItem, normalizePhone, splitItems, stepProblems } from "../../lib/items";

/** PLAN-06: PC-1 … PC-4. */

test("PC-1 normalizePhone: accepted spellings and rejections", () => {
  for (const ok of [
    "0812-3456-7890",
    "812 3456 7890",
    "+62812 3456 7890",
    "6281234567890",
    "(0812) 3456.7890",
  ]) {
    assert.equal(normalizePhone(ok), "+6281234567890", ok);
  }
  assert.equal(normalizePhone("08123456"), null); // too short (7 digits after the 0)
  assert.equal(normalizePhone("0812345678901234"), null); // too long
  assert.equal(normalizePhone("0812abc4567"), null);
  assert.equal(normalizePhone("+11234567890"), null);
  assert.equal(normalizePhone("02112345678"), null); // not a mobile number
  assert.equal(normalizePhone(""), null);
});

const demographics = FLOW_B.find((s) => s.id === "demographics")!;
const specs = itemsForStep(demographics, cellFactors(1));
const base = { semester: 5, gender: 1, age: 21, education: 2 };

test("PC-2 requiredWith: e-wallet and phone are both or none", () => {
  const missing = (v: Record<string, unknown>) => stepProblems(specs, { ...base, ...v }).missing;
  assert.deepEqual(missing({}), []);
  assert.deepEqual(missing({ contact_ewallet: "dana" }), ["contact_phone"]);
  assert.deepEqual(missing({ contact_phone: "0812 3456 7890" }), ["contact_ewallet"]);
  assert.deepEqual(missing({ contact_ewallet: "dana", contact_phone: "0812 3456 7890" }), []);
  assert.deepEqual(missing({ contact_ewallet: "dana", contact_phone: "12345" }), ["contact_phone"]);
  assert.deepEqual(missing({ contact_ewallet: "paypal", contact_phone: "0812 3456 7890" }), [
    "contact_ewallet",
  ]);
});

test("demographics: ranges and required fields", () => {
  const missing = (v: Record<string, unknown>) => stepProblems(specs, { ...base, ...v }).missing;
  assert.deepEqual(missing({ semester: 0 }), ["semester"]);
  assert.deepEqual(missing({ semester: 21 }), ["semester"]);
  assert.deepEqual(missing({ age: 14 }), ["age"]);
  assert.deepEqual(missing({ age: 81 }), ["age"]);
  assert.deepEqual(missing({ age: "abc" }), ["age"]);
  assert.deepEqual(missing({ gender: 3 }), ["gender"]);
  assert.deepEqual(missing({ education: 5 }), ["education"]);
  assert.deepEqual(stepProblems(specs, {}).missing, ["semester", "gender", "age", "education"]);
});

test("contact fields go to contacts, normalised; cleared ones empty the contact", () => {
  const done = splitItems(
    specs,
    { ...base, contact_ewallet: "dana", contact_phone: "0812 3456 7890" },
    "final",
  );
  assert.deepEqual(done.contact, { ewallet: "dana", phone: "+6281234567890" });
  assert.deepEqual(done.responses, base);
  assert.deepEqual(done.invalid, []);
  const draft = splitItems(specs, { contact_phone: "0812 34" }, "draft");
  assert.deepEqual(draft.contact, { phone: "0812 34" });
  const cleared = splitItems(specs, { contact_ewallet: "", contact_phone: "" }, "draft");
  assert.deepEqual(cleared.contact, { ewallet: "", phone: "" });
  assert.deepEqual(cleared.responses, {});
});

test("likert accepts 1–5 only", () => {
  const likert = itemsForStep(
    FLOW_B.find((s) => s.id === "questionnaire")!,
    cellFactors(1),
  ).find((i) => i.type === "likert")!;
  assert.deepEqual(checkItem(likert, 4, "final"), { ok: true, value: 4 });
  assert.deepEqual(checkItem(likert, "5", "final"), { ok: true, value: 5 });
  assert.deepEqual(checkItem(likert, 0, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(likert, 6, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(likert, null, "final"), { ok: false, reason: "empty" });
});

test("PC-3 answer keys per cell", () => {
  assert.deepEqual(mcKey(cellFactors(1)), { mc_q1: 2, mc_q2: 1, mc_q3: 2 }); // implicit / weak
  assert.deepEqual(mcKey(cellFactors(2)), { mc_q1: 1, mc_q2: 1, mc_q3: 2 }); // explicit / weak
  assert.deepEqual(mcKey(cellFactors(3)), { mc_q1: 2, mc_q2: 2, mc_q3: 2 }); // implicit / strong
  assert.deepEqual(mcKey(cellFactors(4)), { mc_q1: 1, mc_q2: 2, mc_q3: 2 }); // explicit / strong
  assert.equal(COV_KEY, null);
});

test("PC-4 questionnaire keys: flow A pages together equal flow B page; same demographics", () => {
  const f = cellFactors(4);
  const keys = (flow: typeof FLOW_A, ids: string[]) =>
    flow.filter((s) => ids.includes(s.id)).flatMap((s) => itemsForStep(s, f).map((i) => i.key));
  assert.deepEqual(keys(FLOW_A, ["mc_choice", "mc_likert"]), keys(FLOW_B, ["questionnaire"]));
  assert.equal(keys(FLOW_B, ["questionnaire"]).length, 7);
  assert.deepEqual(keys(FLOW_A, ["demographics"]), keys(FLOW_B, ["demographics"]));
});
