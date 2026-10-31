import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ACCESS_CODE_PATTERN,
  CODE_ALPHABET,
  codeSearchKey,
  generateAccessCode,
  generateAccessCodes,
  normalizeAccessCode,
} from "../../lib/access-code";

test("alphabet has 31 characters without ambiguous ones", () => {
  assert.equal(CODE_ALPHABET.length, 31);
  for (const ch of "01OIL") assert.equal(CODE_ALPHABET.includes(ch), false);
});

test("generated codes match the format (P2-7)", () => {
  for (let i = 0; i < 2000; i++) assert.match(generateAccessCode(), ACCESS_CODE_PATTERN);
});

test("generateAccessCodes returns distinct codes", () => {
  const codes = generateAccessCodes(200);
  assert.equal(codes.length, 200);
  assert.equal(new Set(codes).size, 200);
});

test("normalizeAccessCode accepts sloppy input", () => {
  assert.equal(normalizeAccessCode("tx-7kq2-m9pa"), "TX-7KQ2-M9PA");
  assert.equal(normalizeAccessCode(" 7KQ2 M9PA "), "TX-7KQ2-M9PA");
  assert.equal(normalizeAccessCode("TX7KQ2M9PA"), "TX-7KQ2-M9PA");
});

test("normalizeAccessCode rejects invalid input", () => {
  assert.equal(normalizeAccessCode("TX-7KQ2-M9P"), null);
  assert.equal(normalizeAccessCode("TX-0KQ2-M9PA"), null); // 0 is not in the alphabet
  assert.equal(normalizeAccessCode(""), null);
});

test("codeSearchKey drops dashes and spaces", () => {
  assert.equal(codeSearchKey("7kq2-m9 "), "7KQ2M9");
});
