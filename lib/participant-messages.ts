/** Participant-facing messages (FSD-Participant §14). Bahasa Indonesia, as in the PPT. */
export const P_MESSAGES = {
  invalidFormat: "Format kode tidak sesuai. Contoh: TX-7KQ2-M9PA.",
  codeNotFound: "Kode akses tidak dikenali. Periksa kembali kode pada kartu anda.",
  rateLimited: "Terlalu banyak percobaan. Tunggu 15 menit atau minta bantuan pengawas.",
  codeCancelled: "Kode ini sudah tidak berlaku. Hubungi pengawas untuk mendapatkan kode baru.",
  codeCompleted: "Kode ini sudah selesai dipakai. Terima kasih atas partisipasi anda.",
  codeClosed: "Sesi untuk kode ini sudah ditutup. Hubungi pengawas.",
  consentRequired: "Silakan baca dan setujui lembar persetujuan terlebih dahulu.",
  unauthenticated: "Sesi anda telah berakhir. Silakan masuk kembali dengan kode akses anda.",
  sessionReplaced: "Sesi ini sedang dibuka di perangkat atau tab lain.",
  stalePage: "Halaman sudah berganti. Memuat halaman terbaru…",
  invalidItem: "Isian tidak valid.",
  notAtFinish: "Halaman penutup belum tercapai.",
  docNotOpened: "Buka dokumennya terlebih dahulu sebelum melanjutkan.",
  network: "Tidak bisa terhubung. Periksa koneksi lalu coba lagi.",
  saving: "Belum tersimpan, mencoba lagi…",
  server: "Terjadi kesalahan di server. Coba lagi sebentar lagi.",
} as const;
