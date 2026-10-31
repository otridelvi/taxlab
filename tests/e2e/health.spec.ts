import { expect, test } from "@playwright/test";

/**
 * PLAN-08 · keep-alive endpoint. Without a token (or with a wrong one) the answer is 401 and carries no data.
 * The happy path runs only when HEALTHCHECK_TOKEN is available to the test (same value as the app's).
 */
test("health: no token and wrong token are refused", async ({ request }) => {
  const none = await request.get("/api/health");
  expect(none.status()).toBe(401);
  expect(await none.json()).toEqual({ ok: false });
  const wrong = await request.get("/api/health", { headers: { Authorization: "Bearer salah-salah-salah-salah" } });
  expect(wrong.status()).toBe(401);
});

test("health: correct token returns ok and the environment", async ({ request }) => {
  test.skip(!process.env.HEALTHCHECK_TOKEN, "HEALTHCHECK_TOKEN not set in .env.local");
  const res = await request.get("/api/health", { headers: { Authorization: `Bearer ${process.env.HEALTHCHECK_TOKEN}` } });
  expect(res.status()).toBe(200);
  expect(await res.json()).toEqual({ ok: true, env: "sit" });
});
