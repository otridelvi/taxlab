import { test } from "node:test";
import assert from "node:assert/strict";
import { SESSION_MAX_AGE_SECONDS, signAdminSession, verifyAdminSession } from "../../lib/session";

const secret = "s".repeat(40);
const loginAt = Date.UTC(2026, 9, 6, 2, 0, 0); // 6 Oct 2026 09:00 WIB

test("a fresh session verifies", async () => {
  const token = await signAdminSession({ sub: "admin-1", loginAt }, secret);
  const payload = await verifyAdminSession(token, secret, new Date(loginAt + 60_000));
  assert.deepEqual(payload, { sub: "admin-1", loginAt });
});

test("a session older than 12 hours is rejected", async () => {
  const token = await signAdminSession({ sub: "admin-1", loginAt }, secret);
  const later = new Date(loginAt + (SESSION_MAX_AGE_SECONDS + 1) * 1000);
  assert.equal(await verifyAdminSession(token, secret, later), null);
});

test("a token signed with another secret is rejected", async () => {
  const token = await signAdminSession({ sub: "admin-1", loginAt }, "o".repeat(40));
  assert.equal(await verifyAdminSession(token, secret, new Date(loginAt)), null);
});

test("missing or garbage tokens are rejected", async () => {
  assert.equal(await verifyAdminSession(undefined, secret), null);
  assert.equal(await verifyAdminSession("not-a-jwt", secret), null);
});
