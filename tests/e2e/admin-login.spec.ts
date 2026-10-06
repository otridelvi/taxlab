import { expect, test } from "@playwright/test";
import { ADMIN_SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, signAdminSession } from "../../lib/session";
import {
  ACCOUNTS,
  clearLoginAttempts,
  expectOnLoginPage,
  login,
  loginError,
  requireSitEnv,
  serviceClient,
} from "./fixtures";

test.describe("PLAN-01 · admin login → dashboard", () => {
  test("T-1 valid admin logs in, sees the dashboard and a login audit is written", async ({ page }) => {
    const startedAt = new Date().toISOString();
    await login(page, ACCOUNTS.admin.email);

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "Dasbor" })).toBeVisible();
    await expect(page.getByText(ACCOUNTS.admin.name)).toBeVisible();
    await expect(page.getByRole("heading", { name: "Progres per sel" })).toBeVisible();

    const { data: admin } = await serviceClient()
      .from("admins")
      .select("id")
      .eq("name", ACCOUNTS.admin.name)
      .single();
    const { count } = await serviceClient()
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "login")
      .eq("admin_id", admin!.id)
      .gte("created_at", startedAt);
    expect(count).toBeGreaterThanOrEqual(1);
  });

  test("T-2 wrong password shows an error and stays on the login page", async ({ page }) => {
    await login(page, ACCOUNTS.admin.email, "wrong-password-123");
    await expect(loginError(page)).toHaveText("Email atau password salah.");
    await expectOnLoginPage(page);
    await clearLoginAttempts(ACCOUNTS.admin.email);
  });

  test("T-3 auth user without an admins row is refused", async ({ page }) => {
    await login(page, ACCOUNTS.nonAdmin.email);
    await expect(loginError(page)).toHaveText("Akun ini tidak memiliki akses admin.");
    await page.goto("/admin");
    await expectOnLoginPage(page);
  });

  test("T-4 inactive admin is refused", async ({ page }) => {
    await login(page, ACCOUNTS.inactive.email);
    await expect(loginError(page)).toHaveText("Akun ini tidak memiliki akses admin.");
  });

  test("T-5 sixth failed attempt within 15 minutes is rate limited", async ({ page }) => {
    await clearLoginAttempts(ACCOUNTS.locked.email);
    for (let i = 0; i < 5; i++) {
      await login(page, ACCOUNTS.locked.email, `wrong-password-${i}`);
      await expect(loginError(page)).toHaveText("Email atau password salah.");
    }
    await login(page, ACCOUNTS.locked.email, "wrong-password-6");
    await expect(loginError(page)).toHaveText("Terlalu banyak percobaan. Coba lagi dalam 15 menit.");
    await clearLoginAttempts(ACCOUNTS.locked.email);
  });

  test("T-6 /admin without login redirects to the login page with ?next", async ({ page }) => {
    await page.goto("/admin/participants");
    await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin%2Fparticipants/);
  });

  test("T-7 a session older than 12 hours is ended", async ({ page, context, baseURL }) => {
    await login(page, ACCOUNTS.admin.email);
    await expect(page).toHaveURL(/\/admin$/);

    const { secret } = requireSitEnv();
    const cookies = await context.cookies();
    const marker = cookies.find((c) => c.name === ADMIN_SESSION_COOKIE);
    expect(marker).toBeDefined();

    // Re-sign the marker as if the login happened 13 hours ago.
    const payload = JSON.parse(Buffer.from(marker!.value.split(".")[1], "base64url").toString());
    const oldToken = await signAdminSession(
      { sub: payload.sub, loginAt: Date.now() - (SESSION_MAX_AGE_SECONDS + 3600) * 1000 },
      secret,
    );
    await context.addCookies([{ name: ADMIN_SESSION_COOKIE, value: oldToken, url: baseURL! }]);

    await page.goto("/admin");
    await expect(page).toHaveURL(/reason=expired/);
    await expect(page.getByText("Sesi berakhir, silakan masuk kembali.")).toBeVisible();

    await page.goto("/admin");
    await expectOnLoginPage(page);
  });

  test("T-8 logout ends the session", async ({ page }) => {
    await login(page, ACCOUNTS.admin.email);
    await expect(page).toHaveURL(/\/admin$/);
    await page.getByRole("button", { name: "Keluar" }).click();
    await expectOnLoginPage(page);
    await page.goto("/admin");
    await expectOnLoginPage(page);
  });

  test("T-9 viewer does not see participants, generate or audit menus", async ({ page }) => {
    await login(page, ACCOUNTS.viewer.email);
    await expect(page).toHaveURL(/\/admin$/);
    const menu = page.getByRole("navigation", { name: "Menu admin" });
    await expect(menu.getByRole("link", { name: "Dasbor" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Export data" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Partisipan" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Generate partisipan" })).toHaveCount(0);
    await expect(menu.getByRole("link", { name: "Audit log" })).toHaveCount(0);

    await page.goto("/admin/audit");
    await expect(page.getByText("Akses ditolak")).toBeVisible();
  });

  test("T-10 header shows the SIT environment label", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByRole("banner").getByText("SIT", { exact: true })).toBeVisible();
  });
});
