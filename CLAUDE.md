# CLAUDE.md — Threevo Compro Backend

REST API untuk website company profile perusahaan jasa **fulfillment & logistik**
(referensi bisnis: ethix.id). Frontend React (Vite) dikerjakan di repo terpisah dan
memanggil API ini. Backend berfungsi sebagai **CMS + penangkap lead + proxy tracking**.

Spesifikasi lengkap, skema database, daftar endpoint, dan urutan pengerjaan ada di
**`docs/BACKEND_SPEC.md`**. Baca file itu sebelum mulai bekerja.

## Komunikasi

- Gunakan **Bahasa Indonesia** saat berkomunikasi dengan saya. Kode, nama variabel,
  dan pesan commit dalam bahasa Inggris; pesan error untuk client dalam Bahasa Indonesia.
- Saya sedang belajar backend. Di akhir setiap fase, beri ringkasan singkat: apa yang
  dibuat, keputusan penting beserta alasannya, dan cara saya mengujinya sendiri.
- Tanyakan dulu sebelum: menghapus data/database, `prisma migrate reset`, force push,
  menambah dependency di luar daftar di spec, atau mengubah keputusan teknis di bawah.

## Lingkungan

- OS: **Windows**, shell **PowerShell**. Gunakan perintah yang kompatibel
  (`curl.exe`, bukan `curl`; path dengan `\` saat menjalankan perintah shell).
- Node.js 22. Repo Git: `Triatek/Threevo_Compro_BE` (SSH).
- PostgreSQL dijalankan lewat `docker compose up -d` (lihat spec). Jika Docker tidak
  tersedia, tanyakan ke saya.

## Keputusan teknis (jangan diubah tanpa persetujuan)

| Hal | Pilihan |
|---|---|
| Bahasa | **JavaScript** (ES Modules, `"type": "module"`), bukan TypeScript |
| Framework | **Express 5** (error dari fungsi async otomatis diteruskan; tanpa asyncHandler) |
| Database | **PostgreSQL** |
| ORM | **Prisma 6** (`prisma@^6`, `@prisma/client@^6`, generator `prisma-client-js`). Jangan pakai Prisma 7 |
| Validasi | **Zod 4**, pesan diset ke locale Indonesia (`z.config(z.locales.id())`) |
| Logging | **pino** + **pino-http** (pino-pretty hanya di development) |
| Auth | Access token JWT (15 menit) + refresh token (7 hari, di-hash di DB, dirotasi), keduanya di **cookie httpOnly** |
| Password | **bcryptjs** (cost 12) |
| Dev server | **nodemon** (sudah terpasang) |
| Test | **Vitest** + **Supertest** |

## Struktur & pola kode

```
src/
  config/        env.js (validasi env dengan Zod, fail fast), zod.js
  lib/           prisma.js, logger.js, mailer.js, storage.js, cache.js
  middlewares/   auth.js, validate.js, rateLimiter.js, upload.js, notFound.js, errorHandler.js
  modules/<fitur>/
    <fitur>.routes.js      definisi route + middleware
    <fitur>.controller.js  urusan HTTP saja (baca req.validated, panggil service, kirim respons)
    <fitur>.service.js     logika bisnis + akses Prisma
    <fitur>.schema.js      skema Zod
  routes/index.js          pusat pendaftaran route (publik & admin)
  utils/                   AppError.js, response.js, slug.js, pagination.js
  app.js                   merakit Express (tanpa listen)
  server.js                titik masuk: koneksi DB, listen, graceful shutdown
```

Aturan:
- `server.js` tetap menjadi `main` dan titik masuk. `app.js` hanya export app.
- Controller **tidak** memanggil Prisma langsung; lewat service.
- Error dilempar dengan kelas dari `utils/AppError.js` (`NotFoundError`, `ValidationError`,
  `UnauthorizedError`, `ForbiddenError`, `ConflictError`, `BadRequestError`,
  `TooManyRequestsError`). Jangan try/catch hanya untuk mengirim respons error.
- Hasil validasi disimpan di `req.validated.{body,query,params}` karena `req.query`
  read-only di Express 5. Controller membaca dari `req.validated`.
- Semua respons memakai format standar:
  - Sukses: `{ "success": true, "message"?: string, "data": ..., "meta"?: {...} }`
  - Error: `{ "success": false, "error": { "code": "...", "message": "...", "details"?: [...] } }`
- `errorHandler` memetakan error Prisma (P2002→409, P2025→404, P2003→400), ZodError→422,
  JSON rusak→400, payload besar→413; error tak terduga→500 tanpa membocorkan detail di production.
- Semua konfigurasi dari env lewat `src/config/env.js`, jangan akses `process.env` di tempat lain.
- Nama tabel/kolom di DB snake_case (`@@map`/`@map`), nama field di kode camelCase.
- Endpoint publik **hanya** mengembalikan data aktif/published dan tidak pernah
  mengembalikan field sensitif (`passwordHash`, `ipAddress`, dll.).

## Keadaan repo saat ini

Sudah ada: `package.json` (ESM, deps: express 5, cors, helmet, dotenv, zod, nodemailer,
express-rate-limit; dev: nodemon), `.gitignore`, `src/server.js`, `src/app.js`,
`src/routes/index.js` (GET /health), `src/middlewares/notFound.js`,
`src/middlewares/errorHandler.js` (versi sederhana, selalu 500).
Kode ini boleh diperluas/direfaktor mengikuti spec. Periksa dulu isinya sebelum mengubah.

## Alur kerja

1. Kerjakan fase **berurutan** sesuai `docs/BACKEND_SPEC.md`. Satu fase selesai
   sebelum lanjut.
2. Setiap fase selesai jika: kriteria penerimaan terpenuhi, `npm test` lulus,
   dan server berjalan (`npm run dev`) tanpa error.
3. Commit per fase dengan Conventional Commits, contoh:
   `feat(auth): add login with httpOnly cookie`. Jangan pernah commit `.env`.
4. Perbarui `README.md` dan `docs/openapi.yaml` setiap menambah endpoint.
5. Tandai progres di bagian "Checklist Progres" pada `docs/BACKEND_SPEC.md`.

## Perintah

```powershell
npm run dev          # server development (nodemon)
npm test             # vitest
npm run db:migrate   # prisma migrate dev
npm run db:seed      # isi data awal
npm run db:studio    # GUI database
docker compose up -d # PostgreSQL lokal
```
