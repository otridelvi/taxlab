/** User-facing messages (FSD-Admin §11). UI copy stays in Indonesian. */
export const AUTH_MESSAGES = {
  invalidInput: "Masukkan email dan password yang valid.",
  invalidCredentials: "Email atau password salah.",
  notAdmin: "Akun ini tidak memiliki akses admin.",
  rateLimited: "Terlalu banyak percobaan. Coba lagi dalam 15 menit.",
  sessionExpired: "Sesi berakhir, silakan masuk kembali.",
  forbidden: "Anda tidak memiliki izin untuk tindakan ini.",
  unexpected: "Terjadi kesalahan. Coba lagi beberapa saat lagi.",
} as const;
