import { expect, test, type Page } from "@playwright/test";
import { ACCESS_CODE_PATTERN } from "../../lib/access-code";
import { ACCOUNTS, login, serviceClient } from "./fixtures";

/** Batches created here stay in SIT (audit logs are append-only); labels start with "E2E". */
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");

async function loginAdmin(page: Page) {
  await login(page, ACCOUNTS.admin.email);
  await expect(page).toHaveURL(/\/admin$/);
}

async function batchParticipants(label: string) {
  const db = serviceClient();
  const { data: batch } = await db.from("batches").select("id").eq("label", label).single();
  const { data } = await db
    .from("participants")
    .select("id, access_code, cell, status")
    .eq("batch_id", batch!.id);
  return { batchId: batch!.id, participants: data ?? [] };
}

/** Creates a batch through the API (as the logged-in admin) and returns its participants. */
async function createBatchViaApi(page: Page, body: Record<string, unknown>) {
  const res = await page.request.post("/api/admin/batches", { data: body });
  expect(res.status()).toBe(201);
  return batchParticipants(String(body.label));
}

test.describe("PLAN-02 · generate & participant list", () => {
  test("P2-1/P2-7 random batch of 40 gives 10 per cell, valid codes, CSV without cell, audit", async ({
    page,
  }) => {
    const label = `E2E acak ${stamp()}`;
    const startedAt = new Date().toISOString();
    await loginAdmin(page);
    await page.goto("/admin/generate");
    await page.getByLabel("Jumlah kode").fill("40");
    await page.getByLabel("Label batch").fill(label);
    await page.getByRole("button", { name: "Generate 40 kode" }).click();
    await expect(page.getByText(`40 kode berhasil dibuat di batch "${label}".`)).toBeVisible();

    const { batchId, participants } = await batchParticipants(label);
    expect(participants).toHaveLength(40);
    for (const c of [1, 2, 3, 4]) expect(participants.filter((p) => p.cell === c)).toHaveLength(10);
    for (const p of participants) expect(p.access_code).toMatch(ACCESS_CODE_PATTERN);

    const csv = await page.request.get(`/api/admin/batches/${batchId}/codes?format=csv`);
    expect(csv.status()).toBe(200);
    const text = await csv.text();
    expect(text.replace(/^﻿/, "").split("\n")[0]).toBe("code,batch,login_link");
    expect(text.toLowerCase()).not.toContain("cell");
    expect(csv.headers()["content-disposition"]).toMatch(/SIT_taxlab_codes_/);

    const { count } = await serviceClient()
      .from("audit_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", "generate")
      .gte("created_at", startedAt)
      .contains("detail", { label });
    expect(count).toBe(1);
  });

  test("P2-2 manual batch: preview equals result", async ({ page }) => {
    const label = `E2E manual ${stamp()}`;
    await loginAdmin(page);
    await page.goto("/admin/generate?mode=manual&cell=4");
    await page.getByLabel("Jumlah kode").fill("8");
    await page.getByLabel("Label batch").fill(label);
    const preview = page.getByRole("table").first();
    await expect(preview.getByRole("row", { name: /Sel 4/ })).toContainText("+8");
    await expect(preview.getByRole("row", { name: /Sel 1/ })).toContainText("+0");
    await page.getByRole("button", { name: "Generate 8 kode" }).click();
    await expect(page.getByText("8 kode berhasil dibuat")).toBeVisible();

    const { participants } = await batchParticipants(label);
    expect(participants).toHaveLength(8);
    expect(participants.every((p) => p.cell === 4)).toBe(true);
  });

  test("P2-3 change cell of a not-started code, with audit", async ({ page }) => {
    await loginAdmin(page);
    const { participants } = await createBatchViaApi(page, {
      quantity: 1,
      label: `E2E ubah sel ${stamp()}`,
      mode: "manual",
      cell: 1,
    });
    const p = participants[0];

    await page.goto(`/admin/participants?q=${p.access_code}`);
    await page.getByRole("button", { name: "Ubah sel" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Sel baru").selectOption("3");
    await dialog.getByLabel(/Alasan/).fill("kode tertukar saat dibagikan (uji e2e)");
    await dialog.getByRole("button", { name: "Simpan perubahan" }).click();
    await expect(page.getByRole("dialog")).toBeHidden();
    await expect(page.getByRole("row", { name: new RegExp(p.access_code) })).toContainText("Sel 3");

    const db = serviceClient();
    const { data } = await db.from("participants").select("cell").eq("id", p.id).single();
    expect(data!.cell).toBe(3);
    const { data: audit } = await db
      .from("audit_logs")
      .select("detail")
      .eq("action", "change_cell")
      .eq("participant_id", p.id);
    expect(audit).toHaveLength(1);
    expect(audit![0].detail).toMatchObject({ from: 1, to: 3 });
  });

  test("P2-4 changing the cell of a started participant is refused by the API", async ({ page }) => {
    await loginAdmin(page);
    const { participants } = await createBatchViaApi(page, {
      quantity: 1,
      label: `E2E terkunci ${stamp()}`,
      mode: "manual",
      cell: 2,
    });
    const p = participants[0];
    await serviceClient()
      .from("participants")
      .update({ status: "in_progress", started_at: new Date().toISOString() })
      .eq("id", p.id);

    try {
      const res = await page.request.patch(`/api/admin/participants/${p.id}/cell`, {
        data: { cell: 1, reason: "mencoba ubah sel setelah mulai" },
      });
      expect(res.status()).toBe(409);
      expect((await res.json()).error.code).toBe("CELL_LOCKED");
      const { data } = await serviceClient().from("participants").select("cell").eq("id", p.id).single();
      expect(data!.cell).toBe(2);
    } finally {
      // The fake "in progress" participant must not stay active (dashboard, live monitor).
      await serviceClient()
        .from("participants")
        .update({ status: "cancelled", started_at: null })
        .eq("id", p.id);
    }
  });

  test("P2-5 deactivate a not-started code", async ({ page }) => {
    await loginAdmin(page);
    const { participants } = await createBatchViaApi(page, {
      quantity: 1,
      label: `E2E nonaktif ${stamp()}`,
      mode: "random",
    });
    const p = participants[0];

    await page.goto(`/admin/participants?q=${p.access_code}`);
    await page.getByRole("button", { name: "Nonaktifkan" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Alasan/).fill("kartu kode hilang (uji e2e)");
    await dialog.getByRole("button", { name: "Nonaktifkan" }).click();
    await expect(page.getByRole("row", { name: new RegExp(p.access_code) })).toContainText("Dibatalkan");

    const { data } = await serviceClient().from("participants").select("status").eq("id", p.id).single();
    expect(data!.status).toBe("cancelled");
  });

  test("P2-6 viewer cannot generate (page and API)", async ({ page }) => {
    await login(page, ACCOUNTS.viewer.email);
    await expect(page).toHaveURL(/\/admin$/);
    await page.goto("/admin/generate");
    await expect(page.getByText("Akses ditolak")).toBeVisible();
    const res = await page.request.post("/api/admin/batches", {
      data: { quantity: 1, mode: "random", label: "E2E viewer" },
    });
    expect(res.status()).toBe(403);
  });

  test("API without a session answers 401", async ({ request }) => {
    const res = await request.post("/api/admin/batches", { data: { quantity: 1, mode: "random" } });
    expect(res.status()).toBe(401);
  });
});
