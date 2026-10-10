import { test } from "node:test";
import assert from "node:assert/strict";
import { isValidHealthToken } from "../../lib/health";

const TOKEN = "0123456789abcdef0123";

test("accepts the exact bearer token", () => {
  assert.equal(isValidHealthToken(`Bearer ${TOKEN}`, TOKEN), true);
  assert.equal(isValidHealthToken(`Bearer ${TOKEN}  `, TOKEN), true);
});

test("rejects wrong, missing, malformed, or differently sized tokens", () => {
  assert.equal(isValidHealthToken(`Bearer ${TOKEN}x`, TOKEN), false);
  assert.equal(isValidHealthToken(`Bearer ${TOKEN.slice(0, -1)}`, TOKEN), false);
  assert.equal(isValidHealthToken(`Bearer 0123456789abcdef0124`, TOKEN), false);
  assert.equal(isValidHealthToken(TOKEN, TOKEN), false);
  assert.equal(isValidHealthToken(`Basic ${TOKEN}`, TOKEN), false);
  assert.equal(isValidHealthToken(null, TOKEN), false);
  assert.equal(isValidHealthToken("", TOKEN), false);
});

test("an unset token never opens the endpoint", () => {
  assert.equal(isValidHealthToken("Bearer ", undefined), false);
  assert.equal(isValidHealthToken("Bearer anything", undefined), false);
  assert.equal(isValidHealthToken("Bearer anything", ""), false);
});
