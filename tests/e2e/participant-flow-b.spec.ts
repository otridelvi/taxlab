import { expect, test, type Page } from "@playwright/test";
import { rankKey, saveKey } from "../../content/flow";
import { serviceClient } from "./fixtures";
import {
  answerAllCases,
  answerConfidence,
  answerDemographics,
  answerFirstOptions,
  answerQuestionnaire,
  answerRecommendation,
  caseRow,
  consentAndLogin,
  createCodeTracker,
  eventsOf,
  heading,
  jumpTo,
  nextButton,
  participant,
  savedAnswers,
  waitForEvents,
} from "./participant-helpers";

/**
 * PLAN-05 · flow B (Opsi B): scenarios PB-3 … PB-21 (PB-1/PB-2 are unit tests). Participants log
 * in through the UI on flow B, are placed on the step under test with jumpTo(), and PB-18 walks
 * the whole flow by clicking.
 */
const codes = createCodeTracker("PB");

test.afterAll(async () => {
  await codes.cleanUp();
});

async function startAt(page: Page, cell: number, step: string): Promise<string> {
  const [code] = await codes.makeCodes([cell]);
  await consentAndLogin(page, code, "B");
  await jumpTo(code, step);
  await page.goto("/task");
  return code;
}

const fileMap = (page: Page) => page.getByRole("navigation", { name: "Map berkas penugasan" });
const openButton = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test.describe("PLAN-05 · flow B", () => {
  test("PB-3/PB-4 new participant is on flow B; instructions are one page with three numbered parts; timer starts there", async ({
    page,
  }) => {
    const [code] = await codes.makeCodes([1]);
    await consentAndLogin(page, code, "B");
    await expect(heading(page, "Selamat Datang")).toBeVisible();
    expect((await participant(code)).flow_version).toBe("B");

    await nextButton(page).click();
    await expect(heading(page, "Petunjuk penugasan")).toBeVisible();
    for (const t of ["1. Peran dan tugas anda", "2. Aturan penugasan", "3. Informasi kasus acuan"]) {
      await expect(page.getByRole("heading", { level: 2, name: t })).toBeVisible();
    }
    await expect(page.getByRole("timer")).toBeVisible();
    const p = await participant(code);
    expect(p.current_page).toBe("instructions");
    expect(p.task_started_at).not.toBeNull();

    await nextButton(page).click();
    await expect(heading(page, "Fakta Klien")).toBeVisible(); // straight to the client facts
  });

  test("PB-5 facts: one costs page with every account, its amount and explanation", async ({ page }) => {
    const code = await startAt(page, 1, "facts_costs");
    await expect(heading(page, "Biaya yang masih meragukan")).toBeVisible();
    for (const amount of ["Rp250.000.000", "Rp200.000.000", "Rp300.000.000"]) {
      await expect(page.locator("main").getByText(amount).first()).toBeVisible();
    }
    await expect(page.locator("main").getByText("Total")).toBeVisible();
    await expect(page.locator("main").getByText("Rp1.000.000.000")).toBeVisible();
    await expect(
      page
        .locator("main")
        .getByText(/know how fee/)
        .first(),
    ).toBeVisible();
    expect((await participant(code)).current_page).toBe("facts_costs");
  });

  test("PB-14 file map: status follows the page on desktop, hidden on a phone", async ({ page }) => {
    await startAt(page, 1, "facts_1");
    await expect(fileMap(page)).toBeVisible();
    const items = fileMap(page).getByRole("listitem");
    await expect(items).toHaveCount(3);
    await expect(items.nth(0)).toContainText("Fakta Klien");
    await expect(items.nth(0)).toContainText("Sedang dibaca");
    await expect(items.nth(1)).toContainText("Belum diterima");
    await expect(items.nth(2)).toContainText("Belum diterima");

    await nextButton(page).click(); // facts_costs: still Fakta Klien
    await expect(heading(page, "Biaya yang masih meragukan")).toBeVisible();
    await expect(items.nth(0)).toContainText("Sedang dibaca");
    await nextButton(page).click(); // minutes
    await expect(heading(page, /Ikhtisar Berita Acara/)).toBeVisible();
    await expect(items.nth(0)).toContainText("Sudah dibaca");
    await expect(items.nth(1)).toContainText("Sedang dibaca");
    await expect(items.nth(2)).toContainText("Belum diterima");

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(fileMap(page)).toBeHidden();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("PB-6/PB-7/PB-8/PB-9 memo arrives closed; Buka memo logs doc_open, shows the memo; stays open after refresh; API refuses without it", async ({
    page,
  }) => {
    const code = await startAt(page, 1, "memo");
    // closed: letter only, no memo text, Next off
    await expect(heading(page, "Memo Penugasan")).toBeVisible();
    await expect(page.getByText("Berkas masuk")).toBeVisible();
    await expect(page.locator("main").getByText(/Diingatkan kembali/)).toHaveCount(0);
    await expect(nextButton(page)).toBeDisabled();

    // PB-9: no doc_open yet, so the server refuses
    const early = await page.request.post("/api/p/advance", { data: { from: "memo", items: {} } });
    expect(early.status()).toBe(422);
    expect((await early.json()).error.code).toBe("DOC_NOT_OPENED");
    expect((await participant(code)).current_page).toBe("memo");

    // PB-7: open
    await openButton(page, "Buka memo").click();
    await expect(page.locator("main").getByText(/Diingatkan kembali/)).toBeVisible();
    await expect(nextButton(page)).toBeEnabled();
    await waitForEvents(code, (rows) => rows.some((e) => e.type === "doc_open"));
    const opened = await eventsOf(code, ["doc_open"]);
    expect(opened).toHaveLength(1);
    expect(opened[0].target).toBe("memo");
    expect(opened[0].page_id).toBe("memo");
    // Sel 1 = Lemah: no identity fields
    await expect(page.getByLabel("Nama lengkap")).toHaveCount(0);

    // PB-8: refresh keeps it open and does not log a second doc_open
    await page.reload();
    await expect(page.locator("main").getByText(/Diingatkan kembali/)).toBeVisible();
    expect(await eventsOf(code, ["doc_open"])).toHaveLength(1);

    await nextButton(page).click();
    await expect(heading(page, "Mempelajari kasus serupa")).toBeVisible();
    expect((await participant(code)).current_round).toBe(1);
  });

  test("PB-7 Kuat cell: name and email appear only after Buka memo and are required", async ({ page }) => {
    const code = await startAt(page, 3, "memo");
    await expect(page.getByLabel("Nama lengkap")).toHaveCount(0);
    await openButton(page, "Buka memo").click();
    await expect(page.getByLabel("Nama lengkap")).toBeVisible();
    await nextButton(page).click();
    await expect(
      page
        .getByRole("alert")
        .filter({ hasText: /lengkap|isi/i })
        .first(),
    ).toBeVisible();
    await page.getByLabel("Nama lengkap").fill("Staf Uji");
    await page.getByLabel("Alamat email").fill("staf.uji@example.com");
    await nextButton(page).click();
    await expect(heading(page, "Mempelajari kasus serupa")).toBeVisible();
    const { data } = await serviceClient()
      .from("contacts")
      .select("name, email")
      .eq("participant_id", (await participant(code)).id)
      .single();
    expect(data).toEqual({ name: "Staf Uji", email: "staf.uji@example.com" });
  });

  test("PB-5 minutes in notulen style; Implisit has two questions, Eksplisit none", async ({
    page,
    browser,
  }) => {
    await startAt(page, 1, "minutes");
    await expect(page.locator("main").getByText("WIRADANA & REKAN")).toBeVisible();
    await expect(page.locator("main").getByText("BA/[NOMOR]")).toBeVisible();
    await expect(page.locator("main").getByRole("group")).toHaveCount(2);
    await nextButton(page).click(); // missing answers
    await expect(heading(page, /Ikhtisar Berita Acara/)).toBeVisible();

    const page2 = await (await browser.newContext()).newPage(); // own cookies: another participant
    await startAt(page2, 4, "minutes");
    await expect(page2.locator("main").getByText("BA/[NOMOR]")).toBeVisible();
    await expect(page2.locator("main").getByRole("group")).toHaveCount(0);
  });

  test("PB-11 recommendation: client draft read-only above, separate answer fields below, values stored per round", async ({
    page,
  }) => {
    const code = await startAt(page, 1, "rec_r1");
    await expect(heading(page, "Menyusun rekomendasi")).toBeVisible();
    const draft = page.getByRole("table");
    await expect(draft).toHaveCount(1);
    await expect(draft).toContainText("Biaya know how fee");
    await expect(draft.locator("input")).toHaveCount(0);

    const firstField = page.getByLabel("Biaya know how fee", { exact: true });
    const [draftBox, fieldBox] = [await draft.boundingBox(), await firstField.boundingBox()];
    expect(draftBox!.y + draftBox!.height).toBeLessThan(fieldBox!.y); // draft ends above the first field
    await expect(
      page.locator("main").getByRole("heading", { name: "Masukkan besaran biaya berdasarkan saran anda" }),
    ).toBeVisible();

    await answerRecommendation(page, [250_000_000, 200_000_000, 300_000_000, 250_000_000]);
    await nextButton(page).click();
    await expect(heading(page, "Tingkat keyakinan")).toBeVisible();
    const saved = await savedAnswers(code);
    expect(saved.rec_knowhow_r1).toBe(250_000_000);
    expect(saved.rec_marketing_r1).toBe(250_000_000);
  });

  test("PB-12 round 2: instruction banner above an empty list; no separate instruction page", async ({
    page,
  }) => {
    await startAt(page, 1, "review");
    await openButton(page, "Buka reviu").click();
    await nextButton(page).click(); // → cases_r2 (no cases_intro_r2)
    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await expect(page.getByText("Instruksi", { exact: true })).toBeVisible(); // banner, not a page
    await expect(page.getByRole("heading", { name: "Mempelajari kasus serupa" })).toHaveCount(0);
    await expect(page.getByText(/Tersedia 14 kasus/)).toBeVisible();
    await expect(page.locator("li[data-case]")).toHaveCount(14);
    await expect(page.getByText(/Dibuka\s+0\/14/)).toBeVisible();
    await expect(caseRow(page, 1).getByRole("combobox")).toHaveValue("");
    await expect(page.locator("main").getByText(/putaran/i)).toHaveCount(0);
  });

  test("PB-13 knowledge questions without letters; option 4 reads 'Kedua jawaban di atas benar'", async ({
    page,
  }) => {
    const code = await startAt(page, 1, "covariates");
    await expect(heading(page, "Pertanyaan pengetahuan")).toBeVisible();
    await expect(page.locator("main").getByRole("group")).toHaveCount(5);
    await expect(page.locator("main i").filter({ hasText: /^[abc]\.$/ })).toHaveCount(0);
    await expect(page.locator("main").getByText("Kedua jawaban di atas benar")).toBeVisible();
    await expect(page.locator("main").getByText("A dan B benar")).toHaveCount(0);
    await answerFirstOptions(page);
    await page.waitForTimeout(1800);
    const saved = await savedAnswers(code);
    expect(Object.keys(saved).filter((k) => k.startsWith("cov_q"))).toHaveLength(5);
  });

  test("PB-10 review arrives closed like the memo; Reviu is added to the menu Berkas after it", async ({
    page,
  }) => {
    const code = await startAt(page, 2, "review");
    await expect(heading(page, "Reviu Atasan/Supervisor")).toBeVisible();
    await expect(page.getByText("Berkas masuk")).toBeVisible();
    await expect(nextButton(page)).toBeDisabled();
    const early = await page.request.post("/api/p/advance", { data: { from: "review", items: {} } });
    expect(early.status()).toBe(422);
    await openButton(page, "Buka reviu").click();
    await expect(page.locator("main").getByText(/dibuka kembali melalui menu Berkas/)).toBeVisible();
    await waitForEvents(code, (rows) => rows.some((e) => e.type === "doc_open" && e.target === "review"));
    await expect(page.getByRole("navigation", { name: "Berkas penugasan" })).not.toContainText(
      "Reviu Atasan",
    );
    await nextButton(page).click();
    await expect(page.getByRole("navigation", { name: "Berkas penugasan" })).toContainText("Reviu Atasan");
  });

  test("PB-15 menu Berkas from the case list of round 1 shows the Berita Acara in notulen style", async ({
    page,
  }) => {
    await startAt(page, 1, "cases_r1");
    await page
      .getByRole("navigation", { name: "Berkas penugasan" })
      .getByRole("button", { name: "Berita Acara" })
      .click();
    await expect(page.getByRole("dialog")).toContainText("BA/[NOMOR]");
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });

  test("PB-16 time runs out in the case list → time-up page → questionnaire", async ({ page }) => {
    const code = await startAt(page, 3, "cases_r1");
    const p = await participant(code);
    await serviceClient()
      .from("participants")
      .update({ task_deadline: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", p.id);
    await page.reload();
    await expect(heading(page, "Waktu penugasan telah habis")).toBeVisible();
    const after = await participant(code);
    expect(after.timed_out).toBe(true);
    expect(after.timed_out_at_page).toBe("cases_r1");
    await nextButton(page).click();
    await expect(heading(page, "Pengalaman selama penugasan")).toBeVisible(); // questionnaire
  });

  test("PB-17/PB-18 Sel 4 start to finish by clicking: 18 steps, data shaped like flow A, Survey Selesai ends the session", async ({
    page,
  }) => {
    test.setTimeout(240_000);
    const [code] = await codes.makeCodes([4]);
    await consentAndLogin(page, code, "B");
    const visited: string[] = [];
    const here = async () => visited.push((await participant(code)).current_page!);

    await here(); // welcome
    await nextButton(page).click();
    await expect(heading(page, "Petunjuk penugasan")).toBeVisible();
    await here();
    await nextButton(page).click(); // facts_1
    await expect(heading(page, "Fakta Klien")).toBeVisible();
    await here();
    await nextButton(page).click(); // facts_costs
    await expect(heading(page, "Biaya yang masih meragukan")).toBeVisible();
    await here();
    await nextButton(page).click(); // minutes (Eksplisit: no questions)
    await expect(heading(page, /Ikhtisar Berita Acara/)).toBeVisible();
    await here();
    await nextButton(page).click(); // memo (closed)
    await expect(openButton(page, "Buka memo")).toBeVisible();
    await here();
    await openButton(page, "Buka memo").click();
    await page.getByLabel("Nama lengkap").fill("Staf Uji");
    await page.getByLabel("Alamat email").fill("staf.uji@example.com");
    await nextButton(page).click();
    await expect(heading(page, "Mempelajari kasus serupa")).toBeVisible(); // cases_intro_r1
    await here();
    await nextButton(page).click();

    await expect(heading(page, "Daftar kasus acuan")).toBeVisible();
    await here();
    await answerAllCases(page, [14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);
    await nextButton(page).click();
    await expect(heading(page, "Pertanyaan pengetahuan")).toBeVisible();
    await here();
    await answerFirstOptions(page);
    await nextButton(page).click();
    await expect(heading(page, "Menyusun rekomendasi")).toBeVisible();
    await here();
    await answerRecommendation(page, [100, 200, 300, 400]);
    await nextButton(page).click();
    await expect(heading(page, "Tingkat keyakinan")).toBeVisible();
    await here();
    await answerConfidence(page, 60);
    await nextButton(page).click();
    await expect(openButton(page, "Buka reviu")).toBeVisible(); // review (closed)
    await here();
    await openButton(page, "Buka reviu").click();
    await nextButton(page).click();

    await expect(heading(page, "Daftar kasus acuan")).toBeVisible(); // cases_r2, empty
    await here();
    await expect(page.getByText(/Dibuka\s+0\/14/)).toBeVisible();
    await answerAllCases(page);
    await nextButton(page).click();
    await expect(heading(page, "Menyusun rekomendasi")).toBeVisible();
    await here();
    await answerRecommendation(page, [150, 250, 350, 450]);
    await nextButton(page).click();
    await expect(heading(page, "Tingkat keyakinan")).toBeVisible();
    await here();
    await answerConfidence(page, 80);
    await nextButton(page).click();

    await expect(heading(page, "Pengalaman selama penugasan")).toBeVisible(); // questionnaire
    await here();
    await expect(page.getByRole("timer")).toHaveCount(0); // timer stopped after confidence 2
    await answerQuestionnaire(page, [1, 2, 2], [4, 4, 5, 5]);
    await nextButton(page).click();
    await expect(heading(page, "Data demografi")).toBeVisible();
    await here();
    await answerDemographics(page, { ewallet: "ovo", phone: "081234567890" });
    await nextButton(page).click();
    await expect(heading(page, /Taklimat/)).toBeVisible();
    await here();
    await expect(page.getByRole("button", { name: "Survey Selesai" })).toBeVisible();
    await page.getByRole("button", { name: "Survey Selesai" }).click();
    await expect(heading(page, "Terima kasih")).toBeVisible();

    expect(visited).toEqual([
      "welcome",
      "instructions",
      "facts_1",
      "facts_costs",
      "minutes",
      "memo",
      "cases_intro_r1",
      "cases_r1",
      "covariates",
      "rec_r1",
      "confidence_r1",
      "review",
      "cases_r2",
      "rec_r2",
      "confidence_r2",
      "questionnaire",
      "demographics",
      "debriefing",
    ]);
    const p = await participant(code);
    expect(p.status).toBe("completed");
    expect(p.timed_out).toBe(false);
    expect(p.task_end_at).not.toBeNull();
    const saved = await savedAnswers(code);
    expect(saved[rankKey(1, 1)]).toBe(14);
    expect(saved[rankKey(1, 2)]).toBe(1);
    expect(saved[saveKey(1, 1)]).toBe(1);
    expect(saved.rec_knowhow_r1).toBe(100);
    expect(saved.rec_knowhow_r2).toBe(150);
    expect(saved.confidence_r1).toBe(60);
    expect(saved.confidence_r2).toBe(80);
    expect(Object.keys(saved).filter((k) => k.startsWith("cov_q"))).toHaveLength(5);
    expect([saved.mc_q1, saved.mc_q2, saved.mc_q3]).toEqual([1, 2, 2]);
    expect([saved.mc_likert1, saved.mc_likert2, saved.mc_likert3, saved.mc_likert4]).toEqual([4, 4, 5, 5]);
    expect([saved.semester, saved.gender, saved.age, saved.education]).toEqual([5, 1, 21, 2]);
    await expect(page.getByText("Segera hadir")).toHaveCount(0);

    const docs = await eventsOf(code, ["doc_open"]);
    expect(docs.map((e) => e.target)).toEqual(["memo", "review"]);
    const finish = await eventsOf(code, ["session_finish"]);
    expect(finish).toHaveLength(1);
    expect(finish[0].page_id).toBe("debriefing");
  });

  test("PB-19 a participant who started on flow A keeps flow A", async ({ page }) => {
    const [code] = await codes.makeCodes([1]);
    await consentAndLogin(page, code, "A");
    await nextButton(page).click();
    await expect(heading(page, "Peran dan tugas anda")).toBeVisible();
    expect((await participant(code)).flow_version).toBe("A");
  });

  test("PB-21 phone: closed memo, recommendation and questionnaire fit without sideways scrolling", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    const code = await startAt(page, 1, "memo");
    await expect(openButton(page, "Buka memo")).toBeVisible();
    expect(await noOverflow()).toBe(true);
    await openButton(page, "Buka memo").click();
    await expect(page.locator("main").getByText(/Diingatkan kembali/)).toBeVisible();
    expect(await noOverflow()).toBe(true);
    await jumpTo(code, "rec_r1");
    await page.goto("/task");
    await expect(heading(page, "Menyusun rekomendasi")).toBeVisible();
    expect(await noOverflow()).toBe(true);
    await jumpTo(code, "questionnaire");
    await page.goto("/task");
    expect(await noOverflow()).toBe(true);
  });
});
