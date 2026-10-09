/**
 * Questionnaire and demographic texts (PLAN-06). One source for both flows and for the
 * codebook export (PLAN-07). Option numbers follow the order shown on screen.
 */

/** Manipulation check, part A: three multiple-choice questions. */
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
      "Dari memo penugasan yang diterima, penyelia/supervisor anda menyatakan bahwa (pilih salah satu):",
    options: [
      "Anda tidak harus mencantumkan identitas dan hasil pekerjaan akan dirapatkan bersama anggota tim lainnya",
      "Anda harus mencantumkan identitas, mendapatkan balikan secara formal dan mendapatkan komentar dari atasan terhadap pekerjaan yang anda lakukan",
      "Anda tidak perlu mencantumkan identitas dan akan mendapatkan komentar dari atasan terhadap pekerjaan yang anda lakukan",
    ],
  },
  {
    key: "mc_q3",
    legend:
      "Dari memo penugasan yang diterima, penyelia/supervisor anda meminta anda untuk (pilih salah satu):",
    options: [
      "Mempelajari peluang pengembangan usaha klien dari perspektif perpajakan",
      "Mempelajari, memeringkat dan menyimpan kasus yang ingin anda acu dalam pembuatan rekomendasi",
      "Mempelajari kasus pajak klien dan menentukan tingkat keyakinan anda atas rekomendasi yang diberikan",
    ],
  },
] as const;

/** Part B: four statements on a 1–5 agreement scale (1–2 client preference, 3–4 accountability). */
export const LIKERT_STATEMENTS = [
  "Klien anda menekankan bahwa perlakuan pajak untuk akun-akun yang mereka usulkan agar sesuai dengan usulan pada draft yang mereka sampaikan",
  "Klien anda menyatakan bahwa kontrak penugasan jangka panjang sangat tergantung kepada rekomendasi yang anda berikan",
  "Atasan anda menyatakan bahwa identitas anda harus lengkap dan pekerjaan anda akan dievaluasi",
  "Diskusi lebih lanjut dengan anggota tim lain dilakukan setelah anda mempelajari balikan (feedback) dari atasan anda",
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
export const EDUCATION = ["D.III", "S1", "S2", "S3"] as const;

/** E-wallets for the incentive claim (PERTANYAAN D4). `value` is what `contacts.ewallet` stores. */
export const EWALLETS = [
  { value: "gopay", label: "GoPay" },
  { value: "ovo", label: "OVO" },
  { value: "dana", label: "DANA" },
  { value: "shopeepay", label: "ShopeePay" },
  { value: "linkaja", label: "LinkAja" },
] as const;
