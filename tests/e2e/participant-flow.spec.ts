import { expect, test } from "@playwright/test";
import { generateAccessCodes } from "../../lib/access-code";
import { serviceClient } from "./fixtures";
import {
  clickNext,
  consentAndLogin,
  createCodeTracker,
  heading,
  loginApi,
  answerDemographics,
  answerLikert,
  answerMc,
  nextUntil,
  participant,
} from "./participant-helpers";

/**
 * PLAN-03 · participant skeleton (consent → login → steps → finish).
 * Codes are created directly with create_batch under the E2E admin; batches are
 * labelled "E2E P3 …". The task pages built in PLAN-04 are covered by
 * participant-tasks.spec.ts; here the flow is only walked up to the cases intro,
 * and through the questionnaire placeholders after a time-out.
 */
const codes = createCodeTracker("P3");
const makeCodes = codes.makeCodes;

test.afterAll(async () => {
  await codes.cleanUp();
});

test.describe("PLAN-03 · participant flow", () => {
  test("P3-1/P3-2 link without consent → consent → login → welcome; session data stored", async ({
    page,
  }) => {
    const [code] = await makeCodes([1]);
    await consentAndLogin(page, code);
    await expect(heading(page, "Selamat Datang")).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(0);

    const p = await participant(code);
    expect(p.status).toBe("in_progress");
    expect(p.current_page).toBe("welcome");
    expect(p.flow_version).toBe("A");
    expect(p.consent_at).not.toBeNull();
    expect(p.started_at).not.toBeNull();
    expect(p.content_version).toBeTruthy();
    const { data: events } = await serviceClient().from("events").select("type").eq("participant_id", p.id);
    const types = (events ?? []).map((e) => e.type);
    expect(types).toContain("consent");
    expect(types).toContain("session_start");
  });

  test("P3-3 the 11th unknown code from one device is rate limited", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Setuju dan masuk" }).click();
    await expect(page).toHaveURL(/\/login/);
    // A code that cannot exist (generated, never inserted).
    const [ghost] = generateAccessCodes(1);
    for (let i = 0; i < 10; i++) expect((await loginApi(page.request, ghost)).status()).toBe(404);
    const blocked = await loginApi(page.request, ghost);
    expect(blocked.status()).toBe(429);
    expect((await blocked.json()).error.code).toBe("RATE_LIMITED");
  });

  test("P3-4 cancelled and completed codes are refused with a clear message", async ({ page }) => {
    const [cancelled, completed] = await makeCodes([2, 2]);
    await serviceClient().from("participants").update({ status: "cancelled" }).eq("access_code", cancelled);
    await serviceClient().from("participants").update({ status: "completed" }).eq("access_code", completed);
    await page.goto("/");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Setuju dan masuk" }).click();
    await page.getByLabel("Kode akses").fill(cancelled);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(/sudah tidak berlaku/);
    await page.getByLabel("Kode akses").fill(completed.toLowerCase().replace(/-/g, " "));
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(/sudah selesai dipakai/);
  });

  test("P3-5…P3-9 Sel 1: timer, refresh, Berita Acara questions, autosave", async ({ page }) => {
    const [code] = await makeCodes([1]);
    await consentAndLogin(page, code);
    await clickNext(page, "Mulai penugasan");
    await expect(heading(page, "Peran dan tugas anda")).toBeVisible();
    await expect(page.getByRole("timer")).toContainText(/(40|39):\d\d/);
    let p = await participant(code);
    const minutes = (new Date(p.task_deadline!).getTime() - new Date(p.task_started_at!).getTime()) / 60_000;
    expect(minutes).toBe(40);

    await clickNext(page);
    await clickNext(page);
    await clickNext(page, "Baca kasus klien");
    await expect(heading(page, "Fakta Klien")).toBeVisible();
    await clickNext(page);
    await expect(heading(page, "Biaya yang masih meragukan")).toBeVisible();
    await page.reload();
    await expect(heading(page, "Biaya yang masih meragukan")).toBeVisible();
    await expect(page.getByRole("timer")).not.toContainText("40:00");

    await clickNext(page);
    await clickNext(page);
    await clickNext(page);
    await expect(heading(page, /Ikhtisar Berita Acara/)).toBeVisible();
    await expect(page.getByText(/sangat diperhatikan dan dievaluasi/)).toBeVisible(); // Implisit
    await clickNext(page);
    await expect(page.getByRole("alert").filter({ hasText: "Lengkapi" })).toHaveText(
      "Lengkapi jawaban pertanyaan 1 dan jawaban pertanyaan 2 terlebih dahulu.",
    );

    await page.getByRole("radio").nth(1).check(); // q1, option 2
    await page.waitForTimeout(1500); // autosave (800 ms debounce)
    await page.reload();
    await expect(page.getByRole("radio").nth(1)).toBeChecked();
    p = await participant(code);
    const { data: saved } = await serviceClient()
      .from("responses")
      .select("item_key, value")
      .eq("participant_id", p.id);
    expect(saved).toEqual([{ item_key: "ba_q1", value: 2 }]);

    await page.getByRole("radio").nth(3).check(); // q2, option 1
    await clickNext(page);
    await clickNext(page, "Buka memo penugasan");
    await expect(heading(page, "Memo Penugasan")).toBeVisible();
    await expect(page.getByText("Anda tidak harus mencantumkan nama dan alamat email anda")).toBeVisible(); // Lemah
    await expect(page.getByLabel("Alamat email")).toHaveCount(0);
    await clickNext(page);
    await expect(heading(page, "Mempelajari kasus serupa")).toBeVisible();
    p = await participant(code);
    expect(p.current_round).toBe(1);
  });

  test("P3-8 Sel 4: Eksplisit Berita Acara without questions, Memo Kuat needs name and email", async ({
    page,
  }) => {
    const [code] = await makeCodes([4]);
    await consentAndLogin(page, code);
    await nextUntil(page, /Ikhtisar Berita Acara/);
    await expect(page.getByText(/menginginkan posisi tertentu/)).toBeVisible();
    await expect(page.getByRole("radio")).toHaveCount(0);
    await clickNext(page);
    await clickNext(page, "Buka memo penugasan");
    await expect(
      page.getByText("Anda harus mencantumkan nama anda dan alamat pos elektronik (email anda)"),
    ).toBeVisible();
    await page.getByLabel("Nama lengkap").fill("Budi Santoso");
    await page.getByLabel("Alamat email").fill("budi@");
    await clickNext(page);
    await expect(page.getByRole("alert").filter({ hasText: "Lengkapi" })).toHaveText(
      "Lengkapi alamat email terlebih dahulu.",
    );
    await page.getByLabel("Alamat email").fill("Budi@Example.com");
    await clickNext(page);
    await expect(heading(page, "Mempelajari kasus serupa")).toBeVisible();
    const p = await participant(code);
    const { data: contact } = await serviceClient()
      .from("contacts")
      .select("name, email")
      .eq("participant_id", p.id)
      .single();
    expect(contact).toEqual({ name: "Budi Santoso", email: "budi@example.com" });
    expect(await page.content()).not.toMatch(/"cell"|Sel 4/);
  });

  test("P3-10/P3-11 second tab takes over the session; stale page is refused", async ({ page, browser }) => {
    const [code] = await makeCodes([2]);
    await consentAndLogin(page, code);
    await clickNext(page, "Mulai penugasan");
    await expect(heading(page, "Peran dan tugas anda")).toBeVisible();

    const stale = await page.request.post("/api/p/advance", { data: { from: "welcome" } });
    expect(stale.status()).toBe(409);
    expect((await stale.json()).error.code).toBe("STALE_PAGE");

    const other = await browser.newContext();
    const page2 = await other.newPage();
    await consentAndLogin(page2, code);
    await expect(
      page2.getByRole("status").filter({ hasText: "Melanjutkan dari halaman terakhir" }),
    ).toBeVisible();
    await expect(heading(page2, "Peran dan tugas anda")).toBeVisible();

    const replaced = await page.request.patch("/api/p/responses", { data: { page: "role", items: {} } });
    expect(replaced.status()).toBe(409);
    expect((await replaced.json()).error.code).toBe("SESSION_REPLACED");
    await page.reload();
    await expect(heading(page, "Sesi ini sedang dibuka di perangkat atau tab lain.")).toBeVisible();
    await other.close();
  });

  test("P3-12/P3-13/P3-14 time-up → questionnaire → Survey Selesai; events stored", async ({ page }) => {
    const [code] = await makeCodes([3]);
    await consentAndLogin(page, code);
    await clickNext(page, "Mulai penugasan");
    await clickNext(page);
    await expect(heading(page, "Aturan penugasan")).toBeVisible();

    let p = await participant(code);
    await serviceClient()
      .from("participants")
      .update({ task_deadline: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", p.id);
    await page.reload();
    await expect(heading(page, "Waktu penugasan telah habis")).toBeVisible();
    p = await participant(code);
    expect(p.timed_out).toBe(true);
    expect(p.timed_out_at_page).toBe("rules");
    expect(p.task_end_at).toBe(p.task_deadline);

    await clickNext(page, "Lanjut ke pertanyaan");
    await expect(heading(page, "Pengalaman selama penugasan")).toBeVisible(); // mc_choice
    await answerMc(page);
    await clickNext(page);
    await expect(heading(page, /\(lanjutan\)/)).toBeVisible(); // mc_likert
    await answerLikert(page);
    await clickNext(page);
    await expect(heading(page, "Data demografi")).toBeVisible();
    await answerDemographics(page);
    await clickNext(page);
    await expect(heading(page, /Taklimat/)).toBeVisible();
    await clickNext(page);
    await page.getByRole("button", { name: "Survey Selesai" }).click();
    await expect(heading(page, "Terima kasih")).toBeVisible();

    p = await participant(code);
    expect(p.status).toBe("completed");
    expect(p.finished_at).not.toBeNull();
    const { data: views } = await serviceClient()
      .from("events")
      .select("seq, type, page_id")
      .eq("participant_id", p.id)
      .eq("type", "page_view")
      .order("seq");
    expect(views!.length).toBeGreaterThanOrEqual(4);
    expect(views!.map((v) => v.seq)).toEqual([...views!.map((v) => v.seq)].sort((a, b) => a! - b!));

    // The code cannot be used again.
    await page.goto("/");
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Setuju dan masuk" }).click();
    await page.getByLabel("Kode akses").fill(code);
    await page.getByRole("button", { name: "Masuk" }).click();
    await expect(page.locator("form").getByRole("alert")).toHaveText(/sudah selesai dipakai/);
  });
});
