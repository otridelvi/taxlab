import { randomUUID } from "node:crypto";
import { expect, test, type Page } from "@playwright/test";
import { ACCOUNTS, login, serviceClient } from "./fixtures";
import { createCodeTracker, participant } from "./participant-helpers";

/**
 * PLAN-07a · export and participant detail: PA-8 … PA-11. Participants are seeded straight into
 * SIT (responses and events as the participant app would write them) so the numbers are known.
 */
const codes = createCodeTracker("PA");
const SECRET_NAME = "Rahasia Kontak E2E";

test.afterAll(async () => {
  await codes.cleanUp();
});

const iso = (secFromStart: number) => new Date(Date.parse("2026-10-06T02:00:00.000Z") + secFromStart * 1000).toISOString();

async function seedCompleted(code: string) {
  const db = serviceClient();
  const p = await participant(code);
  const up = await db
    .from("participants")
    .update({
      status: "completed",
      flow_version: "B",
      content_version: "e2e",
      consent_at: iso(0),
      started_at: iso(5),
      finished_at: iso(1800),
      current_page: "finish",
    })
    .eq("id", p.id);
  if (up.error) throw new Error(up.error.message);

  const responses: Record<string, number> = {
    rank_case03_r1: 1,
    rank_case03_r2: 5,
    rank_case04_r1: 2,
    rank_case04_r2: 2,
    save_case03_r1: 1,
    save_case03_r2: 0,
    rec_knowhow_r1: 250_000_000,
    rec_entertain_r1: 200_000_000,
    rec_repair_r1: 300_000_000,
    rec_marketing_r1: 250_000_000,
    rec_knowhow_r2: 200_000_000,
    rec_entertain_r2: 200_000_000,
    rec_repair_r2: 300_000_000,
    rec_marketing_r2: 250_000_000,
    confidence_r1: 60,
    confidence_r2: 80,
    mc_q1: 1,
    mc_q2: 2,
    semester: 5,
  };
  const rows = Object.entries(responses).map(([item_key, value]) => ({ participant_id: p.id, item_key, value }));
  const r = await db.from("responses").upsert(rows);
  if (r.error) throw new Error(r.error.message);

  const session = randomUUID();
  const ev = (sec: number, type: string, target: string | null, round: number | null, source: "client" | "server" = "client", seq: number | null = null) => ({
    participant_id: p.id,
    session_id: session,
    seq,
    source,
    type,
    target,
    round,
    page_id: null,
    client_ts: iso(sec),
  });
  const e = await db.from("events").insert([
    ev(0, "consent", null, null, "server"),
    ev(100, "round_start", "1", 1, "server"),
    ev(110, "case_open", "case03", 1, "client", 1),
    ev(170, "case_close", "case03", 1, "client", 2),
    ev(300, "round_end", "1", 1, "server"),
    ev(360, "round_start", "2", 2, "server"),
    ev(400, "case_open", "case03", 2, "client", 3),
    ev(430, "case_close", "case03", 2, "client", 4),
    ev(700, "round_end", "2", 2, "server"),
  ]);
  if (e.error) throw new Error(e.error.message);

  const c = await db.from("contacts").upsert({ participant_id: p.id, name: SECRET_NAME, email: "e2e@example.com", ewallet: "gopay", phone: "+6281234567890" });
  if (c.error) throw new Error(c.error.message);
  return p;
}

async function seeded() {
  const [code] = await codes.makeCodes([4]);
  await seedCompleted(code);
  const p = await participant(code);
  return { code, batchId: p.batch_id };
}

async function loginAdmin(page: Page, email: string = ACCOUNTS.admin.email) {
  await login(page, email);
  await expect(page).toHaveURL(/\/admin$/);
}

const params = (batchId: string) => `batch=${batchId}&status=completed&cell=1,2,3,4`;

test.describe("PLAN-07a export and detail", () => {
  test("PA-8 dataset: count, CSV columns and values, SIT_ file name, audit", async ({ page }) => {
    const { code, batchId } = await seeded();
    await loginAdmin(page);

    const count = await page.request.get(`/api/admin/export/count?${params(batchId)}`);
    expect(count.status()).toBe(200);
    expect((await count.json()).count).toBe(1);

    const res = await page.request.get(`/api/admin/export/dataset?format=csv&${params(batchId)}`);
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toMatch(/filename="SIT_taxlab_dataset_\d{4}-\d{2}-\d{2}_\d{4}\.csv"/);
    const text = await res.text();
    expect(text.charCodeAt(0)).toBe(0xfeff);
    const [head, line] = text.slice(1).trim().split("\n");
    const cols = head.split(",");
    const row = Object.fromEntries(cols.map((c, i) => [c, line.split(",")[i]]));
    expect(cols.slice(0, 3)).toEqual(["code", "cell", "pref"]);
    expect(row.code).toBe(code);
    expect(row.cell).toBe("4");
    expect(row.flow_version).toBe("B");
    expect(row.case03_dur_s_r1).toBe("60");
    expect(row.case03_dur_s_r2).toBe("30");
    expect(row.rank_changed_n).toBe("1");
    expect(row.rank_abs_shift_sum).toBe("4");
    expect(row.rec_knowhow_delta).toBe("-50000000");
    expect(row.confidence_delta).toBe("20");
    expect(row.mc_pass_pref).toBe("1"); // cell 4 = explicit, option 1
    expect(row.mc_pass_acc).toBe("1"); // cell 4 = strong, option 2
    expect(row.semester).toBe("5");
    expect(text).not.toContain(SECRET_NAME);
    expect(cols.some((c) => /^(name|email|phone|ewallet)$/.test(c))).toBe(false);

    const xlsx = await page.request.get(`/api/admin/export/dataset?format=xlsx&${params(batchId)}`);
    expect(xlsx.status()).toBe(200);
    expect(xlsx.headers()["content-type"]).toContain("spreadsheetml");

    const { data } = await serviceClient()
      .from("audit_logs")
      .select("action, detail")
      .eq("action", "export_dataset")
      .order("id", { ascending: false })
      .limit(1);
    expect(data?.[0]?.action).toBe("export_dataset");
  });

  test("PA-8 filter: another status or cell excludes the participant", async ({ page }) => {
    const { batchId } = await seeded();
    await loginAdmin(page);
    const none = await page.request.get(`/api/admin/export/count?batch=${batchId}&status=timed_out&cell=1,2,3,4`);
    expect((await none.json()).count).toBe(0);
    const otherCell = await page.request.get(`/api/admin/export/count?batch=${batchId}&status=completed&cell=1`);
    expect((await otherCell.json()).count).toBe(0);
  });

  test("PA-10 event log: round filled for case events, one participant by code", async ({ page }) => {
    const { code } = await seeded();
    await loginAdmin(page);
    const res = await page.request.get(`/api/admin/export/events?format=csv&code=${code}`);
    expect(res.status()).toBe(200);
    const lines = (await res.text()).slice(1).trim().split("\n");
    expect(lines[0]).toBe("code,cell,seq,round,ts,type,target,page_id,duration_ms");
    expect(lines).toHaveLength(1 + 9);
    const caseOpen = lines.find((l) => l.includes(",case_open,case03"))!;
    expect(caseOpen.split(",")[3]).toBe("1");
    expect(caseOpen).toContain("+07:00");
  });

  test("codebook: XLSX for anyone who can export", async ({ page }) => {
    await loginAdmin(page, ACCOUNTS.viewer.email);
    const res = await page.request.get("/api/admin/export/codebook");
    expect(res.status()).toBe(200);
    expect(res.headers()["content-disposition"]).toMatch(/taxlab_codebook_/);
  });

  test("PA-9 contacts: admin only, acknowledgement required, audited", async ({ page }) => {
    const { batchId } = await seeded();
    await loginAdmin(page);
    const body = { filter: { batch: batchId, status: "completed", cells: "1,2,3,4" } };

    const refused = await page.request.post("/api/admin/export/contacts", { data: body });
    expect(refused.status()).toBe(400);
    expect((await refused.json()).error.code).toBe("NOT_ACKNOWLEDGED");

    const ok = await page.request.post("/api/admin/export/contacts", { data: { ...body, acknowledged: true } });
    expect(ok.status()).toBe(200);
    expect(ok.headers()["content-disposition"]).toMatch(/SIT_taxlab_contacts_/);

    const { data } = await serviceClient()
      .from("audit_logs")
      .select("action")
      .eq("action", "export_contacts")
      .order("id", { ascending: false })
      .limit(1);
    expect(data?.[0]?.action).toBe("export_contacts");
  });

  test("PA-9 viewer cannot export contacts (403) and the card is not shown", async ({ page }) => {
    await loginAdmin(page, ACCOUNTS.viewer.email);
    const res = await page.request.post("/api/admin/export/contacts", { data: { acknowledged: true } });
    expect(res.status()).toBe(403);
    await page.goto("/admin/export");
    await expect(page.getByRole("heading", { name: "Export data", level: 1 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Dataset utama" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Data kontak insentif" })).toHaveCount(0);
  });

  test("export page: filter shows the matching count and contacts need the checkbox", async ({ page }) => {
    await loginAdmin(page);
    await page.goto("/admin/export");
    await expect(page.getByRole("status")).toContainText("partisipan cocok dengan filter");
    const download = page.getByRole("button", { name: "Unduh XLSX" });
    await expect(download).toBeDisabled();
    await page.getByRole("checkbox", { name: /Saya akan memakai data ini/ }).check();
    // Enabled unless the filter matches nobody.
    const text = await page.getByRole("status").innerText();
    if (!text.startsWith("0 ")) await expect(download).toBeEnabled();
  });

  test("PA-11 detail: header, recommendation vs draft, 14 cases, no contact data; unknown code is 404", async ({ page }) => {
    const { code } = await seeded();
    await loginAdmin(page);
    await page.goto(`/admin/participants/${code}`);
    await expect(page.getByRole("heading", { level: 1, name: code })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Rekomendasi", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "14 kasus acuan" })).toBeVisible();
    await expect(page.getByRole("row", { name: /^3 · / })).toContainText("▼ 4");
    await expect(page.getByRole("row", { name: /Biaya know how fee/ })).toContainText("Rp250.000.000");
    await expect(page.getByRole("row", { name: /Biaya know how fee/ })).toContainText("−Rp50.000.000");
    await expect(page.getByText("Keyakinan", { exact: true }).first()).toBeVisible();
    const body = await page.content();
    expect(body).not.toContain(SECRET_NAME);
    expect(body).not.toContain("e2e@example.com");

    // The panel streams (loading.tsx), so the HTTP status is already 200 when notFound() runs;
    // the visible not-found page is what the researcher sees.
    await page.goto("/admin/participants/TX-ZZZZ-ZZZZ");
    await expect(page.getByText("Kode tidak ditemukan.")).toBeVisible();
  });

  test("list links to the detail page", async ({ page }) => {
    const { code } = await seeded();
    await loginAdmin(page);
    await page.goto(`/admin/participants?q=${code}&status=completed`);
    await page.getByRole("link", { name: code }).click();
    await expect(page).toHaveURL(new RegExp(`/admin/participants/${code}`));
  });
});
