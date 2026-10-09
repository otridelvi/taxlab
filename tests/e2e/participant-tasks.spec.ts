import { expect, test, type Page } from "@playwright/test";
import { rankKey, saveKey } from "../../content/flow";
import { serviceClient } from "./fixtures";
import {
  AUTOSAVE_WAIT,
  answerAllCases,
  answerCase,
  answerConfidence,
  answerFirstOptions,
  answerRecommendation,
  caseRow,
  completeCaseAnswers,
  confidenceBox,
  consentAndLogin,
  createCodeTracker,
  eventsOf,
  heading,
  jumpTo,
  nextButton,
  openDetail,
  participant,
  REC_LABELS,
  savedAnswers,
  waitForEvents,
} from "./participant-helpers";

/**
 * PLAN-04 · case list, menu Berkas, knowledge questions, recommendation, confidence,
 * Reviu Atasan, over two rounds (scenarios P4-1 … P4-14). Participants are logged in
 * through the UI and then placed on the step under test with jumpTo(); P4-13 walks the
 * whole task by clicking.
 */
const codes = createCodeTracker("P4");

test.afterAll(async () => {
  await codes.cleanUp();
});

/** New participant of `cell`, logged in and standing on `step`. */
async function startAt(page: Page, cell: number, step: string): Promise<string> {
  const [code] = await codes.makeCodes([cell]);
  await consentAndLogin(page, code);
  await jumpTo(code, step);
  await page.goto("/task");
  return code;
}

const dialog = (page: Page) => page.getByRole("dialog");
const summary = (page: Page) => page.locator("main").getByText(/Dibuka\s+\d+\/14/);

test.describe("PLAN-04 · cases and recommendation", () => {
  test("P4-1 opening another DETAIL closes the first; open/close events with duration, round 1", async ({
    page,
  }) => {
    const code = await startAt(page, 1, "cases_r1");
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();
    // the case list is fixed 1…14
    await expect(page.locator("li[data-case]")).toHaveCount(14);
    await expect(caseRow(page, 1)).toContainText("PT. Tugu Karya Wisata");

    await openDetail(page, 3);
    await page.waitForTimeout(400);
    await openDetail(page, 5);
    await expect(caseRow(page, 3).getByRole("region")).toHaveCount(0);
    await expect(caseRow(page, 5).getByRole("region")).toBeVisible();

    await waitForEvents(code, (rows) => rows.some((e) => e.type === "case_open" && e.target === "case05"));
    const rows = await eventsOf(code, ["case_open", "case_close"]);
    expect(rows.map((e) => `${e.type}:${e.target}`)).toEqual([
      "case_open:case03",
      "case_close:case03",
      "case_open:case05",
    ]);
    expect(rows.every((e) => e.round === 1 && e.page_id === "cases_r1")).toBe(true);
    expect(rows[1].meta).toEqual({ reason: "switch" });
    expect(rows[1].duration_ms).toBeGreaterThan(300);

    // closing with the button logs a "toggle" close
    await caseRow(page, 5).getByRole("button", { name: "Tutup detail" }).click();
    await waitForEvents(
      code,
      (r) => r.some((e) => e.type === "case_close" && e.target === "case05") || false,
      12_000,
    );
    const closes = (await eventsOf(code, ["case_close"])).filter((e) => e.target === "case05");
    expect(closes[0].meta).toEqual({ reason: "toggle" });
  });

  test("P4-2 the 'Sudah dibuka' mark survives a refresh", async ({ page }) => {
    const code = await startAt(page, 2, "cases_r1");
    await expect(summary(page)).toContainText("Dibuka 0/14");
    await openDetail(page, 3);
    await waitForEvents(code, (rows) => rows.some((e) => e.type === "case_open"));
    await expect(summary(page)).toContainText("Dibuka 1/14");
    await page.reload();
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await expect(caseRow(page, 3).getByText("Sudah dibuka")).toBeVisible();
    await expect(page.locator("li[data-case]").getByText("Sudah dibuka")).toHaveCount(1);
    await expect(summary(page)).toContainText("Dibuka 1/14");
    // detail itself starts closed again
    await expect(caseRow(page, 3).getByRole("region")).toHaveCount(0);
  });

  test("P4-3 a rank can be used once; rank_set is logged; saved after a second", async ({ page }) => {
    const code = await startAt(page, 3, "cases_r1");
    await caseRow(page, 2).getByRole("combobox").selectOption("1");
    for (const no of [1, 3, 14]) {
      const used = caseRow(page, no).getByRole("option", { name: "1 · terpakai" });
      await expect(used).toBeDisabled();
    }
    // the case itself keeps its own number selectable, and other numbers stay free
    await expect(caseRow(page, 2).getByRole("option", { name: "1", exact: true })).toBeEnabled();
    await expect(caseRow(page, 3).getByRole("option", { name: "2", exact: true })).toBeEnabled();
    await expect(page.locator("main").getByText(/Peringkat\s+1\/14/)).toBeVisible();

    await page.waitForTimeout(AUTOSAVE_WAIT);
    expect((await savedAnswers(code))[rankKey(2, 1)]).toBe(1);

    // freeing the number: "Kosongkan" removes the saved value
    await caseRow(page, 2).getByRole("combobox").selectOption("");
    await expect(caseRow(page, 3).getByRole("option", { name: "1", exact: true })).toBeEnabled();
    await page.waitForTimeout(AUTOSAVE_WAIT);
    expect((await savedAnswers(code))[rankKey(2, 1)]).toBeNull();

    await caseRow(page, 4).getByRole("combobox").selectOption("7");
    await caseRow(page, 4)
      .getByRole("radio", { name: /^Tidak,/ })
      .check();
    await page.waitForTimeout(AUTOSAVE_WAIT);
    const saved = await savedAnswers(code);
    expect(saved[rankKey(4, 1)]).toBe(7);
    expect(saved[saveKey(4, 1)]).toBe(0);
    // queued events are sent every 5 s
    await waitForEvents(code, (rows) => rows.some((e) => e.type === "save_set"), 20_000);
    const sets = await eventsOf(code, ["rank_set", "save_set"]);
    expect(sets.map((e) => `${e.type}:${e.target}:${JSON.stringify(e.meta)}`)).toEqual([
      'rank_set:case02:{"value":1}',
      'rank_set:case02:{"value":null}',
      'rank_set:case04:{"value":7}',
      'save_set:case04:{"value":0}',
    ]);
  });

  test("P4-4 Next with an incomplete list is refused and the rows are marked", async ({ page }) => {
    const code = await startAt(page, 4, "cases_r1");
    await caseRow(page, 1).getByRole("combobox").selectOption("1");
    await caseRow(page, 1).getByRole("radio", { name: /^Ya,/ }).check();
    await nextButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Lengkapi" })).toHaveText(
      "Lengkapi peringkat (1 dari 14) dan pilihan simpan (1 dari 14) terlebih dahulu.",
    );
    await expect(caseRow(page, 2).getByRole("combobox")).toHaveAttribute("aria-invalid", "true");
    await expect(caseRow(page, 1).getByRole("combobox")).not.toHaveAttribute("aria-invalid", "true");
    expect((await participant(code)).current_page).toBe("cases_r1");
    // the mark disappears once the row is answered
    await answerCase(page, 2, 2, "Tidak");
    await expect(caseRow(page, 2).getByRole("combobox")).not.toHaveAttribute("aria-invalid", "true");
  });

  test("P4-5 repeated ranks are refused by the server (422 INCOMPLETE + duplicate)", async ({ page }) => {
    const code = await startAt(page, 1, "cases_r1");
    const ranks = [1, 1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    const res = await page.request.post("/api/p/advance", {
      data: { from: "cases_r1", items: completeCaseAnswers(1, ranks) },
    });
    expect(res.status()).toBe(422);
    const { error } = await res.json();
    expect(error.code).toBe("INCOMPLETE");
    expect(error.duplicate).toEqual([rankKey(1, 1), rankKey(2, 1)]);
    expect(error.missing).toEqual([]);
    expect((await participant(code)).current_page).toBe("cases_r1");

    // out-of-range and unknown values are invalid, a missing answer is incomplete
    const bad = await page.request.patch("/api/p/responses", {
      data: { page: "cases_r1", items: { [rankKey(1, 1)]: 15 } },
    });
    expect(bad.status()).toBe(422);
    expect((await bad.json()).error.code).toBe("INVALID_ITEM");
    const partial = await page.request.post("/api/p/advance", {
      data: { from: "cases_r1", items: { [rankKey(1, 1)]: 1 } },
    });
    expect(partial.status()).toBe(422);
    expect((await partial.json()).error.missing).toHaveLength(27);

    // a valid, complete list moves on to the knowledge questions
    const ok = await page.request.post("/api/p/advance", {
      data: { from: "cases_r1", items: completeCaseAnswers(1) },
    });
    expect(ok.status()).toBe(200);
    expect((await participant(code)).current_page).toBe("covariates");
  });

  test("P4-6 knowledge questions: letters a/b/c, all five required", async ({ page }) => {
    const code = await startAt(page, 1, "covariates");
    await expect(heading(page, "Pertanyaan pengetahuan")).toBeVisible();
    await expect(page.getByRole("group")).toHaveCount(5);
    const first = page.getByRole("group").first();
    await expect(first.getByText("a.", { exact: true })).toBeVisible();
    await expect(first.getByText("b.", { exact: true })).toBeVisible();
    await expect(first.getByText("c.", { exact: true })).toBeVisible();
    await expect(page.getByText("A dan B benar")).toBeVisible();

    await nextButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Lengkapi" })).toContainText(
      "Lengkapi jawaban pertanyaan 1, jawaban pertanyaan 2, jawaban pertanyaan 3, jawaban pertanyaan 4 dan jawaban pertanyaan 5",
    );
    expect((await participant(code)).current_page).toBe("covariates");

    await page.getByRole("group").nth(0).getByRole("radio").nth(1).check();
    await page.getByRole("group").nth(3).getByRole("radio").nth(2).check();
    await page.waitForTimeout(AUTOSAVE_WAIT);
    expect(await savedAnswers(code)).toEqual({ cov_q1: 2, cov_q4: 3 });
    await page.reload();
    await expect(page.getByRole("group").nth(0).getByRole("radio").nth(1)).toBeChecked();
    for (const i of [1, 2, 4]) await page.getByRole("group").nth(i).getByRole("radio").first().check();
    await nextButton(page).click();
    await expect(heading(page, "Menyusun rekomendasi")).toBeVisible();
  });

  test("P4-7 recommendation: thousands separators, letters refused, total, stored as numbers", async ({
    page,
  }) => {
    const code = await startAt(page, 2, "rec_r1");
    await expect(heading(page, "Masukkan besaran biaya berdasarkan saran anda")).toBeVisible();
    const knowHow = page.getByLabel(REC_LABELS[0], { exact: true });
    await expect(knowHow).toHaveAttribute("inputmode", "numeric");

    await knowHow.fill("125000000");
    await expect(knowHow).toHaveValue("125.000.000");
    await expect(page.locator("output")).toHaveText("Rp125.000.000");
    await page.getByLabel(REC_LABELS[1], { exact: true }).fill("1000");
    await expect(page.locator("output")).toHaveText("Rp125.001.000");
    await page.getByLabel(REC_LABELS[2], { exact: true }).fill("12abc3");
    await expect(page.getByLabel(REC_LABELS[2], { exact: true })).toHaveValue("123");
    await page.getByLabel(REC_LABELS[3], { exact: true }).fill("abc");
    await expect(page.getByLabel(REC_LABELS[3], { exact: true })).toHaveValue("");
    await expect(page.locator("output")).toHaveText("Rp125.001.123");

    await nextButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Lengkapi" })).toHaveText(
      "Lengkapi biaya pemasaran terlebih dahulu.",
    );
    await page.waitForTimeout(AUTOSAVE_WAIT);
    const saved = await savedAnswers(code);
    expect(saved.rec_knowhow_r1).toBe(125000000);
    expect(saved.rec_entertain_r1).toBe(1000);
    expect(saved.rec_repair_r1).toBe(123);
    expect(saved.rec_marketing_r1 ?? null).toBeNull();
    expect(typeof saved.rec_knowhow_r1).toBe("number");

    // zero is a valid answer; the amounts survive a refresh
    await page.getByLabel(REC_LABELS[3], { exact: true }).fill("0");
    await page.waitForTimeout(AUTOSAVE_WAIT);
    await page.reload();
    await expect(page.getByLabel(REC_LABELS[0], { exact: true })).toHaveValue("125.000.000");
    await expect(page.getByLabel(REC_LABELS[3], { exact: true })).toHaveValue("0");
    await nextButton(page).click();
    await expect(heading(page, "Tingkat keyakinan")).toBeVisible();
    // 14 digits are refused by the API
    const tooBig = await page.request.patch("/api/p/responses", {
      data: { page: "confidence_r1", items: { rec_knowhow_r1: 10_000_000_000_000 } },
    });
    expect(tooBig.status()).toBe(422);
  });

  test("P4-8 confidence: slider and box stay in step; 101 is refused; button reads Simpan", async ({
    page,
  }) => {
    const code = await startAt(page, 3, "confidence_r1");
    await expect(heading(page, "Tingkat keyakinan")).toBeVisible();
    await expect(nextButton(page)).toHaveText("Simpan");
    const slider = page.getByRole("slider", { name: "Tingkat keyakinan dalam persen" });
    await expect(confidenceBox(page)).toHaveValue("");

    await nextButton(page).click();
    await expect(page.getByRole("alert").filter({ hasText: "Lengkapi" })).toHaveText(
      "Lengkapi tingkat keyakinan terlebih dahulu.",
    );

    await slider.fill("70");
    await expect(confidenceBox(page)).toHaveValue("70");
    await confidenceBox(page).fill("85");
    await expect(slider).toHaveValue("85");
    await confidenceBox(page).fill("101");
    await expect(confidenceBox(page)).toHaveValue("85");
    await confidenceBox(page).fill("x9y");
    await expect(confidenceBox(page)).toHaveValue("9");
    await confidenceBox(page).fill("100");
    await expect(slider).toHaveValue("100");
    await confidenceBox(page).fill("0");
    await expect(confidenceBox(page)).toHaveValue("0");
    await confidenceBox(page).fill("85");
    await page.waitForTimeout(AUTOSAVE_WAIT);
    expect((await savedAnswers(code)).confidence_r1).toBe(85);

    const over = await page.request.patch("/api/p/responses", {
      data: { page: "confidence_r1", items: { confidence_r1: 101 } },
    });
    expect(over.status()).toBe(422);
    expect((await savedAnswers(code)).confidence_r1).toBe(85);

    await nextButton(page).click();
    await expect(heading(page, "Reviu Atasan/Supervisor")).toBeVisible();
    expect((await participant(code)).current_page).toBe("review");
  });

  test("P4-9 menu Berkas in round 1: three files in the cell's variant, no Reviu, events logged", async ({
    page,
  }) => {
    const code = await startAt(page, 3, "cases_r1"); // Implisit + Kuat
    const bar = page.getByRole("navigation", { name: "Berkas penugasan" });
    await expect(bar.getByRole("button")).toHaveText(["Fakta Klien", "Berita Acara", "Memo Penugasan"]);
    await expect(bar.getByRole("button", { name: "Reviu Atasan" })).toHaveCount(0);

    await bar.getByRole("button", { name: "Berita Acara" }).click();
    await expect(dialog(page)).toBeVisible();
    await expect(dialog(page).getByText(/sangat diperhatikan dan dievaluasi/)).toBeVisible(); // Implisit
    await expect(dialog(page).getByRole("heading", { level: 2 })).toContainText("Ikhtisar Berita Acara");
    await page.waitForTimeout(500);
    // opening another file closes the first ("switch")
    await page.keyboard.press("Escape");
    await expect(dialog(page)).toHaveCount(0);
    await bar.getByRole("button", { name: "Memo Penugasan" }).click();
    await expect(
      dialog(page).getByText("Anda harus mencantumkan nama anda dan alamat pos elektronik (email anda)"),
    ).toBeVisible(); // Kuat
    await dialog(page).getByRole("button", { name: "Tutup" }).click();
    await bar.getByRole("button", { name: "Fakta Klien" }).click();
    await expect(dialog(page).getByText("PT Cahaya Gama").first()).toBeVisible();
    await expect(dialog(page).getByText("Biaya pemasaran").first()).toBeVisible();
    await dialog(page).getByRole("button", { name: "Tutup" }).click();
    await expect(dialog(page)).toHaveCount(0);

    // the page behind kept its state and still works
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await waitForEvents(code, (rows) => rows.filter((e) => e.type === "ref_close").length === 3, 20_000);
    const refs = await eventsOf(code, ["ref_open", "ref_close"]);
    expect(refs.map((e) => `${e.type}:${e.target}`)).toEqual([
      "ref_open:minutes",
      "ref_close:minutes",
      "ref_open:memo",
      "ref_close:memo",
      "ref_open:facts",
      "ref_close:facts",
    ]);
    expect(refs.every((e) => e.round === 1 && e.page_id === "cases_r1")).toBe(true);
    expect(refs.filter((e) => e.type === "ref_close").every((e) => (e.duration_ms ?? 0) > 0)).toBe(true);
  });

  test("P4-9 variant: Eksplisit + Lemah sees the other texts; cell never reaches the browser", async ({
    page,
  }) => {
    await startAt(page, 2, "cases_r1");
    const bar = page.getByRole("navigation", { name: "Berkas penugasan" });
    await bar.getByRole("button", { name: "Berita Acara" }).click();
    await expect(dialog(page).getByText(/menginginkan posisi tertentu/)).toBeVisible();
    await expect(dialog(page).getByText(/sangat diperhatikan dan dievaluasi/)).toHaveCount(0);
    await dialog(page).getByRole("button", { name: "Tutup" }).click();
    await bar.getByRole("button", { name: "Memo Penugasan" }).click();
    await expect(
      dialog(page).getByText("Anda tidak harus mencantumkan nama dan alamat email anda"),
    ).toBeVisible();
    await dialog(page).getByRole("button", { name: "Tutup" }).click();
    const html = await page.content();
    expect(html).not.toMatch(/"cell"|Sel [1-4]|Putaran|implisit|eksplisit/i);
    // the strong variant is not in the page at all
    expect(html).not.toContain("alamat pos elektronik");
    // reading time is not shown to the participant
    await expect(page.locator("main")).not.toContainText(/detik|menit dibaca|durasi/i);
  });

  test("P4-10/P4-11/P4-13 Sel 1 start to finish: two rounds stored apart, round 2 empty, round 1 locked, timer stops", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const [code] = await codes.makeCodes([1]);
    await consentAndLogin(page, code);

    // intro pages → Berita Acara (Implisit: two questions) → Memo (Lemah) → cases
    await nextButton(page).click(); // welcome → role (timer starts)
    for (let i = 0; i < 3; i++) await nextButton(page).click(); // role, rules, case_info
    for (let i = 0; i < 4; i++) await nextButton(page).click(); // facts 1–4
    await expect(heading(page, /Ikhtisar Berita Acara/)).toBeVisible();
    await answerFirstOptions(page);
    await nextButton(page).click();
    await nextButton(page).click(); // memo_intro
    await expect(heading(page, "Memo Penugasan")).toBeVisible();
    await nextButton(page).click();
    await expect(heading(page, "Mempelajari kasus serupa")).toBeVisible();
    await nextButton(page).click();

    // ---- round 1
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await expect(page.getByRole("timer")).toBeVisible();
    await openDetail(page, 7);
    const r1Ranks = [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1];
    await answerAllCases(page, r1Ranks);
    await nextButton(page).click();
    await expect(heading(page, "Pertanyaan pengetahuan")).toBeVisible();
    await answerFirstOptions(page);
    await nextButton(page).click();
    await expect(heading(page, "Menyusun rekomendasi")).toBeVisible();
    await nextButton(page).click();
    await expect(heading(page, "Usulan biaya menurut draft klien")).toBeVisible();
    await nextButton(page).click();
    await answerRecommendation(page, [100_000_000, 200_000_000, 300_000_000, 400_000_000]);
    await nextButton(page).click();
    await answerConfidence(page, 60);
    await nextButton(page).click();

    // ---- review (no round), then round 2
    await expect(heading(page, "Reviu Atasan/Supervisor")).toBeVisible();
    expect((await participant(code)).current_round).toBeNull();
    await nextButton(page).click();
    await expect(heading(page, "Mempelajari kasus serupa")).toBeVisible();
    // the menu now holds four files
    await expect(page.getByRole("navigation", { name: "Berkas penugasan" }).getByRole("button")).toHaveText([
      "Fakta Klien",
      "Berita Acara",
      "Memo Penugasan",
      "Reviu Atasan",
    ]);
    await nextButton(page).click();

    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    expect((await participant(code)).current_round).toBe(2);
    // P4-10: everything starts empty, nothing is marked as opened
    await expect(page.getByRole("combobox")).toHaveCount(14);
    for (let no = 1; no <= 14; no++) await expect(caseRow(page, no).getByRole("combobox")).toHaveValue("");
    await expect(page.getByRole("radio", { checked: true })).toHaveCount(0);
    await expect(page.getByText("Sudah dibuka")).toHaveCount(0);
    await expect(summary(page)).toContainText("Dibuka 0/14");
    await expect(page.locator("main").getByText(/Peringkat\s+0\/14/)).toBeVisible();
    const bar = page.getByRole("navigation", { name: "Berkas penugasan" });
    await bar.getByRole("button", { name: "Reviu Atasan" }).click();
    await expect(
      dialog(page).getByRole("heading", { level: 2, name: "Reviu Atasan/Supervisor" }),
    ).toBeVisible();
    await dialog(page).getByRole("button", { name: "Tutup" }).click();

    // P4-11: round 1 answers cannot be changed any more
    const before = (await savedAnswers(code))[rankKey(3, 1)];
    expect(before).toBe(12);
    const locked = await page.request.patch("/api/p/responses", {
      data: { page: "cases_r2", items: { [rankKey(3, 1)]: 2 } },
    });
    expect(locked.status()).toBe(422);
    const staleRound = await page.request.patch("/api/p/responses", {
      data: { page: "cases_r1", items: { [rankKey(3, 1)]: 2 } },
    });
    expect(staleRound.status()).toBe(409);
    expect((await staleRound.json()).error.code).toBe("STALE_PAGE");
    const viaAdvance = await page.request.post("/api/p/advance", {
      data: { from: "cases_r2", items: { ...completeCaseAnswers(2), [rankKey(3, 1)]: 2 } },
    });
    expect(viaAdvance.status()).toBe(422);
    expect((await savedAnswers(code))[rankKey(3, 1)]).toBe(12);

    const r2Ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
    await answerAllCases(page, r2Ranks);
    await nextButton(page).click();
    await expect(heading(page, "Menyusun rekomendasi")).toBeVisible();
    await expect(page.getByText(/reviu dari supervisor/)).toBeVisible();
    await nextButton(page).click();
    await nextButton(page).click();
    // round 2 recommendation starts empty
    for (const label of REC_LABELS) await expect(page.getByLabel(label, { exact: true })).toHaveValue("");
    await answerRecommendation(page, [150_000_000, 250_000_000, 100_000_000, 500_000_000]);
    await nextButton(page).click();
    await expect(confidenceBox(page)).toHaveValue("");
    await answerConfidence(page, 80);
    await expect(page.getByRole("timer")).toBeVisible();
    await nextButton(page).click();

    // P4-13: timer stopped, questionnaire next
    await expect(heading(page, "Pengalaman selama penugasan")).toBeVisible();
    await expect(page.getByRole("timer")).toHaveCount(0);
    await expect(page.getByText(/tanpa batas waktu/)).toBeVisible();
    const p = await participant(code);
    expect(p.task_end_at).not.toBeNull();
    expect(p.timed_out).toBe(false);
    const server = await eventsOf(code, ["timer_start", "timer_stop", "round_start", "round_end"]);
    expect(server.map((e) => `${e.type}:${e.target ?? ""}`)).toEqual([
      "timer_start:",
      "round_start:1",
      "round_end:1",
      "round_start:2",
      "round_end:2",
      "timer_stop:",
    ]);

    // all answers of both rounds are there, kept apart
    const a = await savedAnswers(code);
    for (let no = 1; no <= 14; no++) {
      expect(a[rankKey(no, 1)]).toBe(r1Ranks[no - 1]);
      expect(a[rankKey(no, 2)]).toBe(r2Ranks[no - 1]);
      expect(a[saveKey(no, 1)]).toBe(no % 2);
      expect(a[saveKey(no, 2)]).toBe(no % 2);
    }
    expect(a).toMatchObject({
      rec_knowhow_r1: 100_000_000,
      rec_entertain_r1: 200_000_000,
      rec_repair_r1: 300_000_000,
      rec_marketing_r1: 400_000_000,
      confidence_r1: 60,
      rec_knowhow_r2: 150_000_000,
      rec_entertain_r2: 250_000_000,
      rec_repair_r2: 100_000_000,
      rec_marketing_r2: 500_000_000,
      confidence_r2: 80,
    });
    expect(Object.keys(a).filter((k) => k.startsWith("cov_q"))).toHaveLength(5);
    expect(Object.keys(a).filter((k) => k.endsWith("_r1")).length).toBe(28 + 4 + 1);
    expect(Object.keys(a).filter((k) => k.endsWith("_r2")).length).toBe(28 + 4 + 1);

    // detail of case 7 was opened in round 1 only
    const opens = await eventsOf(code, ["case_open"]);
    expect(opens.map((e) => `${e.target}:${e.round}`)).toEqual(["case07:1"]);
  });

  test("P4-12 phone (390 px): cards without sideways scroll, 'Berkas' button in the header opens a full-screen panel", async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 3,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const code = await startAt(page, 4, "cases_r1");
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();

    const overflow = await page.evaluate(() => ({
      scroll: document.documentElement.scrollWidth,
      client: document.documentElement.clientWidth,
    }));
    expect(overflow.scroll).toBeLessThanOrEqual(overflow.client);

    // no desktop bar; the header button replaces it
    await expect(page.getByRole("navigation", { name: "Berkas penugasan" })).toBeHidden();
    const berkas = page.getByRole("button", { name: "Berkas", exact: true });
    await expect(berkas).toBeVisible();
    // touch targets of at least 44 px
    for (const loc of [
      berkas,
      caseRow(page, 1).getByRole("button", { name: /^DETAIL/ }),
      caseRow(page, 1).getByRole("combobox"),
    ]) {
      const box = (await loc.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(43.5);
    }

    await berkas.tap();
    await expect(dialog(page)).toBeVisible();
    const panel = (await dialog(page).boundingBox())!;
    expect(Math.round(panel.width)).toBe(390);
    await expect(dialog(page).getByRole("button", { name: "Fakta Klien" })).toBeVisible();
    await expect(dialog(page).getByRole("button", { name: "Reviu Atasan" })).toHaveCount(0);
    await dialog(page).getByRole("button", { name: "Memo Penugasan" }).tap();
    await expect(dialog(page).getByText("Anda harus mencantumkan nama anda")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Daftar berkas" }).tap();
    await expect(dialog(page).getByText("Pilih berkas untuk dibaca")).toBeVisible();
    await dialog(page).getByRole("button", { name: "Tutup" }).tap();
    await expect(dialog(page)).toHaveCount(0);

    // the detail opens inline and the controls stay usable
    await caseRow(page, 2)
      .getByRole("button", { name: /^DETAIL/ })
      .tap();
    await expect(caseRow(page, 2).getByRole("region")).toBeVisible();
    await caseRow(page, 2).getByRole("combobox").selectOption("3");
    await caseRow(page, 2).getByRole("radio", { name: /^Ya,/ }).check();
    const after = await page.evaluate(
      () => document.documentElement.scrollWidth <= document.documentElement.clientWidth,
    );
    expect(after).toBe(true);

    await page.waitForTimeout(AUTOSAVE_WAIT);
    expect((await savedAnswers(code))[rankKey(2, 1)]).toBe(3);
    await context.close();
  });

  test("P4-14 time runs out while a DETAIL is open: case_close (leave) is sent before the time-up screen", async ({
    page,
  }) => {
    const code = await startAt(page, 1, "cases_r1");
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    // five seconds left: the browser's own countdown ends while the detail is open
    await serviceClient()
      .from("participants")
      .update({ task_deadline: new Date(Date.now() + 5_000).toISOString() })
      .eq("access_code", code);
    await page.reload();
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await openDetail(page, 4);

    await expect(heading(page, "Waktu penugasan telah habis")).toBeVisible({ timeout: 20_000 });
    const p = await participant(code);
    expect(p.timed_out).toBe(true);
    expect(p.timed_out_at_page).toBe("cases_r1");

    const rows = await eventsOf(code);
    const close = rows.find((e) => e.type === "case_close" && e.target === "case04");
    const expired = rows.find((e) => e.type === "timer_expired");
    expect(close, "case_close for the open detail").toBeTruthy();
    expect(close!.meta).toEqual({ reason: "leave" });
    expect(close!.duration_ms).toBeGreaterThan(0);
    expect(close!.round).toBe(1);
    expect(new Date(close!.received_at).getTime()).toBeLessThanOrEqual(
      new Date(expired!.received_at).getTime(),
    );
  });

  test("an unfinished list is kept: values, marks and the opened summary come back after a resume", async ({
    page,
    browser,
  }) => {
    const code = await startAt(page, 3, "cases_r1");
    await answerCase(page, 1, 5, "Ya");
    await answerCase(page, 9, 2, "Tidak");
    await openDetail(page, 9);
    await page.waitForTimeout(AUTOSAVE_WAIT);

    // same code on a second device: resumes on the same step with the saved answers
    const other = await browser.newContext();
    const page2 = await other.newPage();
    await consentAndLogin(page2, code);
    await expect(
      page2.getByRole("status").filter({ hasText: "Melanjutkan dari halaman terakhir" }),
    ).toBeVisible();
    await expect(caseRow(page2, 1).getByRole("combobox")).toHaveValue("5");
    await expect(caseRow(page2, 9).getByRole("combobox")).toHaveValue("2");
    await expect(caseRow(page2, 9).getByRole("radio", { name: /^Tidak,/ })).toBeChecked();
    await expect(caseRow(page2, 9).getByText("Sudah dibuka")).toBeVisible();
    await expect(summary(page2)).toContainText("Dibuka 1/14");
    await other.close();
  });

  test("P4-15 refresh while a DETAIL and a file are open: case_close and ref_close (leave) are still sent", async ({
    page,
  }) => {
    const code = await startAt(page, 1, "cases_r1");
    await openDetail(page, 4);
    await page
      .getByRole("navigation", { name: "Berkas penugasan" })
      .getByRole("button", { name: "Fakta Klien" })
      .click();
    await expect(dialog(page)).toBeVisible();
    await page.waitForTimeout(500);
    await page.reload();
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await waitForEvents(
      code,
      (rows) => rows.some((e) => e.type === "case_close") && rows.some((e) => e.type === "ref_close"),
    );
    const rows = await eventsOf(code, ["case_close", "ref_close"]);
    const reasons = Object.fromEntries(
      rows.map((e) => [e.type, (e.meta as { reason?: string } | null)?.reason]),
    );
    expect(reasons).toEqual({ case_close: "leave", ref_close: "leave" });
    expect(rows.every((e) => (e.duration_ms ?? 0) >= 400)).toBe(true);
  });
});
