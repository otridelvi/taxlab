import { COV, MINUTES_QUESTIONS } from "@/content/text";
import { EDUCATION, GENDER, LIKERT_LABELS, LIKERT_STATEMENTS, MC_QUESTIONS } from "@/content/questions";
import { CASE_COUNT, REC_ACCOUNTS, pad2 } from "@/lib/metrics";

/**
 * Single definition of every dataset variable (FSD-Admin §8.4, PLAN-07 D-2). The order of this
 * list IS the column order of the dataset export, and the same list becomes the Codebook sheet,
 * so the two can never differ. Values are computed in `lib/metrics.ts` (same names).
 */
export type VarType = "text" | "int" | "decimal" | "time" | "flag";

export type CodebookVar = {
  name: string;
  group: string;
  /** 1 / 2 for round variables, null otherwise. */
  round: 1 | 2 | null;
  description: string;
  type: VarType;
  /** Allowed values or unit. */
  values: string;
  /** Page or event the value comes from. */
  source: string;
};

const stripHtml = (s: string) => s.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();
const options = (list: readonly string[]) => list.map((o, i) => `${i + 1} = ${stripHtml(o)}`).join("; ");
const SEC = "detik";
const YN = "1 = ya, 0 = tidak";

const REC_NAMES: Record<string, string> = {
  knowhow: "know how fee",
  entertain: "entertainment",
  repair: "perbaikan dan pemeliharaan",
  marketing: "pemasaran",
};

function def(
  name: string,
  group: string,
  description: string,
  type: VarType,
  values: string,
  source: string,
  round: 1 | 2 | null = null,
): CodebookVar {
  return { name, group, round, description, type, values, source };
}

function roundVars(r: 1 | 2): CodebookVar[] {
  const s = `_r${r}`;
  const out: CodebookVar[] = [];
  const g = `Putaran ${r}`;
  for (let no = 1; no <= CASE_COUNT; no++) {
    const n = pad2(no);
    out.push(
      def(`case${n}_opened${s}`, `${g} · kasus`, `Kasus ${no} dibuka minimal sekali`, "flag", YN, "event case_open", r),
      def(`case${n}_open_n${s}`, `${g} · kasus`, `Berapa kali kasus ${no} dibuka`, "int", "jumlah", "event case_open", r),
      def(
        `case${n}_dur_s${s}`,
        `${g} · kasus`,
        `Waktu baca kasus ${no} (buka sampai tutup, dikurangi tab tersembunyi)`,
        "int",
        SEC,
        "event case_open/case_close, tab_hidden/tab_visible",
        r,
      ),
      def(
        `case${n}_dur_imputed${s}`,
        `${g} · kasus`,
        `Durasi kasus ${no} diperkirakan karena case_close hilang (maks. 10 menit)`,
        "flag",
        YN,
        "event case_open/case_close",
        r,
      ),
    );
  }
  out.push(
    def(`cases_opened_n${s}`, `${g} · ringkasan`, "Jumlah kasus yang dibuka", "int", `0–${CASE_COUNT}`, "event case_open", r),
    def(`cases_dur_total_s${s}`, `${g} · ringkasan`, "Total waktu baca semua kasus", "int", SEC, "event case_open/case_close", r),
    def(`first_case_opened${s}`, `${g} · ringkasan`, "Nomor kasus yang pertama dibuka", "int", `1–${CASE_COUNT}`, "event case_open", r),
  );
  const docs: Array<[string, string]> = [
    ["facts", "Fakta Klien"],
    ["minutes", "Berita Acara"],
    ["memo", "Memo"],
  ];
  if (r === 2) docs.push(["review", "Reviu Atasan"]);
  for (const [doc, label] of docs) {
    out.push(
      def(`ref_${doc}_n${s}`, `${g} · referensi`, `Berapa kali ${label} dibuka dari menu Berkas`, "int", "jumlah", "event ref_open", r),
      def(`ref_${doc}_s${s}`, `${g} · referensi`, `Total waktu ${label} terbuka di menu Berkas`, "int", SEC, "event ref_open/ref_close", r),
    );
  }
  for (let no = 1; no <= CASE_COUNT; no++) {
    const n = pad2(no);
    out.push(
      def(`rank_case${n}${s}`, `${g} · peringkat`, `Peringkat kasus ${no} (1 = paling layak diacu)`, "int", `1–${CASE_COUNT}`, `halaman Daftar kasus`, r),
      def(`save_case${n}${s}`, `${g} · peringkat`, `Kasus ${no} disimpan sebagai acuan`, "flag", YN, `halaman Daftar kasus`, r),
    );
  }
  return out;
}

function recVars(r: 1 | 2): CodebookVar[] {
  const s = `_r${r}`;
  const g = `Putaran ${r} · rekomendasi`;
  return [
    ...REC_ACCOUNTS.map((a) =>
      def(`rec_${a}${s}`, g, `Rekomendasi biaya ${REC_NAMES[a]}`, "int", "Rupiah", "halaman Rekomendasi", r),
    ),
    def(`rec_total${s}`, g, "Total rekomendasi (jumlah empat akun; kosong bila ada akun kosong)", "int", "Rupiah", "dihitung", r),
    def(`confidence${s}`, g, "Tingkat keyakinan atas rekomendasi", "int", "0–100", "halaman Keyakinan", r),
  ];
}

export function buildCodebook(): CodebookVar[] {
  const list: CodebookVar[] = [];
  const push = (...v: CodebookVar[]) => list.push(...v);

  push(
    def("code", "Identitas", "Kode akses partisipan", "text", "TX-XXXX-XXXX", "participants"),
    def("cell", "Identitas", "Sel perlakuan", "int", "1 = implisit/lemah, 2 = eksplisit/lemah, 3 = implisit/kuat, 4 = eksplisit/kuat", "participants"),
    def("pref", "Identitas", "Faktor preferensi klien", "text", "impl, expl", "participants.cell"),
    def("acc", "Identitas", "Faktor akuntabilitas", "text", "weak, strong", "participants.cell"),
    def("batch", "Identitas", "Label batch kode", "text", "teks", "batches"),
    def("status", "Identitas", "Status partisipan", "text", "not_started, in_progress, completed, timed_out, cancelled", "participants"),
    def("content_version", "Identitas", "Versi konten yang dilihat partisipan", "text", "teks", "participants"),
    def("flow_version", "Identitas", "Versi alur penugasan", "text", "A, B", "participants"),
  );
  push(
    def("consent_at", "Waktu", "Waktu persetujuan", "time", "ISO 8601 +07:00", "event consent"),
    def("started_at", "Waktu", "Waktu sesi dimulai", "time", "ISO 8601 +07:00", "participants"),
    def("r1_start_at", "Waktu", "Awal putaran 1", "time", "ISO 8601 +07:00", "event round_start"),
    def("r1_end_at", "Waktu", "Akhir putaran 1", "time", "ISO 8601 +07:00", "event round_end"),
    def("review_end_at", "Waktu", "Akhir halaman Reviu Atasan (awal putaran 2)", "time", "ISO 8601 +07:00", "event round_start"),
    def("r2_end_at", "Waktu", "Akhir putaran 2", "time", "ISO 8601 +07:00", "event round_end"),
    def("finished_at", "Waktu", "Waktu sesi selesai", "time", "ISO 8601 +07:00", "participants"),
    def("duration_total_s", "Waktu", "Total durasi (persetujuan sampai selesai)", "int", SEC, "dihitung"),
    def("duration_intro_s", "Waktu", "Durasi bagian pembuka", "int", SEC, "dihitung"),
    def("duration_r1_s", "Waktu", "Durasi putaran 1", "int", SEC, "dihitung"),
    def("duration_review_s", "Waktu", "Durasi antara putaran 1 dan 2 (Reviu Atasan)", "int", SEC, "dihitung"),
    def("duration_r2_s", "Waktu", "Durasi putaran 2", "int", SEC, "dihitung"),
    def("duration_quest_s", "Waktu", "Durasi kuesioner dan penutup", "int", SEC, "dihitung"),
    def("timed_out", "Waktu", "Waktu penugasan habis", "flag", YN, "participants"),
    def("timed_out_at_page", "Waktu", "Halaman saat waktu habis", "text", "id halaman", "participants"),
  );
  MINUTES_QUESTIONS.forEach((q, i) =>
    push(def(q.key, "Berita Acara", `Kesan ${i + 1} dari Berita Acara`, "int", options(q.options), "halaman Berita Acara")),
  );
  push(...roundVars(1));
  COV.forEach((q, i) =>
    push(def(`cov_q${i + 1}`, "Kovariat", stripHtml(q.legend), "int", options(q.options), "halaman Pertanyaan")),
  );
  push(
    def("cov_score", "Kovariat", "Jumlah jawaban kovariat yang sesuai kunci (kosong sampai kunci tersedia)", "int", `0–${COV.length}`, "dihitung"),
  );
  push(...recVars(1));
  push(
    def("review_dur_s", "Reviu Atasan", "Waktu baca halaman Reviu Atasan (alur A)", "int", SEC, "event page_view/page_leave"),
    def("memo_read_s", "Alur B", "Waktu baca memo (buka berkas sampai pindah halaman, dikurangi tab tersembunyi; alur B)", "int", SEC, "event doc_open/page_leave"),
    def("memo_gap_s", "Alur B", "Jeda dari halaman memo tampil sampai memo dibuka (alur B)", "int", SEC, "event page_view/doc_open"),
    def("review_read_s", "Alur B", "Waktu baca reviu atasan (alur B)", "int", SEC, "event doc_open/page_leave"),
    def("review_gap_s", "Alur B", "Jeda dari halaman reviu tampil sampai reviu dibuka (alur B)", "int", SEC, "event page_view/doc_open"),
  );
  push(...roundVars(2));
  push(...recVars(2));
  push(
    ...REC_ACCOUNTS.map((a) =>
      def(`rec_${a}_delta`, "Perubahan", `Rekomendasi ${REC_NAMES[a]}: putaran 2 − putaran 1`, "int", "Rupiah", "dihitung"),
    ),
    def("rec_total_delta", "Perubahan", "Total rekomendasi: putaran 2 − putaran 1", "int", "Rupiah", "dihitung"),
    def("confidence_delta", "Perubahan", "Keyakinan: putaran 2 − putaran 1", "int", "poin", "dihitung"),
    def("rank_changed_n", "Perubahan", "Jumlah kasus yang peringkatnya berubah (hanya kasus berperingkat di kedua putaran)", "int", `0–${CASE_COUNT}`, "dihitung"),
    def("rank_abs_shift_sum", "Perubahan", "Jumlah selisih mutlak peringkat", "int", "posisi", "dihitung"),
    def("rank_spearman", "Perubahan", "Korelasi Spearman peringkat putaran 1 dan 2 (kosong bila < 3 kasus)", "decimal", "−1 sampai 1", "dihitung"),
    def("save_changed_n", "Perubahan", "Jumlah kasus yang pilihan simpannya berubah", "int", `0–${CASE_COUNT}`, "dihitung"),
    def("cases_opened_delta", "Perubahan", "Kasus dibuka: putaran 2 − putaran 1", "int", "jumlah", "dihitung"),
  );
  MC_QUESTIONS.forEach((q, i) =>
    push(def(`mc_q${i + 1}`, "Cek manipulasi", stripHtml(q.legend), "int", options(q.options), "halaman Cek manipulasi")),
  );
  LIKERT_STATEMENTS.forEach((st, i) =>
    push(def(`mc_likert${i + 1}`, "Cek manipulasi", st, "int", options(LIKERT_LABELS), "halaman Cek manipulasi")),
  );
  push(
    def("mc_pass_pref", "Cek manipulasi", "Lulus cek preferensi klien (mc_q1 sesuai sel)", "flag", YN, "dihitung"),
    def("mc_pass_acc", "Cek manipulasi", "Lulus cek akuntabilitas (mc_q2 sesuai sel)", "flag", YN, "dihitung"),
    def("semester", "Demografi", "Semester", "int", "1–20", "halaman Demografi"),
    def("gender", "Demografi", "Jenis kelamin", "int", options(GENDER), "halaman Demografi"),
    def("age", "Demografi", "Umur", "int", "tahun", "halaman Demografi"),
    def("education", "Demografi", "Tingkat pendidikan", "int", options(EDUCATION), "halaman Demografi"),
  );
  return list;
}

/** Dataset column names in export order. */
export const DATASET_COLUMNS: readonly string[] = buildCodebook().map((v) => v.name);

export const CODEBOOK_HEADERS = ["variable", "group", "round", "description", "type", "values_unit", "source"] as const;
