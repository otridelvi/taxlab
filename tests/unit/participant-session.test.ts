import { test } from "node:test";
import assert from "node:assert/strict";
import {
  PARTICIPANT_MAX_AGE_SECONDS,
  signConsent,
  signParticipantToken,
  verifyConsent,
  verifyParticipantToken,
} from "../../lib/participant-session";
import { isCodeRateLimited } from "../../lib/participant-rate-limit";
import { parseEventBatch } from "../../lib/participant-events";
import { signAdminSession } from "../../lib/session";

const secret = "p".repeat(40);
const now = new Date(Date.UTC(2026, 9, 9, 2, 0, 0));

test("participant token round-trip and expiry", async () => {
  const token = await signParticipantToken({ participantId: "p1", sessionId: "s1" }, secret, now);
  assert.deepEqual(await verifyParticipantToken(token, secret, now), {
    participantId: "p1",
    sessionId: "s1",
  });
  const later = new Date(now.getTime() + (PARTICIPANT_MAX_AGE_SECONDS + 1) * 1000);
  assert.equal(await verifyParticipantToken(token, secret, later), null);
  assert.equal(await verifyParticipantToken(token, "x".repeat(40), now), null);
});

test("tokens are not interchangeable (audience)", async () => {
  const consent = await signConsent(now, secret);
  assert.equal(await verifyParticipantToken(consent, secret, now), null);
  const admin = await signAdminSession({ sub: "a", loginAt: now.getTime() }, secret);
  assert.equal(await verifyParticipantToken(admin, secret, now), null);
  assert.equal((await verifyConsent(consent, secret, now))?.toISOString(), now.toISOString());
});

test("rate limit: 10 failures per device, 300 per IP", () => {
  assert.equal(isCodeRateLimited({ device: 9, ip: 0 }), false);
  assert.equal(isCodeRateLimited({ device: 10, ip: 0 }), true);
  assert.equal(isCodeRateLimited({ device: 0, ip: 299 }), false);
  assert.equal(isCodeRateLimited({ device: 0, ip: 300 }), true);
});

test("event batch keeps valid events only", () => {
  const ts = now.toISOString();
  const events = parseEventBatch({
    events: [
      { seq: 0, type: "page_view", page_id: "welcome", client_ts: ts },
      { seq: 1, type: "session_finish", client_ts: ts }, // server-only type
      { seq: 2, type: "tab_hidden", client_ts: "yesterday" },
      { seq: 3, type: "rank_set", target: "case03", client_ts: ts, meta: { value: 2 } },
    ],
  });
  assert.deepEqual(
    events?.map((e) => e.seq),
    [0, 3],
  );
  assert.equal(parseEventBatch({}), null);
});
