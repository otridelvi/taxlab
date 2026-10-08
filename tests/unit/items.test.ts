import { test } from "node:test";
import assert from "node:assert/strict";
import { checkItem, missingItems, missingMessage, splitItems, type ItemSpec } from "../../lib/items";

const specs: ItemSpec[] = [
  { key: "ba_q1", type: "choice", legend: "Q1", options: ["a", "b", "c"], name: "jawaban pertanyaan 1" },
  { key: "contact_name", type: "text", label: "Nama", name: "nama lengkap", maxLength: 120, contact: "name" },
  {
    key: "contact_email",
    type: "email",
    label: "Email",
    name: "alamat email",
    maxLength: 254,
    contact: "email",
  },
];

test("choice accepts 1..n only", () => {
  assert.deepEqual(checkItem(specs[0], 2, "final"), { ok: true, value: 2 });
  assert.deepEqual(checkItem(specs[0], "3", "final"), { ok: true, value: 3 });
  assert.deepEqual(checkItem(specs[0], 4, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(specs[0], 1.5, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(specs[0], undefined, "final"), { ok: false, reason: "empty" });
});

test("email: draft accepts unfinished text, final requires a valid address", () => {
  assert.deepEqual(checkItem(specs[2], "budi@", "draft"), { ok: true, value: "budi@" });
  assert.deepEqual(checkItem(specs[2], "budi@", "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(specs[2], " Budi@Mail.com ", "final"), { ok: true, value: "budi@mail.com" });
  assert.deepEqual(checkItem(specs[1], "x".repeat(121), "draft"), { ok: false, reason: "invalid" });
});

test("splitItems separates contact fields and rejects keys of other steps", () => {
  const r = splitItems(specs, { ba_q1: 1, contact_name: " Budi ", rank_case01_r1: 3 }, "draft");
  assert.deepEqual(r.responses, { ba_q1: 1 });
  assert.deepEqual(r.contact, { name: "Budi" });
  assert.deepEqual(r.invalid, ["rank_case01_r1"]);
});

test("missingItems and message", () => {
  const missing = missingItems(specs, { ba_q1: 2, contact_email: "x" });
  assert.deepEqual(missing, ["contact_name", "contact_email"]);
  assert.equal(missingMessage(specs, missing), "Lengkapi nama lengkap dan alamat email terlebih dahulu.");
  assert.equal(missingMessage(specs, []), "");
});

// ---------------------------------------------------------------- PLAN-04
import {
  duplicateItems,
  formatRupiah,
  hasProblems,
  parseRupiah,
  problemsMessage,
  stepProblems,
} from "../../lib/items";

const rank = (no: number, extra: object = {}): ItemSpec => ({
  key: `rank_case${String(no).padStart(2, "0")}_r1`,
  type: "integer",
  name: `peringkat kasus ${no}`,
  min: 1,
  max: 14,
  unique: "rank_r1",
  group: { id: "rank", name: "peringkat" },
  ...extra,
});
const save = (no: number): ItemSpec => ({
  key: `save_case${String(no).padStart(2, "0")}_r1`,
  type: "binary",
  name: `pilihan simpan kasus ${no}`,
  group: { id: "save", name: "pilihan simpan" },
});

test("integer: whole numbers inside min..max, numeric strings allowed, null/'' empty", () => {
  const r = rank(1);
  assert.deepEqual(checkItem(r, 1, "final"), { ok: true, value: 1 });
  assert.deepEqual(checkItem(r, "14", "final"), { ok: true, value: 14 });
  assert.deepEqual(checkItem(r, 0, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(r, 15, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(r, 2.5, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(r, "1e3", "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(r, "-1", "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(r, true, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(r, "", "final"), { ok: false, reason: "empty" });
  assert.deepEqual(checkItem(r, null, "final"), { ok: false, reason: "empty" });
  // autosave keeps the same rules for numbers
  assert.deepEqual(checkItem(r, 99, "draft"), { ok: false, reason: "invalid" });
});

test("binary: only 1 (Ya) and 0 (Tidak)", () => {
  const b = save(1);
  assert.deepEqual(checkItem(b, 1, "final"), { ok: true, value: 1 });
  assert.deepEqual(checkItem(b, 0, "final"), { ok: true, value: 0 });
  assert.deepEqual(checkItem(b, "0", "final"), { ok: true, value: 0 });
  assert.deepEqual(checkItem(b, 2, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(b, false, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(b, undefined, "final"), { ok: false, reason: "empty" });
});

test("Rupiah: amounts up to 13 digits, 0 allowed, large values stay exact", () => {
  const money: ItemSpec = {
    key: "rec_knowhow_r1",
    type: "integer",
    name: "know how fee",
    min: 0,
    max: 9_999_999_999_999,
  };
  assert.deepEqual(checkItem(money, 0, "final"), { ok: true, value: 0 });
  assert.deepEqual(checkItem(money, 125000000, "final"), { ok: true, value: 125000000 });
  assert.deepEqual(checkItem(money, 9_999_999_999_999, "final"), { ok: true, value: 9_999_999_999_999 });
  assert.deepEqual(checkItem(money, 10_000_000_000_000, "final"), { ok: false, reason: "invalid" });
  assert.deepEqual(checkItem(money, -5, "final"), { ok: false, reason: "invalid" });
  assert.equal(parseRupiah("125.000.000"), 125000000);
  assert.equal(parseRupiah("Rp 1a2"), 12);
  assert.equal(parseRupiah("007"), 7);
  assert.equal(parseRupiah("0"), 0);
  assert.equal(parseRupiah("abc"), null);
  assert.equal(parseRupiah("1".repeat(14)), null);
  assert.equal(formatRupiah(0), "0");
  assert.equal(formatRupiah(950), "950");
  assert.equal(formatRupiah(1000), "1.000");
  assert.equal(formatRupiah(125000000), "125.000.000");
  assert.equal(formatRupiah(9_999_999_999_999), "9.999.999.999.999");
});

test("ranks must be unique within the group; empty or invalid ranks are not counted", () => {
  const specs = [rank(1), rank(2), rank(3), rank(4)];
  assert.deepEqual(duplicateItems(specs, { rank_case01_r1: 3, rank_case02_r1: 5, rank_case03_r1: 3 }), [
    "rank_case01_r1",
    "rank_case03_r1",
  ]);
  assert.deepEqual(duplicateItems(specs, { rank_case01_r1: 1, rank_case02_r1: 2, rank_case03_r1: 3 }), []);
  assert.deepEqual(duplicateItems(specs, { rank_case01_r1: "", rank_case02_r1: "", rank_case03_r1: 99 }), []);
  // the same number in another round's group is fine
  const other = { ...rank(5), key: "rank_case01_r2", unique: "rank_r2" } as ItemSpec;
  assert.deepEqual(duplicateItems([rank(1), other], { rank_case01_r1: 4, rank_case01_r2: 4 }), []);
});

test("stepProblems combines missing and duplicate; message counts grouped items", () => {
  const specs = [rank(1), rank(2), rank(3), save(1), save(2), save(3)];
  const values = { rank_case01_r1: 2, rank_case02_r1: 2, save_case01_r1: 1 };
  const problems = stepProblems(specs, values);
  assert.deepEqual(problems.missing, ["rank_case03_r1", "save_case02_r1", "save_case03_r1"]);
  assert.deepEqual(problems.duplicate, ["rank_case01_r1", "rank_case02_r1"]);
  assert.ok(hasProblems(problems));
  assert.equal(
    problemsMessage(specs, problems),
    "Lengkapi peringkat (2 dari 3) dan pilihan simpan (1 dari 3) terlebih dahulu. Setiap angka peringkat hanya boleh dipakai satu kali.",
  );
  assert.equal(
    missingMessage(specs, ["save_case01_r1"]),
    "Lengkapi pilihan simpan (2 dari 3) terlebih dahulu.",
  );
  const complete = {
    rank_case01_r1: 1,
    rank_case02_r1: 2,
    rank_case03_r1: 3,
    save_case01_r1: 1,
    save_case02_r1: 0,
    save_case03_r1: 1,
  };
  assert.ok(!hasProblems(stepProblems(specs, complete)));
});

test("optional items (REQUIRE_ALL_CASES = false) may stay empty but not be wrong", () => {
  const specs = [rank(1, { required: false }), rank(2, { required: false })];
  assert.deepEqual(missingItems(specs, {}), []);
  assert.deepEqual(missingItems(specs, { rank_case01_r1: 99 }), ["rank_case01_r1"]);
});

test("splitItems: numbers stored as numbers, cleared answers become null, other steps' keys rejected", () => {
  const specs = [rank(1), rank(2), save(1)];
  const r = splitItems(
    specs,
    { rank_case01_r1: "7", rank_case02_r1: "", save_case01_r1: 0, rank_case03_r1_r2: 1, rank_case09_r1: 3 },
    "draft",
  );
  assert.deepEqual(r.responses, { rank_case01_r1: 7, rank_case02_r1: null, save_case01_r1: 0 });
  assert.deepEqual(r.invalid, ["rank_case03_r1_r2", "rank_case09_r1"]);
  // an out-of-range rank is rejected, not stored
  assert.deepEqual(splitItems(specs, { rank_case01_r1: 15 }, "draft").invalid, ["rank_case01_r1"]);
});
