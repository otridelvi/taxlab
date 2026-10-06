import { createClient } from "@supabase/supabase-js";
import { expect, type Page } from "@playwright/test";
import type { Database } from "../../lib/db/types";

try {
  process.loadEnvFile(".env.local");
} catch {
  // Variables may already be set (e.g. in CI).
}

/** Dedicated SIT-only test accounts. They are reused between runs, never deleted. */
export const E2E_PASSWORD = process.env.E2E_PASSWORD ?? "E2e-Taxlab-Sit-2026!";

export const ACCOUNTS = {
  admin: { email: "e2e-admin@example.com", name: "E2E Admin", role: "admin", active: true },
  viewer: { email: "e2e-viewer@example.com", name: "E2E Viewer", role: "viewer", active: true },
  inactive: { email: "e2e-inactive@example.com", name: "E2E Inactive", role: "admin", active: false },
  /** Auth user without a row in `admins`. */
  nonAdmin: { email: "e2e-nonadmin@example.com" },
  /** No account at all; used for the rate-limit test. */
  locked: { email: "e2e-locked@example.com" },
} as const;

export function requireSitEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Supabase env vars missing (.env.local).");
  if (process.env.APP_ENV !== "sit") {
    throw new Error(`E2E tests only run against SIT (APP_ENV is "${process.env.APP_ENV}").`);
  }
  return { url, key, secret: process.env.SESSION_SECRET ?? "" };
}

export function serviceClient() {
  const { url, key } = requireSitEnv();
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function clearLoginAttempts(...emails: string[]) {
  const { error } = await serviceClient().from("login_attempts").delete().in("email", emails);
  if (error) throw new Error(`clearLoginAttempts: ${error.message}`);
}

export async function login(page: Page, email: string, password = E2E_PASSWORD) {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Masuk" }).click();
}

export async function expectOnLoginPage(page: Page) {
  await expect(page).toHaveURL(/\/admin\/login/);
  await expect(page.getByRole("heading", { name: "Masuk ke panel admin" })).toBeVisible();
}

/** Login form error. Scoped to the form because Next.js's route announcer also has role="alert". */
export function loginError(page: Page) {
  return page.locator("form").getByRole("alert");
}
