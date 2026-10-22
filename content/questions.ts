/**
 * Questionnaire and demographic texts (PLAN-06). One source for both flows and for the
 * codebook export (PLAN-07). Option numbers follow the order shown on screen.
 */

/**
 * Manipulation check, part A: three multiple-choice questions. Questions 2 and 3 name the
 * supervisor document as "Reviu atau Catatan" for every cell (researcher wording, 22 Oct 2026),
 * so the legends no longer vary with the review factor.
 */
export const MC_QUESTIONS = [
  {
    key: "mc_q1",
    legend: "Dalam pertemuan dengan manajemen klien, mereka menyatakan bahwa (pilih salah satu):",
    options: [
      "Mereka menginginkan posisi tertentu untuk akun-akun yang dikonsultasikan",
      "Mereka akan memperhatikan dan menghargai saran-saran dan penyesuaian yang diberikan",
      "Mereka ikut saja dengan apapun saran-saran dari anda atau kantor anda",
    ],
  },
  {
    key: "mc_q2",
    legend:
      "Dari Reviu atau Catatan yang anda terima, penyelia/supervisor anda menyatakan bahwa (pilih salah satu):",
    options: [
      "Anda Pastikan Apakah strategi dan dasar hukum yang digunakan sudah aman dan sesuai yurisprudensi",
      "Anda harus mencantumkan identitas, mendapatkan balikan secara formal dan mendapatkan komentar dari atasan terhadap pekerjaan yang anda lakukan",
      "Anda tidak perlu mencantumkan identitas dan akan mendapatkan komentar dari atasan terhadap pekerjaan yang anda lakukan",
    ],
  },
  {
    key: "mc_q3",
    legend:
      "Dari Reviu atau Catatan atasan yang diterima, penyelia/supervisor anda meminta anda untuk (pilih salah satu):",
    options: [
      "Meminta anda memastikan proses, metode, dan rujukan hukumnya sudah sesuai dengan aturan main yang benar.",
      "Memastikan anda memberikan penilaian terhadap setiap isu perpajakan klien",
      "Memberikan saran tertulis untuk rekomendasi yang anda sampaikan kepada klien secara langsung",
    ],
  },
] as const;

/** Same questions for every cell; kept as a function so callers stay unchanged. */
export const mcQuestions = (_review?: "yes" | "no") => MC_QUESTIONS;

/** Part B: four statements on a 1–5 agreement scale (1–2 client preference, 3–4 supervisor review). */
export const LIKERT_STATEMENTS = [
  "Klien anda menekankan bahwa perlakuan pajak untuk akun-akun yang mereka usulkan agar sesuai dengan usulan pada draft yang mereka sampaikan",
  "Klien anda menyatakan bahwa kontrak penugasan jangka panjang sangat tergantung kepada rekomendasi yang anda berikan",
  "Atasan anda menyatakan bahwa angka yang anda usulkan sudah benar, baik dari sisi regulasi maupun laporan (angka-angka) yang menjadi rujukan",
  "Atasan anda menyatakan pada kertas reviu agar catatan perbaikan (review notes), revisi kertas kerja, atau penyesuaian angka/kebijakan akan disampaikan melalui email anda",
] as const;

export const LIKERT_LABELS = [
  "Sangat tidak setuju",
  "Tidak setuju",
  "Netral",
  "Setuju",
  "Sangat setuju",
] as const;

/** Demographics: stored value = 1-based index of the option. */
export const GENDER = ["L", "P"] as const;
export const UNIVERSITY = ["UNAND", "UGM", "UNP"] as const;

/** E-wallets for the incentive claim (PERTANYAAN D4). `value` is what `contacts.ewallet` stores. */
export const EWALLETS = [
  { value: "gopay", label: "GoPay" },
  { value: "ovo", label: "OVO" },
  { value: "dana", label: "DANA" },
  { value: "shopeepay", label: "ShopeePay" },
  { value: "linkaja", label: "LinkAja" },
] as const;
