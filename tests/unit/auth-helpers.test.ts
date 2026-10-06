import { test } from "node:test";
import assert from "node:assert/strict";
import {
  attemptWindowStart,
  isLockedOut,
  MAX_FAILED_ATTEMPTS,
  normalizeEmail,
} from "../../lib/auth/rate-limit";
import { safeNextPath } from "../../lib/auth/redirect";

test("locks out after 5 failures (T-5)", () => {
  assert.equal(isLockedOut(MAX_FAILED_ATTEMPTS - 1), false);
  assert.equal(isLockedOut(MAX_FAILED_ATTEMPTS), true);
});

test("attempt window is 15 minutes", () => {
  const now = new Date("2026-10-06T10:00:00Z");
  assert.equal(attemptWindowStart(now).toISOString(), "2026-10-06T09:45:00.000Z");
});

test("emails are normalized", () => {
  assert.equal(normalizeEmail("  Peneliti@Contoh.COM "), "peneliti@contoh.com");
});

test("only admin paths are allowed after login", () => {
  assert.equal(safeNextPath("/admin/participants?cell=4"), "/admin/participants?cell=4");
  assert.equal(safeNextPath(undefined), "/admin");
  assert.equal(safeNextPath("https://evil.example"), "/admin");
  assert.equal(safeNextPath("//evil.example/admin"), "/admin");
  assert.equal(safeNextPath("/admin/login"), "/admin");
  assert.equal(safeNextPath("/admin/login?next=/admin"), "/admin");
  assert.equal(safeNextPath("/masuk"), "/admin");
});
