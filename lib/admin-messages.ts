/** Admin UI messages (FSD-Admin §11). UI copy stays in Indonesian. */
export const ADMIN_MESSAGES = {
  forbidden: "Anda tidak memiliki izin untuk tindakan ini.",
  unauthenticated: "Sesi berakhir, silakan masuk kembali.",
  invalidInput: "Data yang dikirim tidak valid.",
  cellLocked: "Sel tidak bisa diubah karena partisipan sudah mulai mengerjakan.",
  sameCell: "Partisipan sudah berada di sel tersebut.",
  notDeactivatable: "Kode hanya bisa dinonaktifkan selama statusnya Belum mulai.",
  notFound: "Data tidak ditemukan.",
  generateFailed: "Gagal membuat kode. Tidak ada kode yang tersimpan. Coba lagi.",
  unexpected: "Terjadi kesalahan. Coba lagi beberapa saat lagi.",
} as const;
