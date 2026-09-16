# Threevo Compro — Backend

REST API untuk website company profile Threevo (jasa fulfillment & logistik).
Berfungsi sebagai **CMS + penangkap lead + proxy tracking** untuk frontend React.

Stack: Node.js 22 · Express 5 · PostgreSQL · Prisma 6 · Zod 4 · pino · Vitest.

Spesifikasi lengkap: [`docs/BACKEND_SPEC.md`](docs/BACKEND_SPEC.md) ·
Dokumentasi API: [`docs/openapi.yaml`](docs/openapi.yaml)

## Setup lokal

### 1. Install dependency
```powershell
npm install
```

### 2. Siapkan PostgreSQL
Pilih salah satu:

**A. PostgreSQL terpasang di komputer** (tanpa Docker)
Cukup pastikan service PostgreSQL berjalan. Database `threevo_db` dibuat otomatis
oleh `npm run db:migrate`, dan `threevo_test` dibuat otomatis saat `npm test`
(user database harus punya hak `CREATEDB`, user `postgres` sudah punya).

**B. Docker**
```powershell
docker compose up -d
```
Membuat `threevo_db` dan `threevo_test` (user `threevo` / `threevo_secret`).
Hentikan PostgreSQL lokal dulu jika port 5432 sudah terpakai.

### 3. Environment
```powershell
Copy-Item .env.example .env
Copy-Item .env.test.example .env.test
```
Isi `DATABASE_URL` di kedua file (di `.env.test` nama database harus mengandung `test`,
karena tabelnya dikosongkan setiap test) dan `JWT_ACCESS_SECRET` (min. 32 karakter):
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Jika password database berisi karakter khusus (`@ # / : ? %`), encode dulu, mis. `@` → `%40`.

### 4. Migration, seed, jalankan
```powershell
npm run db:migrate   # buat tabel (+ otomatis menjalankan seed pada database baru)
npm run db:seed      # isi data awal (aman dijalankan berulang)
npm run dev
```
Cek: `curl.exe http://localhost:4000/api/v1/health`

Seeder membuat super admin dari `SEED_ADMIN_EMAIL`. Jika `SEED_ADMIN_PASSWORD` kosong,
password acak dicetak ke console **sekali** saat admin pertama kali dibuat.

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server development (nodemon, log berwarna) |
| `npm start` | Server tanpa auto-reload |
| `npm test` / `npm run test:watch` | Vitest (menjalankan `prisma migrate deploy` ke database test lebih dulu) |
| `npm run db:migrate` | `prisma migrate dev` — buat & terapkan migration baru |
| `npm run db:deploy` | `prisma migrate deploy` — terapkan migration (production/CI) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:seed` | Isi data awal |
| `npm run db:studio` | GUI database |
| `npm run db:reset` | ⚠️ Hapus semua data & ulang migration |

## Environment variable

Lihat `.env.example` untuk daftar lengkap beserta keterangannya. Semua variabel
divalidasi di `src/config/env.js` saat start; server berhenti dengan pesan jelas jika
ada yang salah. Nilai kosong dianggap tidak diisi.

## Struktur

```
prisma/          schema.prisma, migrations/, seed.js
src/
  config/        env.js (validasi env), zod.js (locale Indonesia)
  lib/           prisma.js, logger.js
  middlewares/   validate.js, rateLimiter.js, notFound.js, errorHandler.js
  modules/<fitur>/  <fitur>.routes.js · controller · service · schema
  routes/index.js   pendaftaran semua route
  utils/         AppError.js, response.js, slug.js, pagination.js
  app.js         merakit Express (tanpa listen)
  server.js      koneksi DB, listen, graceful shutdown
tests/           Vitest + Supertest
docs/            BACKEND_SPEC.md, openapi.yaml
```

## Konvensi

- **Controller** hanya urusan HTTP; logika & Prisma ada di **service**.
- Error dilempar dengan kelas di `utils/AppError.js`; `errorHandler` membentuk respons.
- Input divalidasi dengan middleware `validate({ body, query, params })`;
  hasilnya dibaca dari `req.validated` (field tak dikenal dibuang).
- Format respons:
  - Sukses: `{ "success": true, "message"?, "data", "meta"? }`
  - Error: `{ "success": false, "error": { "code", "message", "details"? } }`
- Pemetaan error: ZodError → 422, Prisma P2002 → 409, P2025 → 404, P2003 → 400,
  JSON rusak → 400, payload > 1 MB → 413, lainnya → 500 (detail hanya tampil di development).
- DB snake_case (`@map`), kode camelCase.
- Setiap response membawa header `X-Request-Id` (dipakai juga di log).

## Endpoint

| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/health` | Status server + cek database (503 jika database mati) |
| POST | `/api/v1/auth/login` | Login, set cookie `access_token` & `refresh_token` |
| POST | `/api/v1/auth/refresh` | Rotasi refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Profil user login |
| PATCH | `/api/v1/auth/me/password` | Ganti password sendiri |
| CRUD | `/api/v1/admin/users` | Kelola user (SUPER_ADMIN); DELETE = nonaktifkan |
| GET | `/api/v1/admin/audit-logs` | Audit log (SUPER_ADMIN) |

Endpoint lain ditambahkan per fase (lihat checklist di spec).
