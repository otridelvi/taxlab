# Taxlab

Web eksperimen penelitian (studi penyelesaian SPT Tahunan) — web partisipan + panel admin peneliti.

**Stack:** Next.js 16 (App Router, TypeScript) · Supabase (Postgres + Auth) · Vercel

## Prasyarat

- Node.js ≥ 22 (lihat `.nvmrc`; supabase-js membutuhkan WebSocket bawaan Node 22)
- Supabase CLI (sudah termasuk sebagai dev dependency → dipanggil lewat `npx supabase …`)
- Project Supabase: `taxlab-sit` (dan nanti `taxlab-prod`)

## Setup lokal

```bash
npm install
cp .env.example .env.local      # lalu isi nilainya (lihat komentar di file)
```

### Database

```bash
npx supabase login                                  # sekali saja
npx supabase link --project-ref <project-ref>       # minta database password
npm run db:push                                     # jalankan migrasi di supabase/migrations
npm run db:check                                    # cek koneksi → "ok · … · cells=4"
npm run db:types                                    # (opsional) generate ulang lib/db/types.ts dari database
```

### Membuat akun admin

```bash
npm run admin:create -- peneliti@contoh.com "Admin Peneliti" admin
```

Role: `admin` | `assistant` | `viewer`. Script menampilkan **password sementara** satu kali.

### Menjalankan

```bash
npm run dev          # http://localhost:3000/admin
```

## Perintah lain

| Perintah            | Fungsi                                  |
| ------------------- | --------------------------------------- |
| `npm run lint`      | ESLint                                  |
| `npm run typecheck` | Generate route types + TypeScript check |
| `npm test`          | Unit test (node:test via tsx)           |
| `npm run format`    | Prettier                                |
| `npm run build`     | Production build                        |
| `npm run test:e2e`  | E2E Playwright terhadap SIT             |

## Struktur

```
app/admin/login/        Halaman login admin (A1) + server action
app/admin/(panel)/      Layout panel + Dasbor (A2), Partisipan (A3), Generate (A4), halaman lain
app/admin/print/        Kartu kode akses untuk dicetak (A4, 21 per halaman)
app/admin/logout/       POST logout
app/api/admin/          Route handler admin (generate, unduh kode, ubah sel, nonaktifkan)
components/admin/       Header, menu, ikon
lib/auth/               Peran & izin, pengguna saat ini, rate limit, redirect
lib/access-code.ts      Pembuatan & normalisasi kode akses TX-XXXX-XXXX
lib/allocate.ts         Alokasi sel (acak berimbang / manual) + pratinjau
lib/db/                 Akses data (Supabase service role) + types
lib/session.ts          Cookie sesi admin (batas 12 jam)
proxy.ts                Proteksi /admin/* (Next.js 16: pengganti middleware)
styles/tokens.css       Warna, font, jarak (tema B "Grafit")
supabase/migrations/    Migrasi SQL
scripts/                create-admin, db-check
tests/unit/             Unit test
tests/e2e/              Playwright (khusus SIT)
```

## Lingkungan

|            | Branch | Supabase    | `APP_ENV`    |
| ---------- | ------ | ----------- | ------------ |
| SIT        | `sit`  | taxlab-sit  | `sit`        |
| Production | `main` | taxlab-prod | `production` |

Dokumen perencanaan (PRD, FSD, plan) ada di folder `planning/` (tidak di-commit).
