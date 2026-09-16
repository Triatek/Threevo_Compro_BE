# Threevo Compro — Backend

REST API untuk website company profile Threevo (jasa fulfillment & logistik).
Berfungsi sebagai **CMS + penangkap lead + proxy tracking** untuk frontend React.

Stack: Node.js 22 · Express 5 · PostgreSQL · Prisma 6 · Zod 4 · pino · Vitest.

- Spesifikasi: [`docs/BACKEND_SPEC.md`](docs/BACKEND_SPEC.md)
- Dokumentasi API: [`docs/openapi.yaml`](docs/openapi.yaml) · Swagger UI di **http://localhost:4000/docs**
- Deployment: [`docs/DEPLOYMENT.md`](docs/DEPLOYMENT.md)

## Daftar isi

1. [Setup lokal](#setup-lokal)
2. [Script](#script)
3. [Environment variable](#environment-variable)
4. [Struktur](#struktur)
5. [Konvensi](#konvensi)
6. [Panduan untuk frontend](#panduan-untuk-frontend)
7. [Endpoint](#endpoint)
8. [Catatan teknis](#catatan-teknis)

## Setup lokal

### 1. Install dependency
```powershell
npm install
```

### 2. Siapkan PostgreSQL
Pilih salah satu:

**A. PostgreSQL terpasang di komputer** (tanpa Docker)
Pastikan service PostgreSQL berjalan. Database `threevo_db` dibuat otomatis oleh
`npm run db:migrate`, dan `threevo_test` dibuat otomatis saat `npm test`
(user database perlu hak `CREATEDB`; user `postgres` sudah punya).

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
Isi `DATABASE_URL` di kedua file dan `JWT_ACCESS_SECRET` (min. 32 karakter):
```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
- Di `.env.test`, nama database **harus** mengandung `test`, karena semua tabelnya
  dikosongkan saat test (test menolak jalan jika tidak).
- Jika password database berisi karakter khusus (`@ # / : ? %`), encode dulu, mis. `@` → `%40`.

### 4. Migration, seed, jalankan
```powershell
npm run db:migrate   # buat tabel (pada database baru otomatis menjalankan seed)
npm run db:seed      # isi data awal (aman dijalankan berulang)
npm run dev
```
Cek: `curl.exe http://localhost:4000/api/v1/health`

Seeder membuat super admin dari `SEED_ADMIN_EMAIL`. Jika `SEED_ADMIN_PASSWORD` kosong,
password acak dicetak ke console **sekali** saat admin pertama kali dibuat.

### 5. Coba login dari terminal
```powershell
curl.exe -c cookies.txt -H "Content-Type: application/json" `
  -d '{\"email\":\"admin@threevo.local\",\"password\":\"PASSWORD_ANDA\"}' `
  http://localhost:4000/api/v1/auth/login
curl.exe -b cookies.txt http://localhost:4000/api/v1/admin/dashboard
```

## Script

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Server development (nodemon, log berwarna) |
| `npm start` | Server tanpa auto-reload |
| `npm run start:prod` | `prisma migrate deploy` lalu start (production) |
| `npm test` / `npm run test:watch` | Vitest (otomatis `prisma migrate deploy` ke database test) |
| `npm run db:migrate` | `prisma migrate dev` — buat & terapkan migration baru |
| `npm run db:deploy` | `prisma migrate deploy` — terapkan migration (production/CI) |
| `npm run db:generate` | Generate Prisma Client |
| `npm run db:seed` | Isi data awal |
| `npm run db:studio` | GUI database |
| `npm run db:reset` | ⚠️ Hapus semua data & ulang migration |

## Environment variable

Semua variabel divalidasi di `src/config/env.js` saat start; server berhenti dengan pesan
jelas jika ada yang salah. Nilai kosong dianggap tidak diisi. Contoh lengkap: `.env.example`.

| Variabel | Default | Keterangan |
|---|---|---|
| `NODE_ENV` | development | development / test / production |
| `PORT` | 4000 | |
| `API_PREFIX` | /api/v1 | |
| `SITE_URL` | http://localhost:5173 | URL frontend (sitemap, link di email) |
| `API_URL` | http://localhost:4000 | URL publik API (membentuk URL file upload) |
| `CORS_ORIGINS` | http://localhost:5173 | Origin frontend, pisahkan dengan koma |
| `TRUST_PROXY` | 0 | `1` jika di belakang Nginx/Cloudflare (agar IP klien benar) |
| `LOG_LEVEL` | info | fatal/error/warn/info/debug/trace/silent |
| `DATABASE_URL` | **wajib** | |
| `JWT_ACCESS_SECRET` | **wajib** | min. 32 karakter |
| `JWT_ACCESS_EXPIRES_IN` | 15m | |
| `REFRESH_TOKEN_EXPIRES_DAYS` | 7 | |
| `COOKIE_DOMAIN` | – | isi jika FE & API beda subdomain, mis. `.threevo.id` |
| `COOKIE_SECURE` | false (true di production) | |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | – | kosong = email hanya di-log |
| `MAIL_FROM` | Threevo &lt;no-reply@example.com&gt; | |
| `LEAD_NOTIFICATION_EMAIL` | – | fallback jika setting `lead_notification_email` kosong |
| `TURNSTILE_SECRET_KEY` | – | kosong = CAPTCHA dilewati |
| `UPLOAD_DIR` | uploads | |
| `UPLOAD_MAX_SIZE_MB` | 5 | |
| `TRACKING_PROVIDER` | mock | `mock` / `http` |
| `TRACKING_API_URL`, `TRACKING_API_KEY` | – | wajib (URL) jika provider `http` |
| `TRACKING_TIMEOUT_MS` | 8000 | |
| `CACHE_TTL_SECONDS` | 300 | cache endpoint publik |
| `ENABLE_DOCS` | true (false di production) | Swagger UI di `/docs` |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | | seeder |

## Struktur

```
prisma/            schema.prisma, migrations/, seed.js
src/
  config/          env.js (validasi env), zod.js (locale Indonesia)
  lib/             prisma, logger, cache, audit, password, mailer, captcha,
                   storage, sanitize, uniqueSlug, crud (factory konten sortable), apiDocs
  middlewares/     auth, validate, rateLimiter, upload, cacheControl, notFound, errorHandler
  modules/<fitur>/ <fitur>.routes.js · controller · service · schema
    auth, users, auditLogs, settings, site, banners, clients, testimonials,
    services, locations, categories, articles, media, leads, dashboard, tracking, seo, health
  routes/index.js  pendaftaran route publik, auth, admin
  utils/           AppError, response, pagination, slug, commonSchemas, csv, date, escapeHtml
  app.js           merakit Express (tanpa listen)
  server.js        koneksi DB, listen, graceful shutdown
tests/             Vitest + Supertest (satu file per modul)
docs/              BACKEND_SPEC.md, openapi.yaml, DEPLOYMENT.md
```

## Konvensi

- **Controller** hanya urusan HTTP; logika & Prisma ada di **service**. Controller membuat
  `actor` (`actorFromRequest(req)`) untuk audit log, jadi service tidak mengenal `req`.
- Error dilempar dengan kelas di `utils/AppError.js`; `errorHandler` membentuk respons.
- Input divalidasi dengan `validate({ body, query, params })`; hasil dibaca dari
  `req.validated` (field tak dikenal dibuang).
- Format respons:
  - Sukses: `{ "success": true, "message"?, "data", "meta"? }`
  - Error: `{ "success": false, "error": { "code", "message", "details"? } }`
- Pemetaan error: ZodError → 422, Prisma P2002 → 409, P2025 → 404, P2003 → 400,
  JSON rusak → 400, payload > 1 MB / file terlalu besar → 413, lainnya → 500
  (pesan asli hanya tampil di development).
- DB snake_case (`@map`), kode camelCase.
- Setiap create/update/delete admin menulis audit log dan menginvalidasi cache publik terkait.
- Setiap response membawa header `X-Request-Id` (dipakai juga di log).
- Commit memakai Conventional Commits.

## Panduan untuk frontend

### Alur autentikasi (cookie httpOnly)
Token **tidak** dikirim di body dan tidak bisa dibaca JavaScript. Frontend cukup:

1. Kirim semua request API dengan kredensial:
   ```js
   fetch(`${API}/auth/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) });
   // axios: axios.create({ baseURL: API, withCredentials: true })
   ```
2. Saat app dimuat, panggil `GET /auth/me` untuk tahu apakah user masih login.
3. Jika request admin mendapat **401**, panggil `POST /auth/refresh` **sekali**, lalu ulangi
   request awal. Jika refresh juga 401 → arahkan ke halaman login.
   Pastikan beberapa request yang gagal bersamaan hanya memicu **satu** refresh (antrekan),
   karena refresh token lama langsung dicabut dan memakainya lagi dianggap pencurian
   (semua sesi user dicabut).
4. Logout: `POST /auth/logout`.

Access token berlaku 15 menit, refresh token 7 hari. Cookie `refresh_token` hanya dikirim
browser ke path `/api/v1/auth`.

**Domain:** di production FE dan API sebaiknya satu domain induk (mis. `threevo.id` dan
`api.threevo.id`) dengan `COOKIE_DOMAIN=.threevo.id`, `COOKIE_SECURE=true`, dan
`CORS_ORIGINS=https://threevo.id`. Cookie memakai `SameSite=Lax`.

### Hal lain
- **Gambar**: unggah lewat `POST /admin/media` (multipart `file`), lalu pakai `data.url`
  di field `image`, `logo`, `photo`, `coverImage`.
- **Form kontak**: sembunyikan input `website` (honeypot) dan biarkan kosong. Jika CAPTCHA
  diaktifkan, kirim token Turnstile di `captchaToken`. Tambahkan `?utm_source=` jika ada.
- **Route FE untuk sitemap** didefinisikan di `src/modules/seo/seo.service.js`
  (`/layanan/:slug`, `/berita/:slug`, dll.). Sesuaikan jika route React berbeda.
- **WhatsApp**: `GET /site` → `settings.whatsapp_number` & `settings.whatsapp_message`
  → `https://wa.me/${number}?text=${encodeURIComponent(message)}`.
- **Tanggal** dikirim dalam ISO 8601 UTC; filter tanggal lead (`from`, `to`) memakai WIB.

## Endpoint

Detail lengkap (skema request/response) ada di Swagger UI `/docs`.

### Publik
| Method | Path | Keterangan |
|---|---|---|
| GET | `/api/v1/health` | Status server + cek database (503 jika DB mati) |
| GET | `/api/v1/site` | Settings publik, banner, klien, testimoni aktif, layanan featured |
| GET | `/api/v1/services`, `/api/v1/services/:slug` | Layanan aktif |
| GET | `/api/v1/locations?city=&type=` | Lokasi aktif untuk peta |
| GET | `/api/v1/categories` | Kategori + jumlah artikel published |
| GET | `/api/v1/articles?page=&limit=&category=&q=` | Artikel published |
| GET | `/api/v1/articles/:slug` | Detail + 3 artikel terkait (menambah viewCount) |
| POST | `/api/v1/leads` | Form Contact Us (rate limit 5/15 menit) |
| GET | `/api/v1/tracking/:awb` | Cek resi (mock: resi berawalan `TEST`) |
| GET | `/sitemap.xml`, `/robots.txt` | SEO |
| GET | `/uploads/...` | File upload (cache 1 tahun) |
| GET | `/docs` | Swagger UI (nonaktif di production kecuali `ENABLE_DOCS=true`) |

### Auth
| Method | Path | Keterangan |
|---|---|---|
| POST | `/api/v1/auth/login` | Login (rate limit 10/15 menit) |
| POST | `/api/v1/auth/refresh` | Rotasi refresh token |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Profil user login |
| PATCH | `/api/v1/auth/me/password` | Ganti password sendiri |

### Admin (login wajib, prefix `/api/v1`)
| Resource | Endpoint | Role |
|---|---|---|
| Dashboard | `GET /admin/dashboard` | semua |
| Artikel | CRUD `/admin/articles` + `PATCH /:id/publish`, `/:id/unpublish` | semua |
| Kategori | CRUD `/admin/categories` | semua |
| Layanan | CRUD `/admin/services` + `PATCH /reorder` | semua |
| Lokasi | CRUD `/admin/locations` + `PATCH /reorder` | semua |
| Banner / Klien / Testimoni | CRUD `/admin/banners`, `/clients`, `/testimonials` + `PATCH /reorder` | semua |
| Media | `GET`, `POST`, `DELETE /admin/media` | semua |
| Lead | `GET /admin/leads`, `GET /export`, `GET/PATCH /:id` | semua |
| Lead (hapus) | `DELETE /admin/leads/:id` | SUPER_ADMIN |
| Settings | `GET`, `PUT /admin/settings` | SUPER_ADMIN |
| User | CRUD `/admin/users` (DELETE = nonaktifkan) | SUPER_ADMIN |
| Audit log | `GET /admin/audit-logs` | SUPER_ADMIN |

## Catatan teknis

- **Cache** endpoint publik disimpan di memori proses (`src/lib/cache.js`). Jika API dijalankan
  **lebih dari satu instance** (PM2 cluster / beberapa container), ganti ke **Redis**
  agar invalidasi berlaku di semua instance.
- **Rate limit** juga disimpan di memori per proses; alasan yang sama berlaku.
- **Tracking**: format API TMS belum diketahui. Sesuaikan fungsi `normalize()` dan
  `STATUS_MAP` di `src/modules/tracking/providers/http.js` (ditandai `TODO(TMS)`).
- **Artikel terjadwal**: status `PUBLISHED` dengan `publishedAt` di masa depan baru tampil
  di publik setelah waktunya tiba (maks. terlambat sebesar `CACHE_TTL_SECONDS`).
- **Upload** disimpan di disk lokal (`UPLOAD_DIR`). `src/lib/storage.js` bisa diganti driver
  S3/Cloudinary tanpa mengubah modul lain. URL yang tersimpan memakai `API_URL`.
- **Email** tanpa SMTP hanya di-log (cek log `SMTP not configured`).
