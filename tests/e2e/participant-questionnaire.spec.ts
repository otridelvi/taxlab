import { expect, test, type Page } from "@playwright/test";
import { serviceClient } from "./fixtures";
import {
  AUTOSAVE_WAIT,
  answerDemographics,
  answerLikert,
  answerMc,
  answerQuestionnaire,
  consentAndLogin,
  createCodeTracker,
  heading,
  jumpTo,
  nextButton,
  participant,
  savedAnswers,
} from "./participant-helpers";

/**
 * PLAN-06 · questionnaire, demographics and incentive claim: PC-5 … PC-15 (PC-1 … PC-4 are unit
 * tests). Participants log in through the UI and are placed on the step under test with jumpTo().
 */
const codes = createCodeTracker("PC");

test.afterAll(async () => {
  await codes.cleanUp();
});

async function startAt(page: Page, cell: number, step: string, flow: "A" | "B" = "B"): Promise<string> {
  const [code] = await codes.makeCodes([cell]);
  await consentAndLogin(page, code, flow);
  await jumpTo(code, step);
  await page.goto("/task");
  return code;
}

const alert = (page: Page) => page.locator("main").getByRole("alert");

async function contactOf(code: string) {
  const p = await participant(code);
  const { data } = await serviceClient().from("contacts").select("*").eq("participant_id", p.id);
  return data ?? [];
}

test.describe("PLAN-06 questionnaire and demographics", () => {
  test("PC-5 flow B: parts A and B on one page, no letters, empty Next refused with counts", async ({
    page,
  }) => {
    await startAt(page, 2, "questionnaire");
    await expect(heading(page, "Pengalaman selama penugasan")).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Bagian A · Pilihan ganda" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Bagian B · Skala 1–5" })).toBeVisible();
    await expect(page.locator("main").getByRole("radio")).toHaveCount(3 * 3 + 4 * 5);
    await expect(page.locator("main").getByText(/^[abc]\.$/)).toHaveCount(0);
    await nextButton(page).click();
    await expect(alert(page)).toHaveText(
      "Lengkapi pertanyaan (0 dari 3) dan pernyataan (0 dari 4) terlebih dahulu.",
    );
    await answerMc(page);
    await nextButton(page).click();
    await expect(alert(page)).toHaveText("Lengkapi pernyataan (0 dari 4) terlebih dahulu.");
    await answerLikert(page, [1, 2, 3, 4]);
    await nextButton(page).click();
    await expect(heading(page, "Data demografi")).toBeVisible();
    await expect(page.getByText("Kuesioner · 2 dari 2")).toBeVisible();
  });

  test('PC-6 Likert: stored as number, named "4, Setuju", reachable by keyboard', async ({ page }) => {
    const code = await startAt(page, 1, "questionnaire");
    const second = page.getByRole("group", { name: /Klien anda menyatakan/ });
    await second.getByRole("radio", { name: "4, Setuju" }).check();
    await page.waitForTimeout(AUTOSAVE_WAIT);
    expect((await savedAnswers(code)).mc_likert2).toBe(4);
    await second.getByRole("radio", { name: "4, Setuju" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(second.getByRole("radio", { name: "5, Sangat setuju" })).toBeChecked();
    await page.waitForTimeout(AUTOSAVE_WAIT);
    expect((await savedAnswers(code)).mc_likert2).toBe(5);
  });

  test("PC-7 autosave: answers survive a refresh", async ({ page }) => {
    await startAt(page, 3, "questionnaire");
    await answerMc(page, [2, 1, 3]);
    await answerLikert(page, [5, 4, 3, 2]);
    await page.waitForTimeout(AUTOSAVE_WAIT);
    await page.reload();
    await expect(page.locator('input[name="mc_q1"]').nth(1)).toBeChecked();
    await expect(page.locator('input[name="mc_q3"]').nth(2)).toBeChecked();
    await expect(page.locator('input[name="mc_likert1"]').nth(4)).toBeChecked();
    await expect(page.locator('input[name="mc_likert4"]').nth(1)).toBeChecked();
  });

  test("PC-8 flow A: mc_choice, then mc_likert, then demographics", async ({ page }) => {
    const code = await startAt(page, 1, "mc_choice", "A");
    await expect(page.getByText("Kuesioner · 1 dari 3")).toBeVisible();
    await expect(page.locator("main").getByRole("radio")).toHaveCount(9);
    await answerMc(page, [2, 1, 2]);
    await nextButton(page).click();
    await expect(page.getByText("Kuesioner · 2 dari 3")).toBeVisible();
    await expect(page.locator("main").getByRole("radio")).toHaveCount(20);
    await answerLikert(page);
    await nextButton(page).click();
    await expect(heading(page, "Data demografi")).toBeVisible();
    await expect(page.getByText("Kuesioner · 3 dari 3")).toBeVisible();
    expect((await participant(code)).current_page).toBe("demographics");
  });

  test("PC-9 demographics: out-of-range and non-numeric values are refused (browser and API)", async ({
    page,
  }) => {
    await startAt(page, 1, "demographics");
    const semester = page.getByLabel("Semester", { exact: true });
    const age = page.getByLabel("Umur", { exact: true });
    for (const [sem, umur, field] of [
      ["0", "21", "semester"],
      ["25", "21", "semester"],
      ["5", "14", "umur"],
      ["5", "81", "umur"],
    ] as const) {
      await answerDemographics(page, { semester: sem, age: umur });
      await nextButton(page).click();
      await expect(alert(page)).toContainText(`Lengkapi ${field}`);
    }
    await semester.fill("abc");
    await expect(semester).toHaveValue(""); // letters are dropped while typing
    await age.fill("2x1");
    await expect(age).toHaveValue("21");
    await expect(semester).toHaveAttribute("inputmode", "numeric");
    const bad = await page.request.post("/api/p/advance", {
      data: { from: "demographics", items: { semester: 25, gender: 1, age: 21, education: 2 } },
    });
    expect(bad.status()).toBe(422);
    expect((await bad.json()).error.keys).toContain("semester");
    await expect(heading(page, "Data demografi")).toBeVisible();
  });

  test("PC-10 incentive left empty: Next works and no contact data is stored", async ({ page }) => {
    const code = await startAt(page, 1, "demographics");
    await answerDemographics(page);
    await nextButton(page).click();
    await expect(heading(page, /Taklimat/)).toBeVisible();
    for (const row of await contactOf(code)) {
      expect(row.ewallet || null).toBeNull();
      expect(row.phone || null).toBeNull();
    }
  });

  test("PC-11 only one of e-wallet and phone is refused", async ({ page }) => {
    await startAt(page, 1, "demographics");
    await answerDemographics(page, { ewallet: "dana" });
    await nextButton(page).click();
    await expect(alert(page)).toContainText("Lengkapi No. HP");
    await page.getByLabel("Jenis e-wallet").selectOption("");
    await page.getByLabel("No. HP").fill("0812 3456 7890");
    await nextButton(page).click();
    await expect(alert(page)).toContainText("Lengkapi jenis e-wallet");
    await page.getByLabel("No. HP").fill("1234");
    await page.getByLabel("Jenis e-wallet").selectOption("gopay");
    await nextButton(page).click();
    await expect(alert(page)).toContainText("Lengkapi No. HP");
    await expect(heading(page, "Data demografi")).toBeVisible();
  });

  test("PC-12 e-wallet and phone go to contacts, phone normalised; not in responses", async ({ page }) => {
    const code = await startAt(page, 2, "demographics");
    await answerDemographics(page, {
      semester: "7",
      gender: 2,
      age: "22",
      education: 3,
      ewallet: "dana",
      phone: "0812 3456 7890",
    });
    await nextButton(page).click();
    await expect(heading(page, /Taklimat/)).toBeVisible();
    const [row] = await contactOf(code);
    expect(row.ewallet).toBe("dana");
    expect(row.phone).toBe("+6281234567890");
    const saved = await savedAnswers(code);
    expect([saved.semester, saved.gender, saved.age, saved.education]).toEqual([7, 2, 22, 3]);
    expect(Object.keys(saved).filter((k) => /contact|ewallet|phone/.test(k))).toEqual([]);
  });

  test("PC-13 time runs out, then questionnaire and demographics run to Survey Selesai", async ({ page }) => {
    const code = await startAt(page, 3, "cases_r1");
    const p = await participant(code);
    await serviceClient()
      .from("participants")
      .update({ task_deadline: new Date(Date.now() - 60_000).toISOString() })
      .eq("id", p.id);
    await page.reload();
    await expect(heading(page, "Waktu penugasan telah habis")).toBeVisible();
    await nextButton(page).click();
    await expect(heading(page, "Pengalaman selama penugasan")).toBeVisible();
    await answerQuestionnaire(page);
    await nextButton(page).click();
    await answerDemographics(page);
    await nextButton(page).click();
    await expect(heading(page, /Taklimat/)).toBeVisible();
    await page.getByRole("button", { name: "Survey Selesai" }).click();
    await expect(heading(page, "Terima kasih")).toBeVisible();
    const after = await participant(code);
    expect(after.status).toBe("completed");
    expect(after.timed_out).toBe(true);
  });

  test("PC-15 phone 390 px: Likert ends labelled, no sideways scrolling, right keyboards", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const noOverflow = () => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
    const code = await startAt(page, 1, "questionnaire");
    expect(await noOverflow()).toBe(true);
    const first = page.getByRole("group", { name: /Klien anda menekankan/ });
    await expect(first.getByText("Sangat tidak setuju").locator("visible=true")).toHaveCount(1);
    await expect(first.getByText("Sangat setuju").locator("visible=true")).toHaveCount(1);
    await expect(first.getByText("Netral").locator("visible=true")).toHaveCount(0);
    await jumpTo(code, "demographics");
    await page.goto("/task");
    expect(await noOverflow()).toBe(true);
    await expect(page.getByLabel("Semester", { exact: true })).toHaveAttribute("inputmode", "numeric");
    await expect(page.getByLabel("Umur", { exact: true })).toHaveAttribute("inputmode", "numeric");
    await expect(page.getByLabel("No. HP")).toHaveAttribute("inputmode", "tel");
  });
});
