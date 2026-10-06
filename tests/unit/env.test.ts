import { test } from "node:test";
import assert from "node:assert/strict";
import { parseServerEnv } from "../../lib/env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://example.supabase.co",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "anon-key-0123456789abcdef",
  SUPABASE_SERVICE_ROLE_KEY: "service-key-0123456789abcdef",
  APP_ENV: "sit",
  APP_BASE_URL: "http://localhost:3000",
  SESSION_SECRET: "x".repeat(32),
};

test("accepts a complete environment", () => {
  assert.equal(parseServerEnv(valid).APP_ENV, "sit");
});

test("lists every missing or invalid variable", () => {
  assert.throws(
    () =>
      parseServerEnv({
        ...valid,
        APP_ENV: "staging",
        SESSION_SECRET: "short",
        SUPABASE_SERVICE_ROLE_KEY: undefined,
      }),
    (err: Error) =>
      err.message.includes("APP_ENV") &&
      err.message.includes("SESSION_SECRET") &&
      err.message.includes("SUPABASE_SERVICE_ROLE_KEY"),
  );
});
