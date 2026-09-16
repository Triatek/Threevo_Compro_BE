# Spesifikasi Backend — Threevo Compro

Dokumen ini adalah sumber kebenaran untuk pengerjaan backend. Aturan kerja dan
keputusan teknis ada di `CLAUDE.md`.

---

## 1. Ringkasan kebutuhan

### Pengunjung (publik)
- Halaman Home: banner/hero, layanan unggulan, klien/partner, testimoni, info kontak.
- Layanan: daftar + detail (contoh: Warehouse Management System, Transport Management System, Fulfillment).
- Lokasi: daftar gudang/kantor/hub dengan koordinat untuk peta, filter kota & tipe.
- Berita: daftar (pagination, filter kategori, pencarian) + detail berdasarkan slug.
- Form Contact Us → tersimpan sebagai lead + notifikasi email ke tim marketing.
- Cek resi (tracking) → backend menjadi proxy ke sistem TMS eksternal.
- Data untuk tombol WhatsApp (nomor + pesan template) dari settings.

### Admin (butuh login)
- Login/logout, profil sendiri, ganti password.
- CRUD: artikel, kategori, layanan, lokasi, banner, klien, testimoni.
- Upload gambar (dikompres ke WebP).
- Kelola settings situs (kontak, sosmed, WhatsApp, URL tracking).
- Lihat, ubah status, beri catatan, dan ekspor CSV lead.
- Kelola user admin (khusus SUPER_ADMIN).
- Audit log untuk aksi penting.

### Non-fungsional
- SEO: slug unik, meta title/description, `sitemap.xml`, `robots.txt`.
- Read-heavy: cache endpoint publik, invalidasi saat admin mengubah data.
- Keamanan: helmet, CORS whitelist, rate limit, cookie httpOnly, sanitasi HTML,
  validasi semua input, upload terbatas, tanpa kebocoran detail error.
- Operasional: health check, log terstruktur, graceful shutdown, siap Docker.

### Role
| Aksi | SUPER_ADMIN | EDITOR |
|---|:-:|:-:|
| Konten (artikel, kategori, layanan, lokasi, banner, klien, testimoni, media) | ✅ | ✅ |
| Lead (lihat, ubah status, ekspor) | ✅ | ✅ |
| Hapus lead | ✅ | ❌ |
| Settings | ✅ | ❌ |
| Kelola user | ✅ | ❌ |
| Lihat audit log | ✅ | ❌ |

---

## 2. Dependency

Sudah terpasang: `express@5`, `cors`, `helmet`, `dotenv`, `zod@4`, `nodemailer`,
`express-rate-limit`, dev: `nodemon`.

Tambahkan:
```powershell
npm install @prisma/client@6 pino pino-http compression cookie-parser bcryptjs jsonwebtoken multer sharp sanitize-html swagger-ui-express yaml
npm install -D prisma@6 pino-pretty vitest supertest
```
Dependency lain di luar daftar ini: tanyakan dulu.

Script `package.json` yang dibutuhkan:
```json
"dev": "nodemon src/server.js",
"start": "node src/server.js",
"test": "vitest run",
"test:watch": "vitest",
"db:migrate": "prisma migrate dev",
"db:deploy": "prisma migrate deploy",
"db:generate": "prisma generate",
"db:seed": "prisma db seed",
"db:studio": "prisma studio",
"db:reset": "prisma migrate reset"
```

Konfigurasi Prisma memakai `prisma.config.js` (bukan `package.json#prisma` yang deprecated).
Karena file config ada, `.env` tidak dimuat otomatis, jadi baris pertamanya `import 'dotenv/config'`:
```js
import 'dotenv/config';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: path.join('prisma', 'schema.prisma'),
  migrations: { path: path.join('prisma', 'migrations'), seed: 'node prisma/seed.js' },
});
```

Gunakan nodemon config (`nodemon.json`) agar tidak restart saat folder `uploads/` berubah:
```json
{ "watch": ["src", ".env"], "ext": "js,json", "ignore": ["uploads/*", "tests/*"] }
```

---

## 3. Environment variable

Buat `.env.example` (di-commit) dan `.env` (tidak di-commit). Validasi semua di
`src/config/env.js`. Nilai string kosong dianggap tidak diisi.

| Variabel | Default | Keterangan |
|---|---|---|
| `NODE_ENV` | development | development / test / production |
| `PORT` | 4000 | |
| `API_PREFIX` | /api/v1 | |
| `SITE_URL` | http://localhost:5173 | URL frontend, dipakai sitemap & link email |
| `API_URL` | http://localhost:4000 | URL publik API, dipakai membentuk URL file upload |
| `CORS_ORIGINS` | http://localhost:5173 | dipisah koma |
| `TRUST_PROXY` | 0 | 1 jika di belakang Nginx/Cloudflare |
| `LOG_LEVEL` | info | |
| `DATABASE_URL` | wajib | |
| `JWT_ACCESS_SECRET` | wajib, min 32 karakter | |
| `JWT_ACCESS_EXPIRES_IN` | 15m | |
| `REFRESH_TOKEN_EXPIRES_DAYS` | 7 | |
| `COOKIE_DOMAIN` | kosong | isi di production jika FE & API beda subdomain |
| `COOKIE_SECURE` | false (true di production) | |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_SECURE` | opsional | jika kosong, email hanya di-log (mode dev) |
| `MAIL_FROM` | "Threevo <no-reply@example.com>" | |
| `LEAD_NOTIFICATION_EMAIL` | opsional | fallback jika setting kosong |
| `TURNSTILE_SECRET_KEY` | opsional | jika kosong, verifikasi CAPTCHA dilewati (log warning) |
| `UPLOAD_DIR` | uploads | |
| `UPLOAD_MAX_SIZE_MB` | 5 | |
| `TRACKING_PROVIDER` | mock | `mock` atau `http` |
| `TRACKING_API_URL`, `TRACKING_API_KEY` | opsional | wajib jika provider `http` |
| `TRACKING_TIMEOUT_MS` | 8000 | |
| `CACHE_TTL_SECONDS` | 300 | |
| `ENABLE_DOCS` | true (false di production) | aktifkan Swagger UI di `/docs` |
| `SEED_ADMIN_NAME`, `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` | | password acak jika kosong (hanya non-production) |

`.env.test` memakai database terpisah (`threevo_test`) dan tidak di-commit;
sediakan `.env.test.example`.

---

## 4. Database

### Docker Compose (development)
`docker-compose.yml`: service `postgres` (image `postgres:17-alpine`), user `threevo`,
password `threevo_secret`, database `threevo_db`, port 5432, volume persisten,
healthcheck `pg_isready`. Tambahkan `docker/postgres/init.sql` yang membuat database
`threevo_test` untuk pengujian.

### Skema Prisma (`prisma/schema.prisma`)

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  SUPER_ADMIN
  EDITOR
}
enum ArticleStatus {
  DRAFT
  PUBLISHED
}
enum LocationType {
  WAREHOUSE
  OFFICE
  HUB
}
enum LeadStatus {
  NEW
  CONTACTED
  CLOSED
}

model User {
  id           Int       @id @default(autoincrement())
  name         String    @db.VarChar(100)
  email        String    @unique @db.VarChar(150)
  passwordHash String    @map("password_hash")
  role         Role      @default(EDITOR)
  isActive     Boolean   @default(true) @map("is_active")
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  articles      Article[]
  media         Media[]
  auditLogs     AuditLog[]
  refreshTokens RefreshToken[]

  @@map("users")
}

model RefreshToken {
  id        Int       @id @default(autoincrement())
  tokenHash String    @unique @map("token_hash")
  userId    Int       @map("user_id")
  expiresAt DateTime  @map("expires_at")
  revokedAt DateTime? @map("revoked_at")
  userAgent String?   @map("user_agent") @db.VarChar(300)
  ipAddress String?   @map("ip_address") @db.VarChar(45)
  createdAt DateTime  @default(now()) @map("created_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("refresh_tokens")
}

model Category {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(100)
  slug      String   @unique @db.VarChar(120)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  articles Article[]

  @@map("categories")
}

model Article {
  id              Int           @id @default(autoincrement())
  title           String        @db.VarChar(200)
  slug            String        @unique @db.VarChar(220)
  excerpt         String?       @db.VarChar(500)
  content         String        @db.Text
  coverImage      String?       @map("cover_image")
  status          ArticleStatus @default(DRAFT)
  publishedAt     DateTime?     @map("published_at")
  metaTitle       String?       @map("meta_title") @db.VarChar(70)
  metaDescription String?       @map("meta_description") @db.VarChar(160)
  viewCount       Int           @default(0) @map("view_count")
  categoryId      Int?          @map("category_id")
  authorId        Int?          @map("author_id")
  createdAt       DateTime      @default(now()) @map("created_at")
  updatedAt       DateTime      @updatedAt @map("updated_at")
  deletedAt       DateTime?     @map("deleted_at")

  category Category? @relation(fields: [categoryId], references: [id], onDelete: SetNull)
  author   User?     @relation(fields: [authorId], references: [id], onDelete: SetNull)

  @@index([status, publishedAt])
  @@index([categoryId])
  @@map("articles")
}

model Service {
  id              Int       @id @default(autoincrement())
  name            String    @db.VarChar(150)
  slug            String    @unique @db.VarChar(170)
  shortDesc       String?   @map("short_desc") @db.VarChar(300)
  content         String?   @db.Text
  icon            String?
  image           String?
  metaTitle       String?   @map("meta_title") @db.VarChar(70)
  metaDescription String?   @map("meta_description") @db.VarChar(160)
  isFeatured      Boolean   @default(false) @map("is_featured")
  sortOrder       Int       @default(0) @map("sort_order")
  isActive        Boolean   @default(true) @map("is_active")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  @@index([isActive, sortOrder])
  @@map("services")
}

model Location {
  id        Int          @id @default(autoincrement())
  name      String       @db.VarChar(150)
  type      LocationType @default(WAREHOUSE)
  address   String       @db.VarChar(300)
  city      String       @db.VarChar(100)
  province  String?      @db.VarChar(100)
  latitude  Decimal?     @db.Decimal(10, 7)
  longitude Decimal?     @db.Decimal(10, 7)
  phone     String?      @db.VarChar(30)
  mapsUrl   String?      @map("maps_url")
  sortOrder Int          @default(0) @map("sort_order")
  isActive  Boolean      @default(true) @map("is_active")
  createdAt DateTime     @default(now()) @map("created_at")
  updatedAt DateTime     @updatedAt @map("updated_at")

  @@index([isActive, city])
  @@map("locations")
}

model Client {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(150)
  logo      String
  website   String?
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("clients")
}

model Testimonial {
  id        Int      @id @default(autoincrement())
  name      String   @db.VarChar(100)
  position  String?  @db.VarChar(100)
  company   String?  @db.VarChar(150)
  message   String   @db.Text
  photo     String?
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("testimonials")
}

model Banner {
  id        Int      @id @default(autoincrement())
  title     String   @db.VarChar(150)
  subtitle  String?  @db.VarChar(300)
  image     String
  ctaText   String?  @map("cta_text") @db.VarChar(50)
  ctaLink   String?  @map("cta_link")
  sortOrder Int      @default(0) @map("sort_order")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("banners")
}

model Setting {
  key       String   @id @db.VarChar(100)
  value     String   @db.Text
  isPublic  Boolean  @default(true) @map("is_public")
  updatedAt DateTime @updatedAt @map("updated_at")

  @@map("settings")
}

model Lead {
  id              Int        @id @default(autoincrement())
  name            String     @db.VarChar(100)
  email           String     @db.VarChar(150)
  phone           String?    @db.VarChar(30)
  company         String?    @db.VarChar(150)
  serviceInterest String?    @map("service_interest") @db.VarChar(150)
  message         String     @db.Text
  status          LeadStatus @default(NEW)
  notes           String?    @db.Text
  source          String?    @db.VarChar(100)
  ipAddress       String?    @map("ip_address") @db.VarChar(45)
  userAgent       String?    @map("user_agent") @db.VarChar(300)
  createdAt       DateTime   @default(now()) @map("created_at")
  updatedAt       DateTime   @updatedAt @map("updated_at")
  deletedAt       DateTime?  @map("deleted_at")

  @@index([status, createdAt])
  @@map("leads")
}

model Media {
  id           Int      @id @default(autoincrement())
  filename     String
  originalName String   @map("original_name")
  url          String
  mimeType     String   @map("mime_type") @db.VarChar(100)
  size         Int
  width        Int?
  height       Int?
  alt          String?  @db.VarChar(200)
  uploadedById Int?     @map("uploaded_by_id")
  createdAt    DateTime @default(now()) @map("created_at")

  uploadedBy User? @relation(fields: [uploadedById], references: [id], onDelete: SetNull)

  @@map("media")
}

model AuditLog {
  id        Int      @id @default(autoincrement())
  userId    Int?     @map("user_id")
  action    String   @db.VarChar(50)
  entity    String   @db.VarChar(50)
  entityId  String?  @map("entity_id") @db.VarChar(50)
  metadata  Json?
  ipAddress String?  @map("ip_address") @db.VarChar(45)
  createdAt DateTime @default(now()) @map("created_at")

  user User? @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([entity, entityId])
  @@index([createdAt])
  @@map("audit_logs")
}
```

Catatan:
- Artikel, layanan, dan lead memakai soft delete (`deletedAt`); semua query default
  mengecualikan data terhapus.
- Saat artikel dipublish pertama kali dan `publishedAt` kosong, isi dengan waktu sekarang.
- `Setting.isPublic = false` untuk key internal (mis. `lead_notification_email`),
  jangan dikirim di endpoint publik.

### Seeder (`prisma/seed.js`, idempotent dengan upsert)
- Super admin dari env.
- Settings: `company_name`, `company_tagline`, `contact_phone`, `contact_email`,
  `contact_address`, `contact_maps_url`, `whatsapp_number`, `whatsapp_message`,
  `social_instagram`, `social_linkedin`, `social_youtube`, `social_tiktok`,
  `tracking_url`, `footer_text` (publik) dan `lead_notification_email` (privat).
  `update: {}` agar nilai yang sudah diubah admin tidak ditimpa.
- Kategori: Berita Perusahaan, Tips Logistik, Event.
- Layanan: Warehouse Management System, Transport Management System, Fulfillment.
- Satu contoh lokasi dan satu artikel DRAFT (hanya di development).

---

## 5. Endpoint

Semua di bawah `API_PREFIX` (`/api/v1`), kecuali sitemap/robots/uploads.
Pagination via query `page` (default 1) dan `limit` (default 10, maks 50);
`meta` berisi `page, limit, total, totalPages, hasNextPage, hasPrevPage`.

### Publik
| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | status + cek DB (`SELECT 1`), 503 jika DB mati |
| GET | `/site` | settings publik (objek key-value), banners aktif, clients aktif, testimonials aktif, services featured |
| GET | `/services` | layanan aktif, urut `sortOrder` (tanpa `content`) |
| GET | `/services/:slug` | detail layanan aktif |
| GET | `/locations` | lokasi aktif; query `city`, `type` |
| GET | `/categories` | semua kategori + jumlah artikel published |
| GET | `/articles` | published saja; query `page`, `limit`, `category` (slug), `q` (judul/excerpt); tanpa `content`, sertakan kategori & nama penulis |
| GET | `/articles/:slug` | detail published; tambah `viewCount`; sertakan 3 artikel terkait (kategori sama) |
| POST | `/leads` | form kontak; rate limit 5/15 menit per IP; honeypot `website` harus kosong; verifikasi Turnstile (`captchaToken`) jika dikonfigurasi |
| GET | `/tracking/:awb` | proxy ke TMS; validasi format resi (alfanumerik 6–30); rate limit 30/15 menit; cache 2 menit |

Di luar prefix:
| GET | `/sitemap.xml` | halaman statis + semua layanan aktif + artikel published, `lastmod` dari `updatedAt` |
| GET | `/robots.txt` | izinkan semua, sebutkan sitemap; di non-production `Disallow: /` |
| GET | `/uploads/*` | file statis dengan `Cache-Control: public, max-age=31536000, immutable` |
| GET | `/docs` | Swagger UI dari `docs/openapi.yaml` (nonaktif di production kecuali `ENABLE_DOCS=true`) |

### Auth
| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/login` | email + password; rate limit 10/15 menit; set cookie `access_token` & `refresh_token`; update `lastLoginAt`; audit `LOGIN` |
| POST | `/auth/refresh` | rotasi refresh token (lama di-revoke, buat baru); jika token yang sudah di-revoke dipakai lagi → revoke semua token user (deteksi pencurian) |
| POST | `/auth/logout` | revoke refresh token, hapus cookie |
| GET | `/auth/me` | profil user login |
| PATCH | `/auth/me/password` | ganti password (butuh password lama); revoke semua refresh token lain |

Detail auth:
- Cookie: `httpOnly`, `secure` sesuai env, `sameSite: 'lax'`, `path` refresh token dibatasi ke `${API_PREFIX}/auth`.
- Refresh token = string acak 48 byte (`crypto.randomBytes`), disimpan sebagai hash SHA-256.
- Middleware `requireAuth` membaca cookie `access_token` (fallback header `Authorization: Bearer`),
  memverifikasi JWT, memuat user aktif, mengisi `req.user`.
- Middleware `requireRole(...roles)`.
- Pesan login gagal selalu sama (`Email atau password salah`), tanpa membedakan email tidak ada.
- User nonaktif tidak bisa login dan tokennya ditolak.

### Admin (`/admin/*`, semua butuh `requireAuth`)
| Resource | Endpoint | Catatan |
|---|---|---|
| Articles | `GET /admin/articles` (filter `status`, `category`, `q`, pagination), `GET /:id`, `POST`, `PATCH /:id`, `DELETE /:id` (soft), `PATCH /:id/publish`, `PATCH /:id/unpublish` | slug otomatis dari judul jika tidak dikirim, unik (tambah `-2`, `-3`); `content` disanitasi `sanitize-html` |
| Categories | CRUD `/admin/categories` | hapus ditolak (409) jika masih dipakai artikel |
| Services | CRUD `/admin/services` + `PATCH /admin/services/reorder` (`[{id, sortOrder}]`) | slug otomatis, content disanitasi |
| Locations | CRUD `/admin/locations` | validasi lat -90..90, lng -180..180 |
| Banners | CRUD `/admin/banners` + reorder | |
| Clients | CRUD `/admin/clients` + reorder | |
| Testimonials | CRUD `/admin/testimonials` + reorder | |
| Media | `POST /admin/media` (multipart `file`, opsional `alt`), `GET /admin/media` (pagination), `DELETE /admin/media/:id` | hapus file fisik juga |
| Settings | `GET /admin/settings`, `PUT /admin/settings` (objek key-value, hanya key yang dikenal) | SUPER_ADMIN |
| Leads | `GET /admin/leads` (filter `status`, `q`, `from`, `to`), `GET /:id`, `PATCH /:id` (`status`, `notes`), `DELETE /:id` (SUPER_ADMIN, soft), `GET /admin/leads/export` (CSV, filter sama) | CSV memakai BOM UTF-8 agar rapi di Excel; cegah CSV injection (awali `'` untuk nilai berawalan `= + - @`) |
| Users | CRUD `/admin/users` | SUPER_ADMIN; tidak bisa menghapus/menonaktifkan diri sendiri atau super admin terakhir; hapus = nonaktifkan |
| Audit logs | `GET /admin/audit-logs` (filter `entity`, `userId`, pagination) | SUPER_ADMIN |
| Dashboard | `GET /admin/dashboard` | jumlah artikel per status, lead per status, lead 30 hari terakhir per hari, 5 lead terbaru |

Setiap create/update/delete di admin menulis audit log (`CREATE`/`UPDATE`/`DELETE`/`PUBLISH`)
dan menginvalidasi cache publik terkait.

---

## 6. Detail fitur

### Upload (`middlewares/upload.js`, `lib/storage.js`)
- `multer` memory storage, batas `UPLOAD_MAX_SIZE_MB`, hanya `image/jpeg`, `image/png`, `image/webp`.
- Validasi isi file sungguhan dengan `sharp().metadata()` (jangan percaya ekstensi/mimetype saja).
- Konversi ke WebP (kualitas 82), resize maksimal lebar 1920, hapus metadata EXIF.
- Nama file acak (`crypto.randomUUID()`), disimpan di `UPLOAD_DIR/YYYY/MM/`.
- `lib/storage.js` berupa abstraksi (`save`, `remove`, `getUrl`) dengan driver `local`,
  supaya nanti mudah diganti ke S3/Cloudinary.
- SVG tidak didukung (risiko XSS).

### Lead & email (`lib/mailer.js`)
- Nodemailer; jika SMTP tidak dikonfigurasi, gunakan `jsonTransport` dan log isinya.
- Kirim email notifikasi **setelah respons** (tidak ditunggu); kegagalan email hanya di-log, lead tetap tersimpan.
- Tujuan: setting `lead_notification_email`, fallback env.
- Semua nilai dari pengunjung di-escape sebelum dimasukkan ke HTML email.
- Simpan `ipAddress`, `userAgent`, dan `source` (query `utm_source` atau header referer).

### Tracking (`modules/tracking`)
- Pola provider: `providers/mock.js` dan `providers/http.js`, dipilih dari `TRACKING_PROVIDER`.
- Output ternormalisasi:
  ```json
  { "awb": "...", "status": "IN_TRANSIT", "statusLabel": "Dalam perjalanan",
    "origin": "...", "destination": "...", "estimatedDelivery": "ISO|null",
    "history": [{ "timestamp": "ISO", "status": "...", "location": "...", "description": "..." }] }
  ```
- Mock: resi berawalan `TEST` mengembalikan data contoh; selain itu 404.
- HTTP provider: `fetch` bawaan Node dengan `AbortController` timeout; API key hanya di server;
  error upstream → 502 `TRACKING_UNAVAILABLE`, tidak ditemukan → 404.
- Format API TMS sungguhan belum diketahui; buat mapping di satu fungsi `normalize()`
  dengan komentar TODO yang jelas.

### Cache (`lib/cache.js`)
- Cache in-memory sederhana (Map + TTL), tanpa dependency, dengan fungsi
  `get`, `set`, `del`, `delByPrefix`, `wrap(key, ttl, fn)`.
- Dipakai untuk `/site`, `/services`, `/locations`, `/categories`, daftar artikel, tracking.
- Header `Cache-Control: public, max-age=60, stale-while-revalidate=300` pada GET publik;
  `no-store` untuk admin dan auth.
- Catatan di README: ganti ke Redis jika menjalankan lebih dari satu instance.

### Keamanan di `app.js`
- `helmet()` (izinkan `crossOriginResourcePolicy: cross-origin` untuk `/uploads`).
- CORS whitelist dari env, `credentials: true`.
- `compression`, `express.json({ limit: '1mb' })`, `cookie-parser`.
- `pino-http` dengan request ID (`X-Request-Id`), abaikan log `/health`, redaksi cookie/authorization/password.
- Rate limit global 300/15 menit di prefix API.
- `app.set('trust proxy', env.TRUST_PROXY)`, `x-powered-by` dimatikan.

---

## 7. Testing

- `vitest.config.js`: environment node, `setupFiles: ['tests/setup.js']`, `fileParallelism: false`
  (satu database test).
- `tests/setup.js` memuat `.env.test` (`dotenv` dengan `override: true`) dan membersihkan
  tabel sebelum tiap file test (`TRUNCATE ... RESTART IDENTITY CASCADE`).
- Sebelum test pertama: `npx prisma migrate deploy` ke database test (dokumentasikan di README,
  atau jalankan di `globalSetup`).
- Helper `tests/helpers.js`: buat user, login dan ambil cookie (`supertest.agent`).
- Minimal cakupan per modul: jalur sukses, validasi gagal (422), tanpa login (401),
  role salah (403), data tidak ada (404), duplikat slug (409 atau slug otomatis bertambah),
  endpoint publik tidak menampilkan draft/nonaktif/terhapus.
- Tracking diuji dengan provider mock; upload diuji dengan gambar kecil yang dibuat `sharp` di test.
- Rate limiter dilewati saat `NODE_ENV=test`, kecuali satu test khusus yang mengaktifkannya.

---

## 8. Produksi

- `Dockerfile` multi-stage (node:22-alpine), `npm ci --omit=dev`, `prisma generate`,
  user non-root, `HEALTHCHECK` ke `/api/v1/health`, jalankan `prisma migrate deploy` sebelum start
  (script `start:prod`).
- `docker-compose.prod.yml` contoh: api + postgres + volume uploads.
- `.github/workflows/ci.yml`: service postgres, `npm ci`, `prisma migrate deploy`, `npm test`
  pada setiap push dan PR.
- `scripts/backup-db.ps1` dan `scripts/backup-db.sh` (pg_dump dengan tanggal, simpan 14 terakhir).
- `docs/DEPLOYMENT.md`: contoh konfigurasi Nginx (reverse proxy, `client_max_body_size 10m`,
  SSL Let's Encrypt), PM2 sebagai alternatif Docker, checklist env production,
  uptime monitor ke `/api/v1/health`, jadwal backup, dan saran error tracking (Sentry,
  tanyakan dulu sebelum menambah dependency).

---

## 9. Fase pengerjaan

Setiap fase: implementasi → test → jalankan server → perbarui README/OpenAPI → commit.

### Fase 0 — Fondasi
Dependency, `prisma.config.js`, `nodemon.json`, `.env.example`, `docker-compose.yml`,
`src/config/env.js` + `zod.js`, `lib/logger.js`, `lib/prisma.js`, `utils/AppError.js`,
`utils/response.js`, `utils/pagination.js`, `utils/slug.js` (mendukung huruf Indonesia,
hapus aksen, lowercase, tanda hubung), `middlewares/validate.js`, `rateLimiter.js`,
`errorHandler.js` lengkap, `app.js` dengan middleware keamanan, `server.js` dengan koneksi DB
dan graceful shutdown, modul `health` dengan cek DB, skema Prisma, migration `init`, seeder,
setup Vitest.
**Selesai jika:** `docker compose up -d`, `npm run db:migrate`, `npm run db:seed`, `npm run dev`
berjalan; `/api/v1/health` 200; 404 & error berformat JSON; test health & error handler lulus.

### Fase 1 — Auth & Users
Login, refresh (rotasi + deteksi reuse), logout, me, ganti password, `requireAuth`,
`requireRole`, audit log helper (`lib/audit.js`), modul users.
**Selesai jika:** alur login → me → refresh → logout teruji; akses admin tanpa cookie 401;
EDITOR ke `/admin/users` 403.

### Fase 2 — Settings & konten Home
Settings (publik & admin), banners, clients, testimonials, `GET /site`, cache + invalidasi.
**Selesai jika:** `/site` hanya berisi setting publik dan item aktif; perubahan admin langsung
tercermin (cache ter-invalidasi).

### Fase 3 — Services & Locations
Publik + admin, reorder, sanitasi content, soft delete layanan.

### Fase 4 — Categories & Articles
Publik (pagination, filter, pencarian, related, viewCount) + admin (draft/publish, slug unik).
**Selesai jika:** draft & artikel terhapus tidak muncul di publik; slug duplikat otomatis `-2`.

### Fase 5 — Media upload
Upload, list, hapus; file tersaji di `/uploads`; file non-gambar ditolak meski ekstensinya diganti.

### Fase 6 — Leads
Form publik (honeypot, captcha opsional, rate limit), email async, admin (filter, status, notes,
hapus, export CSV), dashboard admin.

### Fase 7 — Tracking
Provider mock & http, validasi, timeout, cache, rate limit.

### Fase 8 — SEO & dokumentasi
`sitemap.xml`, `robots.txt`, `docs/openapi.yaml` lengkap untuk semua endpoint, Swagger UI di `/docs`,
README final (setup, env, script, struktur, konvensi, alur auth untuk frontend).

### Fase 9 — Kesiapan produksi
Dockerfile, compose produksi, CI GitHub Actions, script backup, `docs/DEPLOYMENT.md`,
`npm audit` bersih dari high/critical, review akhir keamanan (lihat checklist).

---

## 10. Checklist keamanan akhir
- [ ] Tidak ada secret di repo; `.env*` (kecuali example) di-ignore
- [ ] Semua input divalidasi Zod; field tak dikenal dibuang
- [ ] HTML dari admin disanitasi; input pengunjung di-escape di email
- [ ] Password bcrypt, pesan login generik, rate limit login & lead
- [ ] Cookie httpOnly/secure/sameSite; refresh token di-hash & dirotasi
- [ ] Endpoint admin semua di balik `requireAuth`; role dicek
- [ ] Upload divalidasi isi, dikonversi, nama acak, tanpa SVG
- [ ] Error 500 tidak membocorkan detail di production
- [ ] CORS hanya origin frontend; helmet aktif
- [ ] Log tidak berisi password, token, atau cookie

---

## 11. Checklist progres
- [x] Fase 0 — Fondasi
- [ ] Fase 1 — Auth & Users
- [ ] Fase 2 — Settings & konten Home
- [ ] Fase 3 — Services & Locations
- [ ] Fase 4 — Categories & Articles
- [ ] Fase 5 — Media upload
- [ ] Fase 6 — Leads
- [ ] Fase 7 — Tracking
- [ ] Fase 8 — SEO & dokumentasi
- [ ] Fase 9 — Kesiapan produksi
