/**
 * Participant page ids (PRD 0.2 §6.3) and how the admin panel describes a
 * participant's position (FSD-Admin 0.2 §5.3). Shared with the participant app.
 */
export const PAGE_NAMES: Record<string, string> = {
  consent: "Persetujuan",
  login: "Masuk",
  welcome: "Selamat datang",
  role: "Peran",
  rules: "Aturan",
  case_info: "Info kasus acuan",
  facts_1: "Fakta Klien",
  facts_2: "Fakta Klien",
  facts_3: "Fakta Klien",
  facts_4: "Fakta Klien",
  minutes: "Berita Acara",
  memo_intro: "Pengantar memo",
  memo: "Memo",
  cases_intro_r1: "Instruksi kasus",
  cases_r1: "Daftar kasus",
  covariates: "Pertanyaan pengetahuan",
  rec_intro_r1: "Pengantar rekomendasi",
  client_draft_r1: "Draft klien",
  rec_r1: "Rekomendasi",
  confidence_r1: "Keyakinan",
  review: "Reviu Atasan",
  cases_intro_r2: "Instruksi kasus",
  cases_r2: "Daftar kasus",
  rec_intro_r2: "Pengantar rekomendasi",
  client_draft_r2: "Draft klien",
  rec_r2: "Rekomendasi",
  confidence_r2: "Keyakinan",
  mc_choice: "Cek manipulasi",
  mc_likert: "Cek manipulasi",
  demographics: "Demografi",
  debriefing: "Taklimat",
  finish: "Selesai",
  time_up: "Waktu habis",
};

const SECTION_BY_PAGE: Record<string, string> = {
  cases_intro_r1: "Putaran 1",
  cases_r1: "Putaran 1",
  covariates: "Putaran 1",
  rec_intro_r1: "Putaran 1",
  client_draft_r1: "Putaran 1",
  rec_r1: "Putaran 1",
  confidence_r1: "Putaran 1",
  review: "",
  cases_intro_r2: "Putaran 2",
  cases_r2: "Putaran 2",
  rec_intro_r2: "Putaran 2",
  client_draft_r2: "Putaran 2",
  rec_r2: "Putaran 2",
  confidence_r2: "Putaran 2",
  mc_choice: "Kuesioner",
  mc_likert: "Kuesioner",
  demographics: "Kuesioner",
  debriefing: "Kuesioner",
};

/** e.g. "Putaran 1 · Daftar kasus", "Berkas klien · Memo", "Reviu Atasan". */
export function positionLabel(pageId: string | null | undefined): string | null {
  if (!pageId) return null;
  const name = PAGE_NAMES[pageId] ?? pageId;
  if (pageId === "review" || pageId === "finish" || pageId === "time_up") return name;
  const section = SECTION_BY_PAGE[pageId] ?? "Pembuka";
  return `${section} · ${name}`;
}
