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
