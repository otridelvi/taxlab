/**
 * Participant page text, taken verbatim from docs/flow general.pptx (same as
 * the mockup: planning/mockup-generator/content.py). Generated once; edit here.
 * Strings may contain limited trusted HTML: <strong>, <em>, <a>.
 */

export const CONSENT = [
  "Studi yang akan anda ikuti adalah tentang penyelesaian SPT tahunan bagi klien anda. Jika anda setuju untuk berpartisipasi studi ini, anda akan berperan sebagai staf konsultan pajak. Untuk dapat menyelesaikan pekerjaan ini, anda kemudian mendapatkan informasi-informasi yang harus anda pelajari terlebih dahulu. Anda harus mempertimbangkan informasi yang tersedia tersebut untuk menyelesaikan penugasan ini. Anda membutuhkan waktu lebih kurang <strong>40 menit tak terputus</strong> untuk menyelesaikan penugasan ini.",
  "Tidak ada risiko fisik atau mental apapun yang harus anda tanggung selama pelaksanaan penugasan ini. Anda akan mendapatkan insentif atas partisipasi anda pada penelitian ini. Insentif tersebut akan dikonversikan ke dalam bentuk dompet elektronik (e-wallet) senilai <strong>Rp75.000</strong> untuk kemudahan dan kecepatan pemberiannya karena studi ini dilakukan secara daring (online).",
  'Pertanyaan, komentar, saran atau informasi lebih lanjut atas penelitian ini dapat disampaikan langsung kepada peneliti Fauzan Misra melalui nomor handphone 081374166725 atau alamat email: <a href="mailto:fauzanmisra@eb.unand.ac.id">fauzanmisra@eb.unand.ac.id</a>.',
  "Jika anda setuju untuk berpartisipasi di dalam penelitian ini, silakan log in untuk masuk ke dalam laman penugasan.",
] as const;

export const WELCOME = [
  "Terima kasih atas kesediaan anda berpartisipasi dalam studi ini.",
  "Seperti disampaikan sebelumnya, anda butuh untuk menyediakan waktu tak terputus selama 40 menit untuk membaca informasi penugasan, menyelesaikan tugas dalam studi ini dan menjawab pertanyaan terkait penugasan yang diberikan.",
] as const;

export const ROLE_P1 =
  "Dalam studi ini anda berperan sebagai seorang <strong>profesional pajak yang bekerja sebagai staf pada sebuah kantor konsultan pajak</strong>. Anda bertanggung jawab untuk <strong>mencari informasi</strong> mengenai transaksi klien dan <strong>membuat rekomendasi awal</strong> yang akan disampaikan kepada atasan anda. Tidak ada jawaban yang salah dalam penyelesaian kasus ini." as const;

export const ROLE_STEPS = [
  "Membaca kasus pajak klien",
  "Mempelajari ikhtisar pertemuan dengan manajemen klien",
  "Membaca memo penugasan",
  "Pencarian informasi dari kasus-kasus pajak serupa pada perusahaan lain",
  "Memeringkat informasi",
  "Membuat rekomendasi pajak",
] as const;

export const ROLE_P2 =
  "Sisa waktu 10 menit dapat anda gunakan untuk menjawab pertanyaan sehubungan dengan penugasan yang anda terima." as const;

export const RULES = [
  "Anda diminta untuk <strong>tidak mendiskusikan kasus ini dengan siapapun</strong>, baik selama anda mengerjakannya maupun setelah menyelesaikannya. Silakan baca kasus dengan cermat dan jawab pertanyaan dengan jujur.",
  "Pastikan bahwa anda mengerjakan keseluruhan tugas. Anda akan tahu bahwa pekerjaan anda selesai ketika anda sampai pada halaman yang menyatakan <strong>“SURVEY SELESAI”</strong>.",
] as const;

export const CASEINFO = [
  "Sistem telah menyediakan informasi berupa kasus-kasus acuan yang dapat anda pelajari untuk pembuatan rekomendasi. Anda diminta untuk <strong>tidak menggunakan kasus atau material lain di luar yang telah disediakan oleh sistem</strong> untuk anda.",
  "Ketika anda telah siap untuk memulai, silakan dimulai dengan membaca kasus di halaman berikut.",
] as const;

export const FACT1_P =
  "PT Cahaya Gama berencana untuk melakukan pengembangan usaha dalam waktu dekat dengan membuka kantor cabang baru. Manajemen PT Cahaya Gama menyadari bahwa agar rencana pengembangan usaha mereka berhasil maka mereka membutuhkan aliran kas yang lebih baik. Salah satu cara yang ingin ditempuh oleh PT Cahaya Gama adalah dengan meringankan biaya pajak. Selain itu, karena rencana pengembangan usaha ini membutuhkan persetujuan dari pemegang saham, perusahaan ingin kinerja perusahaan secara keseluruhan terlihat lebih baik, yang dalam hal ini akan tercermin dalam laporan posisi keuangan dan laporan aliran kas perusahaan." as const;

export const PLAN = [
  "Pengembangan usaha dengan membuka kantor cabang baru",
  "Aliran kas yang lebih baik",
  "Penghematan pajak",
  "Persetujuan pemegang saham",
  "Berhasil",
] as const;

export const FACT2_P = [
  "Staf pajak PT Cahaya Gama telah membuat rekonsiliasi fiskal sementara, namun karena manajemen puncak melihat masih terdapat peluang untuk menekan beban pajak perusahaan, maka perusahaan meminta kepada kantor konsultan pajak untuk menyelesaikan rekonsiliasi fiskal mereka.",
  "Manajemen klien menyatakan beberapa akun masih mungkin dioptimalkan perlakuannya agar beban pajak menurun, akan tetapi mereka tidak mempunyai keyakinan yang cukup untuk melakukannya sendiri. Oleh karenanya, mereka meminta saran kepada kantor anda.",
  "Daftar biaya-biaya yang masih meragukan dalam penyelesaian SPT adalah sebagai berikut:",
] as const;

export const COSTS_FACT = [
  ["Biaya jasa konsultasi", "Rp250.000.000"],
  ["Biaya entertainment", "Rp200.000.000"],
  ["Biaya perbaikan dan pemeliharaan", "Rp300.000.000"],
  ["Biaya pemasaran", "Rp250.000.000"],
] as const;

export const COSTS_DRAFT = [
  ["Biaya know how fee", "Rp250.000.000"],
  ["Biaya entertainment", "Rp200.000.000"],
  ["Biaya perbaikan dan pemeliharaan", "Rp300.000.000"],
  ["Biaya pemasaran", "Rp250.000.000"],
] as const;

export const ACCT = [
  [
    "Biaya jasa konsultasi (know how fee)",
    "Biaya jasa konsultasi (<em>know how fee</em>) sebesar Rp250.000.000 merupakan biaya atas jasa desain produk baru perusahaan oleh perusahaan yang mempunyai hubungan istimewa di luar negeri. Perusahaan tersebut memiliki 55% saham perusahaan klien. Pembayaran telah dilakukan dengan bukti transfer yang didukung dengan voucher pembayaran yang dapat diperlihatkan sebagai bukti transaksi.",
  ],
  [
    "Biaya entertainment",
    "Biaya <em>entertainment</em> merupakan biaya untuk perjamuan dan fasilitas bagi tamu dan relasi bisnis. Semua bukti pengeluaran ada di perusahaan, dan 25% diantaranya didukung dengan daftar nominatif. Manajemen PT Cahaya Gama ingin agar biaya ini dibuat sebesar 40% dari keseluruhan biaya. Biaya sebesar Rp200.000.000 adalah untuk daftar nominatif setara 40% sesuai keinginan perusahaan klien (sementara nilai setara 25% adalah Rp125.000.000, setara 30% sama dengan Rp150.000.000 dan setara 35% sama dengan Rp175.000.000).",
  ],
  [
    "Biaya pemeliharaan dan perbaikan",
    "Biaya pemeliharaan dan perbaikan berasal dari reparasi mayor 3 unit mesin produksi senilai Rp100.000.000 dan reparasi minor 7 unit lainnya serta pemeliharaan rutin aset tetap perusahaan. Berdasarkan arahan dari Manajemen PT Cahaya Gama, staf pajak perusahaan mencatatnya sebagai biaya perbaikan dan pemeliharaan pada periode sekarang.",
  ],
  [
    "Biaya pemasaran",
    "Dari keseluruhan biaya pemasaran sebesar Rp250.000.000, terdiri dari pembayaran untuk promosi usaha melalui iklan pada media massa dan media elektronik sejumlah Rp125.000.000, <em>sponsorship</em> beberapa kegiatan Rp75.000.000 dan sumbangan untuk bencana alam sebesar Rp50.000.000.",
  ],
] as const;

export const NOTEPAD =
  "Anda dapat membuat catatan pada blocknote anda untuk memudahkan mengingat fakta-fakta yang akan digunakan dalam pembuatan rekomendasi nantinya." as const;

export const MIN_IMPL =
  "Dari pertemuan dengan klien, Manajemen PT Cahaya Gama menyatakan bahwa staf mereka telah menyiapkan draft rekonsiliasi fiskal sementara, namun mereka ingin untuk mendapatkan saran ahli yang lebih mengerti dan berpengalaman. Mereka menyatakan bahwa <strong>saran-saran dan penyesuaian yang diberikan akan sangat diperhatikan dan dievaluasi</strong> dengan mempertimbangkan kos-manfaat yang muncul terkait dengan rencana pengembangan usaha mereka dan prospek kerjasama di masa depan." as const;

export const MIN_EXPL = [
  "Dari pertemuan dengan klien, Manajemen PT Cahaya Gama menyatakan bahwa staf mereka telah menyiapkan draft rekonsiliasi fiskal sementara, namun mereka ingin untuk mendapatkan saran ahli yang lebih mengerti dan berpengalaman. Mereka menyatakan bahwa <strong>mereka menginginkan posisi tertentu untuk akun-akun yang didiskusikan</strong> meskipun saran-saran dan penyesuaian yang diberikan akan tetap dipertimbangkan. Menurut mereka, rencana akuisisi akan lebih mudah terealisasi jika penghematan pajak berhasil dilakukan.",
  "Manajemen PT Cahaya Gama menekankan bahwa saran yang diberikan seharusnya memberikan manfaat bagi PT Cahaya Gama, terutama dalam rencana pengembangan usaha mereka dan mengingat hubungan kerja yang sudah lama terbangun. <strong>Saran yang konsisten dengan draft usulan PT Cahaya Gama akan lebih disukai.</strong>",
  "Manajemen PT Cahaya Gama juga menegaskan kepada atasan anda bahwa keberhasilan menghemat pajak akan mendukung keberhasilan rencana pengembangan usaha. Hal ini mempunyai arti bahwa kantor konsultan anda akan tetap menjadi konsultan pajak untuk perusahaan yang semakin berkembang dengan prospek fee yang lebih tinggi.",
] as const;

export const MEMO_INTRO = [
  "Untuk memulai pekerjaan anda, anda terlebih dahulu perlu mempelajari <strong>memo penugasan</strong> dari atasan anda.",
  "Memo penugasan dimaksud seperti ditampilkan pada halaman berikut.",
] as const;

export const MEMO_BODY = [
  "PT Cahaya Gama adalah salah satu klien korporat yang bergerak dalam bisnis pemanufakturan dan telah menjadi klien kita selama beberapa tahun. Kita sedang dalam proses menyiapkan Surat Pemberitahuan (SPT) Tahunan Pajak Penghasilan Badan untuk PT Cahaya Gama (jika dibutuhkan, fakta klien dapat anda lihat kembali dengan mengklik pada menu “Fakta Klien” dan ikhtisar berita acara dengan mengklik “Berita Acara” setelah anda selesai membaca memo ini). Tujuan dari tugas anda adalah <strong>mempelajari, memeringkat dan menyimpan</strong> kasus-kasus yang mirip dengan kasus yang dihadapi oleh klien kita ke dalam buku catatan untuk kemudian menjadi acuan pembuatan rekomendasi anda mengenai transaksi klien.",
  "Kasus-kasus acuan tersebut telah disediakan pada halaman selanjutnya. Perlu menjadi perhatian anda bahwa:",
] as const;

export const MEMO_WEAK = [
  "Anda tidak harus mencantumkan nama dan alamat email anda",
  "Rekomendasi dan respon anda lainnya diperbolehkan anonim",
  "Hasil pekerjaan anda akan dirapatkan bersama dengan anggota tim lainnya untuk mendapatkan masukan atau perbaikan lainnya yang diperlukan",
] as const;

export const MEMO_STRONG = [
  "Anda harus mencantumkan nama anda dan alamat pos elektronik (email anda)",
  "Anda akan mendapatkan balikan formal atas pekerjaan anda",
  "Manajer/penyelia akan memberikan komentar spesifik atas kinerja anda",
  "Setelah mempelajari balikan dari atasan anda, hasil perbaikan anda akan dibawa ke rapat tim untuk didiskusikan lebih lanjut",
] as const;

export const MEMO_REMIND =
  "Tugas anda adalah mempelajari, memeringkat dan menyimpan semua kasus-kasus yang ingin anda acu dan pelajari lebih mendalam untuk menentukan posisi anda terhadap kasus yang dihadapi." as const;

export const CASES_INTRO = [
  "Setelah mempelajari fakta klien, ikhtisar pertemuan dengan klien dan memo penugasan, silakan anda pelajari kasus serupa yang terjadi pada perusahaan lain.",
] as const;

export const CASES_LIST = [
  "Tersedia 14 kasus yang dapat anda pelajari.",
  "Deskripsi ringkas setiap kasus telah tersedia untuk anda.",
  "Untuk mempelajari lebih dalam setiap kasus tersebut, anda dapat meng-klik tombol <strong>“DETAIL”</strong>.",
  "Setelah anda melakukannya, informasi lebih lengkap akan tersedia untuk anda.",
] as const;

export const RANK_ORDER =
  "Setelah selesai membaca kasus-kasus, silakan masukkan cacah (angka) peringkat dari <strong>1 sampai 14</strong> berdasarkan pentingnya kasus tersebut bagi anda dan pilih <strong>YA</strong> atau <strong>TIDAK</strong> untuk menentukan apakah informasi tersebut akan anda acu dalam pembuatan rekomendasi. Kolom-kolom tersebut tersedia di sebelah kanan DETAIL." as const;

export const ATTN =
  "Perhatikan juga waktu anda yang masih tersedia sehingga anda dapat memprioritaskan pencarian informasi anda kepada informasi yang menurut anda paling penting terlebih dahulu." as const;

export const CASES_FOOT =
  "Anda dapat membaca kembali memo penugasan dan fakta klien melalui menu Berkas penugasan, jika anda merasa membutuhkannya." as const;

export const REC_INTRO_1 =
  "Berdasarkan kasus perusahaan klien, ikhtisar berita acara pertemuan dengan klien, memo penugasan, dan pertanyaan terkait pengetahuan anda mengenai kasus yang anda terima dan informasi yang telah anda cari, nyatakan <strong>rekomendasi</strong> dalam bentuk usulan besaran biaya untuk akun-akun yang dikonsultasikan tersebut." as const;

export const REC_INTRO_2 =
  "Berdasarkan reviu dari supervisor yang anda terima dan informasi yang telah anda cari, nyatakan <strong>rekomendasi</strong> dalam bentuk usulan besaran biaya untuk akun-akun yang dikonsultasikan tersebut." as const;

export const DEBRIEF = [
  "Saya mengucapkan terima kasih banyak atas waktu yang diberikan untuk kelancaran proses penelitian ini. Penelitian ini adalah penelitian yang dilakukan untuk penyelesaian disertasi saya pada Program Doktor Akuntansi FEB UGM.",
  "Penelitian ini bertujuan untuk menguji pengaruh preferensi klien dan tekanan akuntabilitas terhadap perilaku pencarian informasi dan pembuatan rekomendasi pajak oleh staf. Preferensi klien dapat disampaikan secara implisit maupun eksplisit sedangkan tekanan akuntabilitas berupa tekanan akuntabilitas dari atas yang dibagi menjadi tekanan kuat dan tekanan lemah.",
  "Anda sengaja saya bagi menjadi 4 kelompok perlakuan (<em>treatment</em>) sesuai dengan rancangan penelitian ini. Kelompok perlakuan pertama adalah staf dengan preferensi klien yang disampaikan secara implisit dan tekanan akuntabilitas lemah. Kelompok perlakuan kedua adalah staf dengan preferensi klien yang disampaikan secara eksplisit dan tekanan akuntabilitas lemah. Kelompok perlakuan ketiga adalah staf dengan preferensi klien yang disampaikan secara implisit dan tekanan akuntabilitas kuat sedangkan kelompok terakhir adalah staf dengan preferensi klien yang disampaikan secara eksplisit dan tekanan akuntabilitas kuat.",
  "Saya menguji hipotesis penelitian saya berdasarkan 4 perlakuan yang berbeda tersebut.",
  "Saya sangat menghargai semua bantuan anda pada hari ini. Sekali lagi saya mengucapkan terima kasih yang sebesar-besarnya dan semoga menjadi amal ibadah bagi kita semua.",
] as const;

export const MINUTES_QUESTIONS = [
  {
    key: "ba_q1",
    legend: "Dari diskusi tersebut anda menangkap kesan bahwa (pilih salah satu jawaban):",
    options: [
      "Manajemen klien mengabaikan saran yang anda atau kantor anda berikan",
      "Manajemen klien sangat menghargai saran yang anda atau kantor anda berikan",
      "Mereka akan mencari konsultan lain.",
    ],
  },
  {
    key: "ba_q2",
    legend: "Dari diskusi tersebut anda menangkap kesan bahwa (pilih salah satu jawaban):",
    options: [
      "Keberhasilan menghemat pajak akan mendukung keberhasilan rencana pengembangan usaha klien, yang dapat berarti terbukanya peluang bagi kantor anda untuk tetap menjadi konsultan bagi klien dengan prospek fee yang lebih besar",
      "Keberhasilan menghemat pajak yang akan mendukung keberhasilan rencana pengembangan usaha klien tidak mempunyai implikasi terhadap kerjasama di masa yang datang.",
      "Klien hanya peduli dengan keberhasilan pengembangan usaha mereka",
    ],
  },
] as const;

/** Pertanyaan pengetahuan / kovariat (PLAN-04). Opsi bernomor 1–3, ditampilkan dengan huruf a/b/c. */
export const COV_INTRO = "Berikutnya, anda diminta untuk menjawab pertanyaan-pertanyaan berikut." as const;

export const COV = [
  {
    legend:
      "Ketentuan mengenai <em>deductible</em> dan <em>non-deductible expenses</em> diatur dalam pasal … UU Pajak Penghasilan",
    options: ["Pasal 7 dan 9 UU PPh", "Pasal 6 dan 9 UU PPh", "Pasal 4 dan 5 UU PPh"],
  },
  {
    legend:
      "Biaya <em>know how fee</em> (jasa konsultasi) tidak dapat dibiayakan (<em>non-deductible expense</em>) jika:",
    options: [
      "Terdapat hubungan istimewa",
      "Terdapat hubungan istimewa dan pemberi jasa adalah induk perusahaan",
      "Diberikan oleh siapapun juga",
    ],
  },
  {
    legend: "Biaya <em>entertainment</em> dapat dibiayakan sebesar:",
    options: [
      "Seluruh biaya yang dilaporkan dalam laporan keuangan secara akuntansi",
      "Semua biaya entertainment yang dikeluarkan oleh perusahaan dalam mendukung usaha perusahaan",
      "Semua biaya entertainment yang dilengkapi dengan daftar nominatif",
    ],
  },
  {
    legend:
      "Agar dapat dibiayakan sebagai pengurang penghasilan, biaya perbaikan dan pemeliharaan harus mempertimbangkan:",
    options: ["Aturan kapitalisasi", "Umur manfaat dan tambahan kemampuan aset tetap", "A dan B benar"],
  },
  {
    legend: "Biaya promosi dapat dibiayakan sebesar:",
    options: [
      "Semua biaya pemasaran/promosi yang dilaporkan dalam laporan keuangan secara akuntansi (komersial)",
      "Semua biaya pemasaran/promosi yang dilaporkan dalam laporan keuangan secara akuntansi (komersial) dikurangi dengan sumbangan",
      "Semua biaya pemasaran/promosi yang dilaporkan dalam laporan keuangan secara akuntansi (komersial) dikurangi dengan sumbangan dan biaya lain yang tidak berhubungan secara langsung dengan pemasaran produk (barang/jasa)",
    ],
  },
] as const;

export const CONF_TEXT =
  "Berdasarkan rekomendasi yang anda berikan, nyatakan keyakinan anda bahwa saran yang anda berikan akan dapat dipertahankan jika nanti ditantang atau menjadi temuan pemeriksa dalam skala 0 sampai 100%." as const;

/**
 * Reviu Atasan/Supervisor: PLACEHOLDER until the researcher answers PERTANYAAN A6/Q8
 * (final text, and whether it differs per cell). To vary it per factor, branch on
 * `Factors` in `reviewParas()` (components/participant/steps.tsx).
 */
export const REVIEW_TITLE = "Reviu Atasan/Supervisor" as const;
export const REVIEW_SUBJECT = "PT Cahaya Gama, hasil reviu rekomendasi" as const;
export const REVIEW_BODY = [
  "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer posuere erat a ante venenatis dapibus posuere velit aliquet. Donec ullamcorper nulla non metus auctor fringilla. Vestibulum id ligula porta felis euismod semper.",
  "Maecenas faucibus mollis interdum. Aenean eu leo quam. Pellentesque ornare sem lacinia quam venenatis vestibulum. Nullam quis risus eget urna mollis ornare vel eu leo.",
  "[Isi reviu atasan menunggu materi dari peneliti.]",
] as const;
export const REVIEW_FOOT = "Reviu ini dapat dibuka kembali melalui menu Berkas penugasan." as const;

/** Labels of the accounts on the recommendation page (same wording as the client draft). */
export const REC_LABELS = [
  ["knowhow", "Biaya know how fee"],
  ["entertain", "Biaya entertainment"],
  ["repair", "Biaya perbaikan dan pemeliharaan"],
  ["marketing", "Biaya pemasaran"],
] as const;

export const REC_TEXT = {
  title: "Masukkan besaran biaya berdasarkan saran anda",
  hint: "Isi dengan angka saja; pemisah ribuan dan total dihitung otomatis.",
  foot: "Draft klien dapat dilihat di halaman sebelumnya; berkas lain di menu Berkas penugasan.",
  /** Flow B: the client draft is on the same page. */
  footB: "Berkas lain dapat dibuka di menu Berkas penugasan.",
} as const;

export const CASES_TEXT = {
  title: "Daftar kasus acuan",
  lead: "Klik <strong>DETAIL</strong> untuk membaca informasi lengkap setiap kasus. Isi <strong>peringkat 1–14</strong> berdasarkan pentingnya kasus bagi anda (setiap angka hanya dipakai sekali) dan pilih <strong>Ya</strong> atau <strong>Tidak</strong> untuk menentukan apakah kasus akan anda acu dalam rekomendasi.",
  head: "14 kasus acuan · keterangan ringkas",
  headHint: "Peringkat 1 = paling penting · setiap angka hanya dipakai sekali",
  foot: "Perhatikan sisa waktu anda.",
} as const;

/** Names of the reference files in the menu Berkas penugasan. */
export const REF_LABELS = {
  facts: "Fakta Klien",
  minutes: "Berita Acara",
  memo: "Memo Penugasan",
  review: "Reviu Atasan",
} as const;

/** Flow B (B-12): no letters; "A dan B benar" becomes "Kedua jawaban di atas benar". Same option order and numbering. */
export const COV_B = COV.map((q) => ({
  legend: q.legend,
  options: q.options.map((o) => (o === "A dan B benar" ? "Kedua jawaban di atas benar" : o)),
}));

/** Flow B: closed documents ("berkas masuk") and the instruction sections. */
export const ENVELOPE = {
  kick: "Berkas masuk",
  memo: { title: "Memo Penugasan", subject: "PT Cahaya Gama, rekonsiliasi fiskal", button: "Buka memo" },
  review: {
    title: "Reviu Atasan/Supervisor",
    subject: "PT Cahaya Gama, hasil reviu rekomendasi",
    intro: "Anda menerima dokumen reviu dari atasan anda.",
    button: "Buka reviu",
  },
} as const;

export const INSTRUCTION_TITLES = [
  "Peran dan tugas anda",
  "Aturan penugasan",
  "Informasi kasus acuan",
] as const;

/** Flow B file map (B-10). */
export const FILE_MAP = {
  label: "Map berkas",
  ariaLabel: "Map berkas penugasan",
  states: { done: "Sudah dibaca", now: "Sedang dibaca", todo: "Belum diterima" },
} as const;

/** Kuesioner, cek manipulasi dan demografi (PLAN-06). */
export const MC_INTRO =
  "Jawablah pertanyaan-pertanyaan berikut berdasarkan pengalaman yang anda alami selama melaksanakan penugasan." as const;
export const LIKERT_INTRO =
  "Jawablah pertanyaan-pertanyaan berikut berdasarkan pengalaman yang anda alami selama melaksanakan penugasan pada rentang <strong>1 (sangat tidak setuju)</strong> sampai dengan <strong>5 (sangat setuju)</strong>." as const;
export const QUEST_PARTS = {
  mcq: "Bagian A · Pilihan ganda",
  likert: "Bagian B · Skala 1–5",
} as const;
export const DEMO_TEXT = {
  title: "Data demografi",
  semester: { label: "Semester", placeholder: "mis. 5" },
  gender: "Jenis kelamin",
  age: { label: "Umur", unit: "tahun" },
  education: "Tingkat pendidikan",
  incentive: "Insentif e-wallet*",
  ewallet: "Jenis e-wallet",
  ewalletPlaceholder: "Pilih e-wallet",
  phone: "No. HP",
  phonePlaceholder: "812 3456 7890",
  note: "*Untuk tujuan pengisian insentif e-wallet sebagai partisipan. Nomor disimpan terpisah dari jawaban penelitian anda.",
} as const;
