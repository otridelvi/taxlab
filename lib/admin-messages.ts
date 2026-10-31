/** Admin UI messages (FSD-Admin §11). UI copy stays in Indonesian. */
export const ADMIN_MESSAGES = {
  forbidden: "Anda tidak memiliki izin untuk tindakan ini.",
  unauthenticated: "Sesi berakhir, silakan masuk kembali.",
  invalidInput: "Data yang dikirim tidak valid.",
  cellLocked: "Sel tidak bisa diubah karena partisipan sudah mulai mengerjakan.",
  sameCell: "Partisipan sudah berada di sel tersebut.",
  notDeactivatable: "Kode hanya bisa dinonaktifkan selama statusnya Belum mulai.",
  notResettable: "Sesi hanya bisa direset selama partisipan Sedang mengerjakan atau Waktu habis. Partisipan yang sudah selesai tidak boleh direset.",
  codeMismatch: "Kode yang diketik tidak sama dengan kode partisipan.",
  invalidTarget: "Target harus berupa bilangan bulat 1–500.",
  confirmDelete: "Ketik HAPUS untuk mengonfirmasi.",
  notFound: "Data tidak ditemukan.",
  generateFailed: "Gagal membuat kode. Tidak ada kode yang tersimpan. Coba lagi.",
  unexpected: "Terjadi kesalahan. Coba lagi beberapa saat lagi.",
} as const;
