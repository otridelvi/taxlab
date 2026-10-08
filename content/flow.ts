import type { Factors } from "@/lib/cell";
import type { ItemSpec } from "@/lib/items";
import { MINUTES_QUESTIONS } from "./text";

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
  { id: "cases_r1", kind: "cases", section: "cases", round: 1, menu: M3 },
  { id: "covariates", kind: "mcq", section: "questions", round: 1, menu: M3 },
  { id: "rec_intro_r1", kind: "text", section: "recommendation", round: 1, menu: M3 },
  { id: "client_draft_r1", kind: "draft", section: "recommendation", round: 1, menu: M3 },
  { id: "rec_r1", kind: "recommendation", section: "recommendation", round: 1, menu: M3 },
  { id: "confidence_r1", kind: "confidence", section: "recommendation", round: 1, menu: M3 },
  { id: "review", kind: "review", section: "review", menu: M3 },
  { id: "cases_intro_r2", kind: "text", section: "cases", round: 2, menu: M4, next: "Lihat kasus acuan" },
  { id: "cases_r2", kind: "cases", section: "cases", round: 2, menu: M4 },
  { id: "rec_intro_r2", kind: "text", section: "recommendation", round: 2, menu: M4 },
  { id: "client_draft_r2", kind: "draft", section: "recommendation", round: 2, menu: M4 },
  { id: "rec_r2", kind: "recommendation", section: "recommendation", round: 2, menu: M4 },
  { id: "confidence_r2", kind: "confidence", section: "recommendation", round: 2, menu: M4, timer: "end" },
  { id: "mc_choice", kind: "mcq", section: "quest" },
  { id: "mc_likert", kind: "likert", section: "quest" },
  { id: "demographics", kind: "demographics", section: "quest" },
  { id: "debriefing", kind: "text", section: "end" },
  { id: "finish", kind: "finish", section: "end" },
];

/** System step shown when the task time runs out (not part of the normal order). */
export const TIME_UP_STEP: Step = {
  id: "time_up",
  kind: "time_up",
  section: "system",
  next: "Lanjut ke pertanyaan",
};
