import { expect, type APIRequestContext, type Locator, type Page } from "@playwright/test";
import { FLOW_A, FLOW_B, rankKey, saveKey } from "../../content/flow";
import { generateAccessCodes } from "../../lib/access-code";
import { ACCOUNTS, serviceClient } from "./fixtures";

/**
 * Shared helpers for the participant e2e specs (PLAN-03 flow, PLAN-04 tasks).
 * Codes are created directly with create_batch under the E2E admin; batches are
 * labelled "E2E <tag> …". Participants left in progress are cancelled afterwards so
 * they do not show up as active on the dashboard.
 */
const stamp = () => new Date().toISOString().slice(0, 19).replace(/[-:T]/g, "");

export function createCodeTracker(tag: string) {
  const created: string[] = [];
  return {
    /** New access codes for the given cells. */
    async makeCodes(cells: number[]): Promise<string[]> {
      const codes = generateAccessCodes(cells.length);
      const { error } = await serviceClient().rpc("create_batch", {
        p_admin_id: await e2eAdminId(),
        p_label: `E2E ${tag} ${stamp()}`,
        p_mode: "random",
        p_manual_cell: null,
        p_codes: codes,
        p_cells: cells,
      });
      if (error) throw new Error(`create_batch: ${error.message}`);
      created.push(...codes);
      return codes;
    },
    /** Cancels participants that are still in progress (call from afterAll). */
    async cleanUp() {
      if (created.length === 0) return;
      await serviceClient()
        .from("participants")
        .update({ status: "cancelled" })
        .in("access_code", created)
        .eq("status", "in_progress");
    },
  };
}

async function e2eAdminId(): Promise<string> {
  const { data, error } = await serviceClient()
    .from("admins")
    .select("id")
    .eq("name", ACCOUNTS.admin.name)
    .single();
  if (error || !data) throw new Error(`E2E admin not found: ${error?.message}`);
  return data.id;
}

export async function participant(code: string) {
  const { data } = await serviceClient().from("participants").select("*").eq("access_code", code).single();
  return data!;
}

/**
 * Consent + login through the UI. The participant is then put on `flow` (default A, so the
 * PLAN-03/04 specs keep testing flow A whatever settings.flow_version says; PLAN-05 specs ask
 * for B). Both flows start on "welcome", so switching right after login is safe.
 */
export async function consentAndLogin(page: Page, code: string, flow: "A" | "B" = "A") {
  await page.goto(`/login?code=${code}`);
  await expect(page).toHaveURL(/\/\?code=/);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Setuju dan masuk" }).click();
  await expect(page).toHaveURL(/\/login\?code=/);
  await expect(page.getByLabel("Kode akses")).toHaveValue(code);
  await page.getByRole("button", { name: "Masuk" }).click();
  await expect(page).toHaveURL(/\/task/);
  const db = serviceClient();
  const { data } = await db.from("participants").select("flow_version").eq("access_code", code).single();
  if (data?.flow_version !== flow) {
    const { error } = await db.from("participants").update({ flow_version: flow }).eq("access_code", code);
    if (error) throw new Error(`consentAndLogin: ${error.message}`);
    await page.goto("/task");
  }
}

export async function clickNext(page: Page, label = "Next") {
  await page.getByRole("button", { name: label, exact: true }).click();
}

export const heading = (page: Page, name: string | RegExp) => page.getByRole("heading", { level: 1, name });

/** Clicks the main button until the given heading shows (placeholders included). */
export async function nextUntil(page: Page, name: string | RegExp, max = 40) {
  const main = page.locator("main");
  for (let i = 0; i < max; i++) {
    if (await heading(page, name).isVisible()) return;
    const before = await main.innerText();
    await main.locator("button").last().click();
    await expect.poll(() => main.innerText(), { timeout: 10_000 }).not.toBe(before);
  }
  throw new Error(`Did not reach "${name}"`);
}

export async function loginApi(request: APIRequestContext, code: string) {
  return request.post("/api/p/login", { data: { code } });
}

// ---------------------------------------------------------------- PLAN-04 helpers

/** The Next button of a step: the last button inside <main>. */
export const nextButton = (page: Page) => page.locator("main button").last();

/** One case row of the list. */
export const caseRow = (page: Page, no: number) => page.locator(`li[data-case="${no}"]`);

export async function openDetail(page: Page, no: number) {
  await caseRow(page, no)
    .getByRole("button", { name: /^DETAIL/ })
    .click();
  await expect(caseRow(page, no).getByRole("region")).toBeVisible();
}

/** Picks rank `rank` (or "Kosongkan" for 0) and Ya/Tidak for a case. */
export async function answerCase(page: Page, no: number, rank: number, save: "Ya" | "Tidak") {
  const row = caseRow(page, no);
  await row.getByRole("combobox").selectOption(String(rank));
  await row.getByRole("radio", { name: new RegExp(`^${save},`) }).check();
}

/** Ranks cases 1…14 as given (default: case n gets rank n; odd cases are saved). */
export async function answerAllCases(
  page: Page,
  ranks: number[] = Array.from({ length: 14 }, (_, i) => i + 1),
) {
  for (let no = 1; no <= 14; no++) await answerCase(page, no, ranks[no - 1], no % 2 === 1 ? "Ya" : "Tidak");
}

/** First option of every multiple-choice question on the page. */
export async function answerFirstOptions(page: Page) {
  const groups = page.locator("main").getByRole("group");
  const n = await groups.count();
  for (let i = 0; i < n; i++) await groups.nth(i).getByRole("radio").first().check();
}

/** Manipulation check part A: option number (1–3) per question mc_q1…mc_q3. */
export async function answerMc(page: Page, options: number[] = [1, 1, 1]) {
  for (let i = 0; i < 3; i++)
    await page
      .locator(`input[name="mc_q${i + 1}"]`)
      .nth(options[i] - 1)
      .check();
}

/** Part B: scale value (1–5) per statement mc_likert1…mc_likert4. */
export async function answerLikert(page: Page, values: number[] = [3, 3, 3, 3]) {
  for (let i = 0; i < 4; i++)
    await page
      .locator(`input[name="mc_likert${i + 1}"]`)
      .nth(values[i] - 1)
      .check();
}

/** Flow B questionnaire page: both parts. */
export async function answerQuestionnaire(page: Page, mc?: number[], likert?: number[]) {
  await answerMc(page, mc);
  await answerLikert(page, likert);
}

export type DemographicAnswers = {
  semester?: string;
  gender?: 1 | 2;
  age?: string;
  education?: 1 | 2 | 3 | 4;
  ewallet?: string;
  phone?: string;
};

/** Demographics page; the incentive fields are only touched when given. */
export async function answerDemographics(page: Page, a: DemographicAnswers = {}) {
  await page.getByLabel("Semester", { exact: true }).fill(a.semester ?? "5");
  await page
    .locator('input[name="gender"]')
    .nth((a.gender ?? 1) - 1)
    .check();
  await page.getByLabel("Umur", { exact: true }).fill(a.age ?? "21");
  await page
    .locator('input[name="education"]')
    .nth((a.education ?? 2) - 1)
    .check();
  if (a.ewallet) await page.getByLabel("Jenis e-wallet").selectOption(a.ewallet);
  if (a.phone) await page.getByLabel("No. HP").fill(a.phone);
}

export const REC_LABELS = [
  "Biaya know how fee",
  "Biaya entertainment",
  "Biaya perbaikan dan pemeliharaan",
  "Biaya pemasaran",
] as const;

export async function answerRecommendation(page: Page, amounts: number[]) {
  for (let i = 0; i < 4; i++) await page.getByLabel(REC_LABELS[i], { exact: true }).fill(String(amounts[i]));
}

export const confidenceBox = (page: Page) => page.getByLabel("Tuliskan jawaban anda pada kotak");

export async function answerConfidence(page: Page, value: number) {
  await confidenceBox(page).fill(String(value));
}

/** Answers saved for a participant: item_key → value. */
export async function savedAnswers(code: string): Promise<Record<string, unknown>> {
  const p = await participant(code);
  const { data } = await serviceClient()
    .from("responses")
    .select("item_key, value")
    .eq("participant_id", p.id);
  return Object.fromEntries((data ?? []).map((r) => [r.item_key, r.value]));
}

export type EventRow = {
  type: string;
  target: string | null;
  round: number | null;
  page_id: string | null;
  duration_ms: number | null;
  meta: Record<string, unknown> | null;
  source: string;
  client_ts: string;
  received_at: string;
};

/** Events of a participant, oldest first (optionally only some types). */
export async function eventsOf(code: string, types?: string[]): Promise<EventRow[]> {
  const p = await participant(code);
  let q = serviceClient()
    .from("events")
    .select("type, target, round, page_id, duration_ms, meta, source, client_ts, received_at, id")
    .eq("participant_id", p.id)
    .order("id");
  if (types) q = q.in("type", types);
  const { data } = await q;
  return (data ?? []) as unknown as EventRow[];
}

/**
 * Puts a participant (already logged in) on a step without clicking through the
 * earlier pages, as the server would have left it. Starts the timer when the step
 * is inside the task part. Reload /task afterwards.
 */
export async function jumpTo(code: string, pageId: string) {
  const { data: p } = await serviceClient()
    .from("participants")
    .select("flow_version")
    .eq("access_code", code)
    .single();
  const flow = p?.flow_version === "A" ? FLOW_A : FLOW_B;
  const idx = flow.findIndex((s) => s.id === pageId);
  if (idx < 0) throw new Error(`Unknown step ${pageId}`);
  const start = flow.findIndex((s) => s.timer === "start");
  const end = flow.findIndex((s) => s.timer === "end");
  const update: {
    current_page: string;
    current_round: number | null;
    task_started_at?: string;
    task_deadline?: string;
    task_end_at?: string | null;
  } = {
    current_page: pageId,
    current_round: flow[idx].round ?? null,
  };
  if (idx >= start && idx <= end) {
    update.task_started_at = new Date(Date.now() - 60_000).toISOString();
    update.task_deadline = new Date(Date.now() + 39 * 60_000).toISOString();
    update.task_end_at = null;
  }
  const { error } = await serviceClient().from("participants").update(update).eq("access_code", code);
  if (error) throw new Error(`jumpTo: ${error.message}`);
}

/** Answers for a complete round (used by API-level checks). */
export function completeCaseAnswers(round: 1 | 2, ranks?: number[]) {
  const items: Record<string, number> = {};
  for (let no = 1; no <= 14; no++) {
    items[rankKey(no, round)] = ranks ? ranks[no - 1] : no;
    items[saveKey(no, round)] = no % 2;
  }
  return items;
}

/** Pause long enough for autosave (800 ms debounce) plus the request. */
export const AUTOSAVE_WAIT = 1800;

export async function waitForEvents(
  code: string,
  predicate: (rows: EventRow[]) => boolean,
  timeout = 15_000,
) {
  await expect.poll(async () => predicate(await eventsOf(code)), { timeout }).toBe(true);
}

export type { Locator };
