# Panduan Integrasi Frontend — Threevo Compro

Dokumen ini ditujukan untuk **agen/developer yang mengerjakan repo frontend React (Vite)**.
Isinya kontrak API backend dan langkah deployment. Salin file ini ke repo frontend
(mis. sebagai `docs/BACKEND_INTEGRATION.md`) agar tersedia di konteks kerja di sana.

Referensi lengkap dan selalu terbaru: `docs/openapi.yaml` di repo backend, atau Swagger UI
di `/docs` bila `ENABLE_DOCS=true`.

---

## 1. Keadaan deployment saat ini

| Hal | Nilai |
|---|---|
| Server | VPS `203.175.11.205` (Ubuntu, Docker Compose + Nginx) |
| Base URL API | `http://203.175.11.205/api/v1` |
| Protokol | **HTTP, belum HTTPS** — domain belum dibeli |
| Domain tujuan | `threevo.id` (frontend), `api.threevo.id` (API) — belum aktif |
| Status | Live untuk keperluan presentasi |

Frontend dan backend akan dilayani dari **origin yang sama** (satu IP, dibagi per path oleh
Nginx). Ini membuat cookie autentikasi bekerja tanpa masalah CORS.

> **Jangan hardcode `http://203.175.11.205`** di kode. Pakai path relatif (lihat §3),
> supaya tidak perlu diubah saat pindah ke domain.

---

## 2. Variabel environment frontend

```bash
# .env
VITE_API_BASE_URL=/api/v1
VITE_TURNSTILE_SITE_KEY=1x00000000000000000000AA
```

`VITE_TURNSTILE_SITE_KEY` di atas adalah **kunci uji Cloudflare** — semua token dianggap
valid, tidak peduli hostname. Dipakai sementara karena widget asli terdaftar untuk domain
`threevo.id` yang belum aktif; memakai site key asli di alamat IP akan membuat seluruh
pengiriman form ditolak.

Saat domain sudah aktif, ganti dengan site key asli dari dashboard Cloudflare Turnstile.

---

## 3. Autentikasi — cookie httpOnly, bukan Bearer token

Backend **tidak** mengembalikan token di body respons. Access token (15 menit) dan refresh
token (7 hari) dikirim sebagai cookie `httpOnly`, sehingga tidak bisa (dan tidak perlu)
dibaca JavaScript.

Konsekuensi untuk frontend:

- **Setiap** request ke API wajib menyertakan kredensial:
  - `fetch`: `credentials: 'include'`
  - `axios`: `withCredentials: true`
- **Jangan** menyimpan token di `localStorage` atau `sessionStorage` — tidak ada yang
  perlu disimpan.
- Status login dicek dengan memanggil `GET /auth/me`. Kalau `401`, berarti belum login.

Contoh client minimal:

```js
const API = import.meta.env.VITE_API_BASE_URL;

export async function api(path, options = {}) {
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw Object.assign(new Error(body?.error?.message ?? 'Request gagal'), {
    status: res.status,
    code: body?.error?.code,
    details: body?.error?.details,
  });
  return body;
}
```

### Alur refresh token

Access token kedaluwarsa setelah 15 menit. Saat request mengembalikan `401`:

1. Panggil `POST /auth/refresh` (tanpa body, cookie dikirim otomatis)
2. Kalau berhasil, ulangi request yang tadi gagal
3. Kalau `POST /auth/refresh` juga `401`, arahkan pengguna ke halaman login

Refresh token dirotasi setiap kali dipakai, jadi jangan memanggil `/auth/refresh` secara
paralel dari beberapa request sekaligus — antrikan, atau pakai satu promise bersama.

---

## 4. Format respons

Seluruh endpoint memakai bentuk yang sama.

**Sukses:**

```json
{ "success": true, "message": "opsional", "data": ..., "meta": { } }
```

**Error:**

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Pesan dalam Bahasa Indonesia, aman ditampilkan ke pengguna",
    "details": [{ "field": "email", "message": "Email tidak valid" }]
  }
}
```

`error.message` memang ditulis untuk pengguna akhir — boleh langsung ditampilkan.
`error.details` hanya ada pada error validasi, berguna untuk menandai field yang salah.

### Kode error

| Code | HTTP | Arti & penanganan yang disarankan |
|---|---|---|
| `BAD_REQUEST` | 400 | Permintaan tidak valid (mis. CAPTCHA gagal). Tampilkan pesan |
| `UNAUTHORIZED` | 401 | Belum login / token kedaluwarsa. Coba refresh, lalu ke login |
| `FORBIDDEN` | 403 | Login tapi peran tidak mencukupi. Tampilkan pesan, jangan redirect |
| `NOT_FOUND` | 404 | Data tidak ada. Tampilkan halaman 404 |
| `CONFLICT` | 409 | Bentrok data (mis. slug sudah dipakai) |
| `VALIDATION_ERROR` | 422 | Input gagal validasi. Petakan `details` ke field form |
| `TOO_MANY_REQUESTS` | 429 | Kena rate limit. Tampilkan pesan, jangan retry otomatis |

### Paginasi

Endpoint berdaftar menerima query `?page=1&limit=10`. `limit` maksimal **50**, default 10.
Responsnya menyertakan:

```json
"meta": {
  "page": 1, "limit": 10, "total": 42, "totalPages": 5,
  "hasNextPage": true, "hasPrevPage": false
}
```

---

## 5. Endpoint publik (tanpa login)

| Method | Path | Keterangan |
|---|---|---|
| GET | `/health` | Status server. `503` bila database mati |
| GET | `/site` | **Satu panggilan untuk seluruh data halaman depan** |
| GET | `/services` | Daftar layanan aktif |
| GET | `/services/:slug` | Detail layanan + konten HTML |
| GET | `/locations` | Daftar lokasi. Query: `city`, `type` |
| GET | `/categories` | Kategori artikel |
| GET | `/articles` | Daftar artikel terbit. Query: `page`, `limit`, `category`, `q` |
| GET | `/articles/:slug` | Detail artikel + konten HTML |
| POST | `/leads` | Kirim form kontak |
| GET | `/tracking/:awb` | Lacak resi |

Di luar prefix `/api/v1`: `GET /sitemap.xml`, `GET /robots.txt`, dan `/uploads/*`
(gambar yang diunggah lewat panel admin).

### `GET /site` — pakai ini untuk halaman depan

Mengembalikan lima bagian sekaligus, jadi tidak perlu beberapa request terpisah:

```
data.settings      objek key-value (lihat daftar di bawah)
data.banners       banner hero
data.clients       logo klien
data.testimonials  testimoni
data.services      layanan unggulan (isFeatured)
```

Kunci yang tersedia di `data.settings`:

```
company_name, company_tagline, footer_text,
contact_phone, contact_email, contact_address, contact_maps_url,
whatsapp_number, whatsapp_message, tracking_url,
social_instagram, social_linkedin, social_youtube, social_tiktok
```

Sebagian bisa bernilai string kosong — tangani dengan fallback, jangan asumsikan terisi.

### `POST /leads` — form kontak

```json
{
  "name": "Budi Santoso",
  "email": "budi@example.com",
  "phone": "081234567890",
  "company": "PT Contoh",
  "serviceInterest": "Warehouse Fulfillment",
  "message": "Saya ingin berkonsultasi mengenai layanan fulfillment.",
  "website": "",
  "captchaToken": "<token dari widget Turnstile>"
}
```

Aturan yang perlu dicerminkan di validasi form:

| Field | Wajib | Aturan |
|---|---|---|
| `name` | ya | 2–100 karakter |
| `email` | ya | format email |
| `phone` | tidak | 6–30 karakter, hanya angka dan `+ - ( ) spasi .` |
| `company` | tidak | maks 150 |
| `serviceInterest` | tidak | maks 150 |
| `message` | ya | **minimal 10**, maks 5000 karakter |
| `website` | — | **honeypot**, lihat di bawah |
| `captchaToken` | ya (praktis) | token dari widget Turnstile |

**Honeypot `website`:** sediakan input tersembunyi bernama `website` di form
(disembunyikan lewat CSS, `tabindex="-1"`, `autocomplete="off"` — **bukan**
`type="hidden"` agar bot tetap mengisinya). Pengguna asli membiarkannya kosong; bila terisi,
backend membuang kiriman tersebut secara diam-diam — responsnya tetap `201` dengan pesan
terima kasih yang sama, supaya bot tidak tahu bahwa ia tertangkap. Jadi `201` bukan jaminan
lead tersimpan; itu disengaja dan bukan bug.

Query opsional `?utm_source=...` ikut tersimpan sebagai sumber lead.

**Rate limit: 5 kiriman per 15 menit per IP.** Kalau dapat `429`, tampilkan pesan dari
`error.message` dan nonaktifkan tombol kirim sementara — jangan retry otomatis.

### Integrasi widget Turnstile

1. Muat skrip `https://challenges.cloudflare.com/turnstile/v0/api.js`
2. Render widget dengan `VITE_TURNSTILE_SITE_KEY`
3. Ambil token dari callback, kirim sebagai `captchaToken`
4. **Reset widget setelah setiap pengiriman** (berhasil maupun gagal) — token hanya
   sekali pakai, mengirim ulang token yang sama akan ditolak

---

## 6. Endpoint admin (perlu login)

Semua di bawah prefix `/admin` dan butuh cookie sesi yang valid.

| Method | Path | Keterangan |
|---|---|---|
| POST | `/auth/login` | Body `{ email, password }` |
| POST | `/auth/logout` | Menghapus cookie |
| POST | `/auth/refresh` | Perpanjang sesi |
| GET | `/auth/me` | Data user yang sedang login |
| PATCH | `/auth/me/password` | `{ currentPassword, newPassword }` |
| GET | `/admin/dashboard` | Ringkasan statistik |
| GET/PATCH | `/admin/settings` | Pengaturan situs |
| CRUD | `/admin/services` | + `PATCH /reorder` |
| CRUD | `/admin/locations` | + `PATCH /reorder` |
| CRUD | `/admin/categories` | |
| CRUD | `/admin/articles` | + `PATCH /:id/publish`, `PATCH /:id/unpublish` |
| CRUD | `/admin/banners`, `/clients`, `/testimonials` | |
| GET/PATCH/DELETE | `/admin/leads` | + `GET /export` (unduh CSV) |
| POST | `/admin/media` | Upload gambar, `multipart/form-data`, maks 5 MB |
| CRUD | `/admin/users` | Khusus `SUPER_ADMIN` |
| GET | `/admin/audit-logs` | Riwayat perubahan |

**Peran:** `SUPER_ADMIN` dan `ADMIN`. Operasi hapus tertentu (mis. `DELETE /admin/leads/:id`)
dan seluruh `/admin/users` hanya untuk `SUPER_ADMIN` — sembunyikan tombolnya bila
`user.role !== 'SUPER_ADMIN'`, dan tetap tangani `403` dari server.

**Rate limit login: 10 percobaan per 15 menit per IP.**

---

## 7. Rute frontend harus cocok dengan sitemap

Backend membuat `sitemap.xml` berdasarkan daftar rute di
`src/modules/seo/seo.service.js` (konstanta `FRONTEND_ROUTES`). Rute React **wajib** sama
persis, kalau tidak sitemap akan berisi URL yang menghasilkan 404:

```
/                      /tentang-kami        /layanan
/harga                 /lokasi              /berita
/kontak                /layanan/:slug       /berita/:slug
```

Catatan: `/harga` adalah halaman tersendiri, meski datanya tersimpan sebagai layanan
dengan slug `paket-harga`. Backend sengaja mengeluarkan slug itu dari sitemap agar tidak
terjadi konten ganda. Frontend perlu mengalihkan `/layanan/paket-harga` → `/harga`.

**Bila menambah atau mengubah rute halaman, beri tahu pengelola backend** agar
`FRONTEND_ROUTES` ikut diperbarui.

---

## 8. Deployment frontend ke VPS

### Build

```powershell
npm run build
scp -r dist/* threevo@203.175.11.205:/tmp/fe/
```

### Pasang di server

```bash
sudo mkdir -p /var/www/threevo
sudo cp -r /tmp/fe/* /var/www/threevo/
sudo chown -R www-data:www-data /var/www/threevo
```

### Nginx — satu server block untuk FE + API

Karena baru ada satu alamat IP tanpa domain, pembagian dilakukan per path:

```nginx
server {
    listen 80 default_server;
    server_name _;
    client_max_body_size 10m;

    root /var/www/threevo;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location ~ ^/(api/v1|uploads|docs|sitemap\.xml|robots\.txt) {
        proxy_pass http://127.0.0.1:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Dua baris yang menentukan:

- `try_files $uri $uri/ /index.html` — wajib untuk React Router. Tanpa ini, membuka
  `/layanan` langsung atau menekan refresh di halaman dalam menghasilkan 404.
- Blok `location ~ ^/(api/v1|uploads|...)` — path milik backend. `uploads` harus ada,
  kalau tidak gambar dari panel admin tidak tampil.

Terapkan:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

### Halaman blank setelah deploy?

Penyebab tersering: path aset salah. Periksa `base` di `vite.config.js` — untuk pemasangan
di root, nilainya harus `'/'`.

---

## 9. Yang harus diubah saat domain aktif

Daftar ini penting agar tidak ada yang terlewat saat `threevo.id` sudah siap:

**Frontend:**
- `VITE_TURNSTILE_SITE_KEY` → site key asli dari dashboard Cloudflare
- Pastikan tidak ada URL berisi `203.175.11.205` yang ter-hardcode

**Backend** (dikerjakan di repo backend, bukan di sini):
- `SITE_URL`, `API_URL`, `CORS_ORIGINS` → `https://threevo.id`
- `COOKIE_SECURE=true`, `COOKIE_DOMAIN=.threevo.id`
- `TURNSTILE_SECRET_KEY` → secret asli
- Pasang SSL (`certbot`), lalu daftarkan sitemap ke Google Search Console

**Cloudflare Turnstile:**
- Tambahkan `threevo.id` dan `www.threevo.id` ke daftar Hostnames widget

---

## 10. Batasan yang perlu diketahui

- **Belum HTTPS.** Selama di alamat IP, password login terkirim sebagai teks biasa.
  Jangan pakai kredensial sungguhan untuk apa pun selain demo.
- **CAPTCHA memakai kunci uji**, jadi form kontak praktis tanpa perlindungan bot.
- **Endpoint tracking masih mode `mock`.** `GET /tracking/:awb` mengembalikan data contoh
  berformat benar, bukan data asli — format respons TMS sungguhan belum tersedia.
  Frontend boleh dibangun penuh di atasnya; hanya sumber datanya yang nanti berubah.
- **Cache endpoint publik 5 menit.** Perubahan lewat panel admin baru tampak di endpoint
  publik setelah cache kedaluwarsa. Bukan bug.
