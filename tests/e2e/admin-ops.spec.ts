import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, login, serviceClient } from "./fixtures";
import { createCodeTracker, participant } from "./participant-helpers";

/**
 * PLAN-07b · reset session, delete contacts, live, target, audit log: PA-12 … PA-16.
 * Participants are seeded straight into SIT (as the participant app would write them).
 */
const codes = createCodeTracker("PB");
const REASON = "ponsel mati di tengah sesi, data tidak pulih";

test.afterAll(async () => {
  await codes.cleanUp();
});

async function loginAdmin(page: Page, email: string = ACCOUNTS.admin.email) {
  await login(page, email);
  await expect(page).toHaveURL(/\/admin$/);
}

/** An in-progress participant with answers, events and a contact row. */
async function seedInProgress(code: string, extra: Record<string, unknown> = {}, receivedAt?: string) {
  const db = serviceClient();
  const p = await participant(code);
  const session = randomUUID();
  const now = Date.now();
  const up = await db
    .from("participants")
    .update({
      status: "in_progress",
      flow_version: "B",
      content_version: "e2e",
      session_id: session,
      consent_at: new Date(now - 20 * 60_000).toISOString(),
      started_at: new Date(now - 15 * 60_000).toISOString(),
      task_started_at: new Date(now - 14 * 60_000).toISOString(),
      task_end_at: new Date(now + 26 * 60_000).toISOString(),
      last_seen_at: new Date(now - 10_000).toISOString(),
      current_page: "cases_r1",
      current_round: 1,
      ...extra,
    })
    .eq("id", p.id);
  if (up.error) throw new Error(up.error.message);
  const r = await db.from("responses").upsert([
    { participant_id: p.id, item_key: "rank_case03_r1", value: 2 },
    { participant_id: p.id, item_key: "confidence_r1", value: 70 },
  ]);
  if (r.error) throw new Error(r.error.message);
  const e = await db.from("events").insert([
    { participant_id: p.id, session_id: session, source: "server", type: "consent", client_ts: new Date(now - 20 * 60_000).toISOString(), ...(receivedAt ? { received_at: receivedAt } : {}) },
    { participant_id: p.id, session_id: session, seq: 1, source: "client", type: "case_open", target: "case03", round: 1, client_ts: new Date(now - 5 * 60_000).toISOString(), ...(receivedAt ? { received_at: receivedAt } : {}) },
  ]);
  if (e.error) throw new Error(e.error.message);
  const c = await db.from("contacts").upsert({ participant_id: p.id, name: "Kontak PB", email: "pb@example.com", ewallet: "ovo", phone: "+6281200000000" });
  if (c.error) throw new Error(c.error.message);
  return participant(code);
}

async function lastAudit(action: string, participantId?: string) {
  let q = serviceClient().from("audit_logs").select("id, action, detail, participant_id").eq("action", action);
  if (participantId) q = q.eq("participant_id", participantId);
  const { data } = await q.order("id", { ascending: false }).limit(1);
  return data?.[0];
}

test.describe("PLAN-07b reset session", () => {
  test("PA-12 API: validates, resets in_progress, archives, keeps cell and contacts, audits", async ({ page }) => {
    const [code] = await codes.makeCodes([3]);
    const p = await seedInProgress(code);
    await loginAdmin(page);
    const url = `/api/admin/participants/${p.id}/reset`;

    const wrong = await page.request.post(url, { data: { reason: REASON, confirmCode: "TX-ZZZZ-ZZZZ" } });
    expect(wrong.status()).toBe(400);
    expect((await wrong.json()).error.code).toBe("CODE_MISMATCH");
    const short = await page.request.post(url, { data: { reason: "singkat", confirmCode: code } });
    expect(short.status()).toBe(400);
    expect((await participant(code)).status).toBe("in_progress");

    const ok = await page.request.post(url, { data: { reason: REASON, confirmCode: code.toLowerCase() } });
    expect(ok.status()).toBe(200);

    const after = await participant(code);
    expect(after.status).toBe("not_started");
    expect(after.cell).toBe(3);
    expect(after.session_id).toBeNull();
    expect(after.current_page).toBeNull();
    expect(after.started_at).toBeNull();
    expect(after.task_end_at).toBeNull();

    const db = serviceClient();
    const responses = await db.from("responses").select("item_key").eq("participant_id", p.id);
    const events = await db.from("events").select("id").eq("participant_id", p.id);
    expect(responses.data).toHaveLength(0);
    expect(events.data).toHaveLength(0);

    const archive = await db.from("archived_sessions").select("*").eq("participant_id", p.id);
    expect(archive.data).toHaveLength(1);
    const snap = archive.data![0].snapshot as { responses: unknown[]; events: unknown[]; participant: { status: string } };
    expect(snap.responses).toHaveLength(2);
    expect(snap.events).toHaveLength(2);
    expect(snap.participant.status).toBe("in_progress");
    expect(archive.data![0].reason).toBe(REASON);

    const contact = await db.from("contacts").select("name").eq("participant_id", p.id);
    expect(contact.data?.[0]?.name).toBe("Kontak PB");

    const audit = await lastAudit("reset_session", p.id);
    expect(audit?.detail).toMatchObject({ reason: REASON, from_status: "in_progress", responses: 2, events: 2 });
  });

  test("PA-12 completed, not_started and unknown participants cannot be reset", async ({ page }) => {
    const [done, fresh] = await codes.makeCodes([1, 2]);
    const p = await seedInProgress(done, { status: "completed", finished_at: new Date().toISOString(), current_page: "finish" });
    await loginAdmin(page);
    const res = await page.request.post(`/api/admin/participants/${p.id}/reset`, { data: { reason: REASON, confirmCode: done } });
    expect(res.status()).toBe(409);
    expect((await res.json()).error.code).toBe("NOT_RESETTABLE");
    expect((await participant(done)).status).toBe("completed");
    const responses = await serviceClient().from("responses").select("item_key").eq("participant_id", p.id);
    expect(responses.data).toHaveLength(2);

    const f = await participant(fresh);
    const notStarted = await page.request.post(`/api/admin/participants/${f.id}/reset`, { data: { reason: REASON, confirmCode: fresh } });
    expect(notStarted.status()).toBe(409);

    const unknown = await page.request.post(`/api/admin/participants/${randomUUID()}/reset`, { data: { reason: REASON, confirmCode: fresh } });
    expect(unknown.status()).toBe(404);
  });

  test("PA-12 viewer gets 403", async ({ page }) => {
    const [code] = await codes.makeCodes([1]);
    const p = await seedInProgress(code);
    await loginAdmin(page, ACCOUNTS.viewer.email);
    const res = await page.request.post(`/api/admin/participants/${p.id}/reset`, { data: { reason: REASON, confirmCode: code } });
    expect(res.status()).toBe(403);
    expect((await participant(code)).status).toBe("in_progress");
  });

  test("PA-12 dialog on the detail page: needs the retyped code, then the participant is Belum mulai", async ({ page }) => {
    const [code] = await codes.makeCodes([2]);
    await seedInProgress(code);
    await loginAdmin(page);
    await page.goto(`/admin/participants/${code}`);
    await page.getByRole("button", { name: "Reset sesi" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByLabel(/Alasan/).fill(REASON);
    await expect(dialog.getByRole("button", { name: "Reset sesi" })).toBeDisabled();
    await dialog.getByLabel(/Ketik ulang kode/).fill("TX-SALAH-SALAH");
    await dialog.getByRole("button", { name: "Reset sesi" }).click();
    await expect(dialog.getByRole("alert")).toContainText("tidak sama");
    await dialog.getByLabel(/Ketik ulang kode/).fill(code);
    await dialog.getByRole("button", { name: "Reset sesi" }).click();
    await expect(dialog).toBeHidden();
    await expect(page.getByText("Belum mulai").first()).toBeVisible();
    await expect(page.getByRole("button", { name: "Reset sesi" })).toHaveCount(0);
  });
});

test.describe("PLAN-07b contacts", () => {
  test("PA-13 delete one batch: contacts gone, research data and other batches untouched, audited", async ({ page }) => {
    const [a] = await codes.makeCodes([1]);
    const [b] = await codes.makeCodes([2]); // separate batch
    const pa = await seedInProgress(a);
    const pb = await seedInProgress(b);
    await loginAdmin(page);

    const refused = await page.request.delete("/api/admin/contacts", { data: { confirm: "hapus", batchId: pa.batch_id } });
    expect(refused.status()).toBe(400);
    expect((await refused.json()).error.code).toBe("NOT_CONFIRMED");

    const ok = await page.request.delete("/api/admin/contacts", { data: { confirm: "HAPUS", batchId: pa.batch_id } });
    expect(ok.status()).toBe(200);
    expect((await ok.json()).deleted).toBe(1);

    const db = serviceClient();
    expect((await db.from("contacts").select("participant_id").eq("participant_id", pa.id)).data).toHaveLength(0);
    expect((await db.from("contacts").select("participant_id").eq("participant_id", pb.id)).data).toHaveLength(1);
    expect((await db.from("responses").select("item_key").eq("participant_id", pa.id)).data).toHaveLength(2);

    const audit = await lastAudit("delete_contacts");
    expect(audit?.detail).toMatchObject({ scope: "batch", batch_id: pa.batch_id, deleted: 1 });
  });

  test("PA-13 viewer gets 403", async ({ page }) => {
    await loginAdmin(page, ACCOUNTS.viewer.email);
    const res = await page.request.delete("/api/admin/contacts", { data: { confirm: "HAPUS" } });
    expect(res.status()).toBe(403);
  });

  test("PA-13 export page: delete card needs HAPUS typed", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/export");
    await expect(page.getByRole("heading", { name: "Hapus data kontak" })).toBeVisible();
    const button = page.getByRole("button", { name: "Hapus data kontak" });
    await expect(button).toBeDisabled();
    await page.getByLabel("Ketik HAPUS untuk mengonfirmasi").fill("HAPUS");
    await expect(button).toBeEnabled();
  });
});

test.describe("PLAN-07b live", () => {
  test("PA-14 live API: position, round, time left, inactive after 5 minutes", async ({ page }) => {
    const [active, idle] = await codes.makeCodes([1, 4]);
    await seedInProgress(active);
    // Old last_seen and old events: the idle participant must not look active.
    const old = new Date(Date.now() - 12 * 60_000).toISOString();
    await seedInProgress(idle, { current_page: "rec_r2", current_round: 2, last_seen_at: old }, old);
    await loginAdmin(page);

    const res = await page.request.get("/api/admin/live");
    expect(res.status()).toBe(200);
    const body = (await res.json()) as { rows: { code: string; cell: number; page: string; round: number; remainingSec: number | null; inactive: boolean }[] };
    const a = body.rows.find((r) => r.code === active)!;
    const i = body.rows.find((r) => r.code === idle)!;
    expect(a).toMatchObject({ cell: 1, page: "cases_r1", round: 1, inactive: false });
    expect(a.remainingSec).toBeGreaterThan(24 * 60);
    expect(a.remainingSec).toBeLessThanOrEqual(26 * 60);
    expect(i).toMatchObject({ cell: 4, page: "rec_r2", round: 2, inactive: true });
  });

  test("PA-14 dashboard shows the live table with the participant and its position", async ({ page }) => {
    const [code] = await codes.makeCodes([2]);
    await seedInProgress(code);
    await loginAdmin(page);
    const row = page.getByTestId("live-row").filter({ hasText: code });
    await expect(row).toContainText("Putaran 1 · Daftar kasus");
    await expect(row).toContainText("Sel 2");
  });

  test("PA-14 live API needs a session", async ({ request }) => {
    const res = await request.get("/api/admin/live");
    expect([401, 307, 308]).toContain(res.status());
  });
});

test.describe("PLAN-07b target", () => {
  test.describe.configure({ mode: "serial" });

  async function currentTarget(): Promise<number> {
    const { data } = await serviceClient().from("settings").select("value").eq("key", "target_per_cell").single();
    return Number(data!.value);
  }

  test("PA-15 range 1–500, dashboard uses the new target, audited, viewer refused", async ({ page }) => {
    const original = await currentTarget();
    try {
      await loginAdmin(page);
      for (const bad of [0, 501, 2.5, "30", null]) {
        const res = await page.request.patch("/api/admin/settings", { data: { targetPerCell: bad } });
        expect(res.status()).toBe(400);
        expect((await res.json()).error.code).toBe("INVALID_TARGET");
      }
      expect(await currentTarget()).toBe(original);

      const next = original === 41 ? 42 : 41;
      const ok = await page.request.patch("/api/admin/settings", { data: { targetPerCell: next } });
      expect(ok.status()).toBe(200);
      expect(await currentTarget()).toBe(next);
      expect((await lastAudit("update_target"))?.detail).toMatchObject({ from: original, to: next });

      await page.goto("/admin");
      await expect(page.getByText(`target ${next} partisipan selesai per sel`)).toBeVisible();
    } finally {
      await serviceClient().from("settings").update({ value: original }).eq("key", "target_per_cell");
    }

    await page.context().clearCookies();
    await loginAdmin(page, ACCOUNTS.viewer.email);
    const viewer = await page.request.patch("/api/admin/settings", { data: { targetPerCell: 10 } });
    expect(viewer.status()).toBe(403);
    expect(await currentTarget()).toBe(original);
  });

  test("PA-15 dashboard form saves a new target", async ({ page }) => {
    const original = await currentTarget();
    try {
      await loginAdmin(page);
      const next = original === 37 ? 38 : 37;
      await page.getByLabel("Target selesai per sel").fill(String(next));
      await page.getByRole("button", { name: "Simpan target" }).click();
      await expect(page.getByText("Target disimpan.")).toBeVisible();
      await expect(page.getByText(`target ${next} partisipan selesai per sel`)).toBeVisible();
    } finally {
      await serviceClient().from("settings").update({ value: original }).eq("key", "target_per_cell");
    }
  });
});

test.describe("PLAN-07b audit log", () => {
  test("PA-16 shows actions with admin, time and detail; filters work; sensitive rows marked; read only", async ({ page }) => {
    const [code] = await codes.makeCodes([3]);
    const p = await seedInProgress(code);
    await loginAdmin(page);
    const reset = await page.request.post(`/api/admin/participants/${p.id}/reset`, { data: { reason: REASON, confirmCode: code } });
    expect(reset.status()).toBe(200);

    await page.goto(`/admin/audit?code=${code}`);
    await expect(page.getByRole("heading", { name: "Audit log", level: 1 })).toBeVisible();
    const row = page.getByRole("row", { name: /Reset sesi/ });
    await expect(row).toHaveCount(1);
    await expect(row).toContainText(ACCOUNTS.admin.name);
    await expect(row).toContainText(code);
    await expect(row).toContainText("2 jawaban dan 2 event diarsipkan");
    await expect(row).toContainText(REASON);
    await expect(row).toHaveClass(/sensitive/);

    await expect(page.getByRole("button", { name: /hapus|ubah|edit/i })).toHaveCount(0);

    // Action filter: only change_cell rows (none for this code).
    await page.goto(`/admin/audit?code=${code}&action=change_cell`);
    await expect(page.getByText("Tidak ada catatan yang cocok dengan filter.")).toBeVisible();

    // Non-sensitive actions are not marked.
    await page.goto("/admin/audit?action=login");
    const login = page.getByRole("row", { name: /Masuk ke panel admin/ }).first();
    await expect(login).not.toHaveClass(/sensitive/);

    // Pagination: 50 rows per page at most.
    await page.goto("/admin/audit");
    const rows = await page.getByRole("row").count();
    expect(rows - 1).toBeLessThanOrEqual(50);
  });

  test("PA-16 audit rows cannot be changed in the database (append only)", async () => {
    const entry = await lastAudit("login");
    const db = serviceClient();
    const upd = await db.from("audit_logs").update({ action: "tampered" } as never).eq("id", entry!.id);
    expect(upd.error).not.toBeNull();
    const del = await db.from("audit_logs").delete().eq("id", entry!.id);
    expect(del.error).not.toBeNull();
  });

  test("PA-16 viewer cannot open the audit log", async ({ page }) => {
    await loginAdmin(page, ACCOUNTS.viewer.email);
    await page.goto("/admin/audit");
    await expect(page.getByText("Akses ditolak")).toBeVisible();
  });
});
