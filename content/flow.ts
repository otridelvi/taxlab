import type { Factors } from "@/lib/cell";
import type { ItemSpec } from "@/lib/items";
import { COV, COV_B, DEMO_TEXT, MINUTES_QUESTIONS, REC_LABELS } from "./text";
import { EDUCATION, EWALLETS, GENDER, LIKERT_LABELS, LIKERT_STATEMENTS, MC_QUESTIONS } from "./questions";

/**
 * Participant flow as configuration (FSD-Participant §4). The page shown is
 * always participants.current_page; "next" is simply the following step.
 * Consent (/) and login (/login) come before these steps and are separate routes.
 */
export type Section =
  | "welcome"
  | "intro"
  | "files"
  | "cases"
  | "questions"
  | "recommendation"
  | "review"
  | "quest"
  | "end"
  | "system";

export type StepKind =
  | "text"
  | "facts"
  | "minutes"
  | "memo"
  | "cases"
  | "mcq"
  | "questionnaire"
  | "draft"
  | "recommendation"
  | "confidence"
  | "review"
  | "likert"
  | "demographics"
  | "time_up"
  | "finish";

export type RefDoc = "facts" | "minutes" | "memo" | "review";

export type Step = {
  id: string;
  kind: StepKind;
  section: Section;
  round?: 1 | 2;
  /** "start": the task timer starts when this step is entered; "end": it stops when this step is left. */
  timer?: "start" | "end";
  /** Reference documents available from this step (menu Berkas, PLAN-04). */
  menu?: readonly RefDoc[];
  /** Items collected on this step, per experimental factors. */
  items?: (f: Factors) => ItemSpec[];
  /** Label of the Next button. */
  next?: string;
  /**
   * Flow B (PLAN-05 D-3): the document arrives closed; its content and items appear after the
   * button "Buka …" (event doc_open) and Next stays disabled until then. The server refuses
   * to advance without the event.
   */
  gate?: "memo" | "review";
  /** Flow B (B-10): the file map is shown beside the page; the value is the file this page is about. */
  map?: "facts" | "minutes" | "memo";
  /** Flow B (B-9): the page itself ends the session with the button "Survey Selesai". */
  ends?: boolean;
};

/** Section label in the header. Never mentions rounds (FSD §9.2). */
export const SECTION_LABELS: Record<Section, string> = {
  welcome: "Selamat datang",
  intro: "Petunjuk",
  files: "Berkas klien",
  cases: "Kasus acuan",
  questions: "Pertanyaan",
  recommendation: "Rekomendasi",
  review: "Reviu atasan",
  quest: "Kuesioner",
  end: "Penutup",
  system: "Penugasan",
};

/**
 * Must every one of the 14 cases get a rank and a Save answer before Next?
 * (PERTANYAAN A4, assumption AP-4: yes.) Set to false to make them optional;
 * repeated ranks are refused either way.
 */
export const REQUIRE_ALL_CASES = true;

export const CASE_COUNT = 14;
const RANK_GROUP = { id: "rank", name: "peringkat" } as const;
const SAVE_GROUP = { id: "save", name: "pilihan simpan" } as const;
const pad2 = (n: number) => String(n).padStart(2, "0");
const CASE_NUMBERS = Array.from({ length: CASE_COUNT }, (_, i) => i + 1);

/** Item key of a case's rank / save answer (`rank_case03_r1`). */
export const rankKey = (no: number, round: 1 | 2) => `rank_case${pad2(no)}_r${round}`;
export const saveKey = (no: number, round: 1 | 2) => `save_case${pad2(no)}_r${round}`;

const casesItems = (round: 1 | 2) => (): ItemSpec[] => [
  ...CASE_NUMBERS.map((no): ItemSpec => ({
    key: rankKey(no, round),
    type: "integer",
    name: `peringkat kasus ${no}`,
    min: 1,
    max: CASE_COUNT,
    unique: `rank_r${round}`,
    group: RANK_GROUP,
    required: REQUIRE_ALL_CASES,
  })),
  ...CASE_NUMBERS.map((no): ItemSpec => ({
    key: saveKey(no, round),
    type: "binary",
    name: `pilihan simpan kasus ${no}`,
    group: SAVE_GROUP,
    required: REQUIRE_ALL_CASES,
  })),
];

const covariateItems = (): ItemSpec[] =>
  COV.map((q, i) => ({
    key: `cov_q${i + 1}`,
    type: "choice" as const,
    legend: q.legend,
    options: q.options,
    name: `jawaban pertanyaan ${i + 1}`,
    letters: true,
    number: i + 1,
  }));

/** Flow B (B-12): same keys and option order, no a/b/c letters, "Kedua jawaban di atas benar". */
const covariateItemsB = (): ItemSpec[] =>
  COV_B.map((q, i) => ({
    key: `cov_q${i + 1}`,
    type: "choice" as const,
    legend: q.legend,
    options: q.options,
    name: `jawaban pertanyaan ${i + 1}`,
    number: i + 1,
  }));

const MCQ_GROUP = { id: "mcq", name: "pertanyaan" } as const;
const LIKERT_GROUP = { id: "likert", name: "pernyataan" } as const;

/** Manipulation check, part A (PLAN-06): three multiple-choice questions, no a/b/c letters. */
const mcItems = (): ItemSpec[] =>
  MC_QUESTIONS.map((q, i) => ({
    key: q.key,
    type: "choice" as const,
    legend: q.legend,
    options: q.options,
    name: `jawaban pertanyaan ${i + 1}`,
    number: i + 1,
    group: MCQ_GROUP,
  }));

/** Part B: four statements on a 1–5 scale. */
const likertItems = (): ItemSpec[] =>
  LIKERT_STATEMENTS.map((statement, i) => ({
    key: `mc_likert${i + 1}`,
    type: "likert" as const,
    statement,
    labels: LIKERT_LABELS,
    name: `pernyataan ${i + 1}`,
    number: i + 1,
    group: LIKERT_GROUP,
  }));

/** Flow B: both parts on one page. */
const questionnaireItems = (): ItemSpec[] => [...mcItems(), ...likertItems()];

/** Demographics and the optional incentive claim (PLAN-06 D-5…D-8). */
const demographicItems = (): ItemSpec[] => [
  {
    key: "semester",
    type: "integer",
    name: "semester",
    label: DEMO_TEXT.semester.label,
    placeholder: DEMO_TEXT.semester.placeholder,
    min: 1,
    max: 20,
  },
  {
    key: "gender",
    type: "choice",
    legend: DEMO_TEXT.gender,
    options: GENDER,
    name: "jenis kelamin",
    pills: true,
  },
  {
    key: "age",
    type: "integer",
    name: "umur",
    label: DEMO_TEXT.age.label,
    unit: DEMO_TEXT.age.unit,
    min: 15,
    max: 80,
  },
  {
    key: "education",
    type: "choice",
    legend: DEMO_TEXT.education,
    options: EDUCATION,
    name: "tingkat pendidikan",
    pills: true,
  },
  {
    key: "contact_ewallet",
    type: "select",
    label: DEMO_TEXT.ewallet,
    name: "jenis e-wallet",
    options: EWALLETS,
    groupLegend: DEMO_TEXT.incentive,
    contact: "ewallet",
    requiredWith: "contact_phone",
    required: false,
  },
  {
    key: "contact_phone",
    type: "phone",
    label: DEMO_TEXT.phone,
    name: "No. HP",
    maxLength: 20,
    note: DEMO_TEXT.note,
    contact: "phone",
    requiredWith: "contact_ewallet",
    required: false,
  },
];

const recItems = (round: 1 | 2) => (): ItemSpec[] =>
  REC_LABELS.map(([id, label]) => ({
    key: `rec_${id}_r${round}`,
    type: "integer" as const,
    name: label.charAt(0).toLowerCase() + label.slice(1),
    label,
    min: 0,
    max: 9_999_999_999_999,
  }));

const confidenceItems = (round: 1 | 2) => (): ItemSpec[] => [
  { key: `confidence_r${round}`, type: "integer", name: "tingkat keyakinan", min: 0, max: 100 },
];

const M3 = ["facts", "minutes", "memo"] as const;
const M4 = ["facts", "minutes", "memo", "review"] as const;

const minutesItems = (f: Factors): ItemSpec[] =>
  f.pref === "impl"
    ? MINUTES_QUESTIONS.map((q, i) => ({
        key: q.key,
        type: "choice" as const,
        legend: q.legend,
        options: q.options,
        name: `jawaban pertanyaan ${i + 1}`,
      }))
    : [];

const memoItems = (f: Factors): ItemSpec[] =>
  f.acc === "strong"
    ? [
        {
          key: "contact_name",
          type: "text",
          label: "Nama lengkap",
          name: "nama lengkap",
          autoComplete: "name",
          maxLength: 120,
          contact: "name",
        },
        {
          key: "contact_email",
          type: "email",
          label: "Alamat email",
          name: "alamat email",
          autoComplete: "email",
          maxLength: 254,
          contact: "email",
        },
      ]
    : [];

/** Alur A (PRD 0.2 §6.3, default). */
export const FLOW_A: readonly Step[] = [
  { id: "welcome", kind: "text", section: "welcome", next: "Mulai penugasan" },
  { id: "role", kind: "text", section: "intro", timer: "start" },
  { id: "rules", kind: "text", section: "intro" },
  { id: "case_info", kind: "text", section: "intro", next: "Baca kasus klien" },
  { id: "facts_1", kind: "facts", section: "files" },
  { id: "facts_2", kind: "facts", section: "files" },
  { id: "facts_3", kind: "facts", section: "files" },
  { id: "facts_4", kind: "facts", section: "files" },
  { id: "minutes", kind: "minutes", section: "files", items: minutesItems },
  { id: "memo_intro", kind: "text", section: "files", next: "Buka memo penugasan" },
  { id: "memo", kind: "memo", section: "files", items: memoItems },
  { id: "cases_intro_r1", kind: "text", section: "cases", round: 1, next: "Lihat kasus acuan" },
  { id: "cases_r1", kind: "cases", section: "cases", round: 1, menu: M3, items: casesItems(1) },
  { id: "covariates", kind: "mcq", section: "questions", round: 1, menu: M3, items: covariateItems },
  { id: "rec_intro_r1", kind: "text", section: "recommendation", round: 1, menu: M3 },
  { id: "client_draft_r1", kind: "draft", section: "recommendation", round: 1, menu: M3 },
  { id: "rec_r1", kind: "recommendation", section: "recommendation", round: 1, menu: M3, items: recItems(1) },
  {
    id: "confidence_r1",
    kind: "confidence",
    section: "recommendation",
    round: 1,
    menu: M3,
    items: confidenceItems(1),
    next: "Simpan",
  },
  { id: "review", kind: "review", section: "review", menu: M3 },
  { id: "cases_intro_r2", kind: "text", section: "cases", round: 2, menu: M4, next: "Lihat kasus acuan" },
  { id: "cases_r2", kind: "cases", section: "cases", round: 2, menu: M4, items: casesItems(2) },
  { id: "rec_intro_r2", kind: "text", section: "recommendation", round: 2, menu: M4 },
  { id: "client_draft_r2", kind: "draft", section: "recommendation", round: 2, menu: M4 },
  { id: "rec_r2", kind: "recommendation", section: "recommendation", round: 2, menu: M4, items: recItems(2) },
  {
    id: "confidence_r2",
    kind: "confidence",
    section: "recommendation",
    round: 2,
    menu: M4,
    timer: "end",
    items: confidenceItems(2),
    next: "Simpan",
  },
  { id: "mc_choice", kind: "mcq", section: "quest", items: mcItems },
  { id: "mc_likert", kind: "likert", section: "quest", items: likertItems },
  { id: "demographics", kind: "demographics", section: "quest", items: demographicItems },
  { id: "debriefing", kind: "text", section: "end" },
  { id: "finish", kind: "finish", section: "end" },
];

/**
 * Alur B (Opsi B, PLAN-05): 18 steps (+ consent and login = 20 pages). Same item keys as
 * flow A (PR-3). B-6: client draft above the answer fields; B-11 (notebook) not used.
 */
export const FLOW_B: readonly Step[] = [
  { id: "welcome", kind: "text", section: "welcome", next: "Mulai penugasan" },
  { id: "instructions", kind: "text", section: "intro", timer: "start", next: "Baca kasus klien" },
  { id: "facts_1", kind: "facts", section: "files", map: "facts" },
  { id: "facts_costs", kind: "facts", section: "files", map: "facts" },
  { id: "minutes", kind: "minutes", section: "files", map: "minutes", items: minutesItems },
  { id: "memo", kind: "memo", section: "files", map: "memo", gate: "memo", items: memoItems },
  { id: "cases_intro_r1", kind: "text", section: "cases", round: 1, next: "Lihat kasus acuan" },
  { id: "cases_r1", kind: "cases", section: "cases", round: 1, menu: M3, items: casesItems(1) },
  { id: "covariates", kind: "mcq", section: "questions", round: 1, menu: M3, items: covariateItemsB },
  { id: "rec_r1", kind: "recommendation", section: "recommendation", round: 1, menu: M3, items: recItems(1) },
  {
    id: "confidence_r1",
    kind: "confidence",
    section: "recommendation",
    round: 1,
    menu: M3,
    items: confidenceItems(1),
    next: "Simpan",
  },
  { id: "review", kind: "review", section: "review", menu: M3, gate: "review" },
  { id: "cases_r2", kind: "cases", section: "cases", round: 2, menu: M4, items: casesItems(2) },
  { id: "rec_r2", kind: "recommendation", section: "recommendation", round: 2, menu: M4, items: recItems(2) },
  {
    id: "confidence_r2",
    kind: "confidence",
    section: "recommendation",
    round: 2,
    menu: M4,
    timer: "end",
    items: confidenceItems(2),
    next: "Simpan",
  },
  { id: "questionnaire", kind: "questionnaire", section: "quest", items: questionnaireItems },
  { id: "demographics", kind: "demographics", section: "quest", items: demographicItems },
  { id: "debriefing", kind: "text", section: "end", ends: true },
];

/** System step shown when the task time runs out (not part of the normal order). */
export const TIME_UP_STEP: Step = {
  id: "time_up",
  kind: "time_up",
  section: "system",
  next: "Lanjut ke pertanyaan",
};
