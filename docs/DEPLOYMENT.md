# Deployment — Threevo Compro Backend

Panduan menjalankan API di server production (VPS Linux, mis. Ubuntu 24.04).
Asumsi domain: frontend `https://threevo.id`, API `https://api.threevo.id`.

## Daftar isi
1. [Checklist env production](#1-checklist-env-production)
2. [Opsi A — Docker Compose (disarankan)](#2-opsi-a--docker-compose-disarankan)
2b. [Urutan seed](#2b-urutan-seed)
3. [Opsi B — PM2 tanpa Docker](#3-opsi-b--pm2-tanpa-docker)
4. [Nginx + SSL Let's Encrypt](#4-nginx--ssl-lets-encrypt)
5. [Update versi & migration](#5-update-versi--migration)
6. [Backup & restore](#6-backup--restore)
7. [Monitoring](#7-monitoring)
8. [Catatan keamanan](#8-catatan-keamanan)

---

## 1. Checklist env production

Contoh lengkap: `.env.production.example`.

- [ ] `NODE_ENV=production`
- [ ] `DATABASE_URL` mengarah ke database production (password kuat)
- [ ] `JWT_ACCESS_SECRET` acak ≥ 32 karakter, **berbeda** dari development
- [ ] `SITE_URL=https://threevo.id`, `API_URL=https://api.threevo.id`
- [ ] `CORS_ORIGINS` hanya domain frontend (mis. `https://threevo.id,https://www.threevo.id`)
- [ ] `TRUST_PROXY=1` (di belakang Nginx; tanpa ini rate limit menganggap semua user satu IP)
- [ ] `COOKIE_SECURE=true`, `COOKIE_DOMAIN=.threevo.id`
- [ ] SMTP terisi dan `LEAD_NOTIFICATION_EMAIL` atau setting `lead_notification_email` diisi
- [ ] `TURNSTILE_SECRET_KEY` diisi (dan site key di frontend). **Wajib** — server
      menolak start kalau kosong. Untuk demo tanpa domain, pakai kunci uji
      `1x0000000000000000000000000000000AA` (semua token lolos, ada peringatan di log)
- [ ] `TRACKING_PROVIDER=http` + `TRACKING_API_URL`/`TRACKING_API_KEY` setelah `normalize()` disesuaikan
- [ ] `ENABLE_DOCS=false` (kecuali memang ingin Swagger publik)
- [ ] `SEED_ADMIN_PASSWORD` diisi untuk seed pertama, lalu **hapus** dari env setelahnya
- [ ] File `.env.production` tidak pernah di-commit (`chmod 600`)

## 2. Opsi A — Docker Compose (disarankan)

```bash
# Di server
git clone git@github.com:Triatek/Threevo_Compro_BE.git /srv/threevo-api
cd /srv/threevo-api
cp .env.production.example .env.production
nano .env.production            # isi semua nilai
chmod 600 .env.production

docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml logs -f api
```

Container `api` otomatis menjalankan `prisma migrate deploy` sebelum start
(`npm run start:prod`). Seed pertama kali dijalankan **berurutan** (lihat
[bagian 2b](#2b-urutan-seed) untuk penjelasan tiap langkah):

```bash
CO="docker compose -f docker-compose.prod.yml"
$CO exec api node prisma/seed.js            # 1. admin, settings, kategori, struktur dasar
$CO exec api node prisma/seed-content.js    # 2. konten asli Threevo (layanan, lokasi, harga)
$CO exec api node prisma/seed-articles.js   # 3. artikel contoh - opsional
$CO restart api                             # segarkan cache endpoint publik
```

Catatan:
- API hanya terbuka di `127.0.0.1:4000`; publik mengakses lewat Nginx.
- PostgreSQL tidak membuka port ke luar.
- File upload disimpan di volume `uploads`, database di volume `postgres_data`.
- Image berjalan sebagai user non-root dan punya `HEALTHCHECK` ke `/api/v1/health`.

## 2b. Urutan seed

Seed dipecah menjadi tiga script yang **harus dijalankan berurutan**, karena tiap
langkah bergantung pada data yang dibuat langkah sebelumnya.

| Urutan | Script | Isi | Sifat |
|---|---|---|---|
| 1 | `prisma/seed.js` | Super admin, settings default, kategori artikel, layanan placeholder | Wajib. Idempoten: data yang sudah ada dilewati, tidak ditimpa |
| 2 | `prisma/seed-content.js` | Konten asli Threevo: layanan, lokasi, halaman harga, settings company profile | Wajib untuk situs production. **Menimpa** isi layanan & settings setiap dijalankan |
| 3 | `prisma/seed-articles.js` | Artikel contoh untuk demo | Opsional. Butuh kategori (langkah 1) dan super admin (langkah 1) |

Catatan penting:

- **Langkah 1 wajib lebih dulu.** `seed-articles.js` mencari kategori dan user
  `SUPER_ADMIN`; kalau belum ada, artikel dilewati dengan peringatan, bukan error.
- **Langkah 2 sengaja menimpa** isi layanan dan settings. Ini aman diulang saat konten
  company profile diperbarui, tapi berarti **perubahan yang Anda buat lewat panel admin
  pada layanan/settings akan tertimpa**. Setelah situs live, perbarui konten lewat panel
  admin saja, jangan jalankan ulang script ini tanpa sadar.
- Langkah 3 bisa dibatalkan: `npm run db:seed:articles -- --remove` hanya menghapus slug
  contoh yang terdaftar di `prisma/content/articles.js`, artikel tulisan sendiri aman.
- **Restart API setelah seed.** Endpoint publik memakai cache in-memory
  (`CACHE_TTL_SECONDS`, default 300 detik), jadi tanpa restart konten baru belum muncul
  sampai cache kedaluwarsa.
- `SEED_ADMIN_PASSWORD` wajib ada di env saat langkah 1 (di production script gagal
  tanpa itu). Setelah login pertama, ganti password admin lalu hapus variabel ini dari
  `.env.production`.

## 3. Opsi B — PM2 tanpa Docker

Butuh Node.js 22 dan PostgreSQL terpasang di server.

```bash
cd /srv/threevo-api
npm ci                      # termasuk prisma CLI untuk migration
cp .env.production.example .env && nano .env && chmod 600 .env
npm run db:deploy

# Seed pertama kali, berurutan (lihat bagian 2b)
node prisma/seed.js
npm run db:seed:content
npm run db:seed:articles    # opsional

npm install -g pm2
```

`ecosystem.config.cjs` (buat di server):
```js
module.exports = {
  apps: [
    {
      name: 'threevo-api',
      script: 'src/server.js',
      // Satu instance: cache & rate limit disimpan di memori proses.
      // Untuk cluster, pindahkan cache & rate limit ke Redis dulu.
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '400M',
      kill_timeout: 12000, // > waktu graceful shutdown (10 detik)
      env: { NODE_ENV: 'production' },
    },
  ],
};
```

```bash
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup                 # ikuti perintah yang dicetak agar auto-start saat reboot
pm2 install pm2-logrotate   # rotasi log
```

## 4. Nginx + SSL Let's Encrypt

`/etc/nginx/sites-available/api.threevo.id`:
```nginx
server {
    listen 80;
    server_name api.threevo.id;

    # Upload gambar maks 5 MB + overhead multipart
    client_max_body_size 10m;

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
}
```

Frontend (`threevo.id`) sebaiknya meneruskan `sitemap.xml` dan `robots.txt` ke API, karena
sitemap harus berada di domain yang sama dengan URL di dalamnya:
```nginx
# di server block threevo.id
location = /sitemap.xml { proxy_pass http://127.0.0.1:4000/sitemap.xml; proxy_set_header Host $host; }
location = /robots.txt  { proxy_pass http://127.0.0.1:4000/robots.txt;  proxy_set_header Host $host; }
```

Aktifkan dan pasang SSL:
```bash
sudo ln -s /etc/nginx/sites-available/api.threevo.id /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d api.threevo.id -d threevo.id -d www.threevo.id
sudo certbot renew --dry-run   # cek perpanjangan otomatis
```

Jika memakai Cloudflare proxy, set SSL mode **Full (strict)**.

## 5. Update versi & migration

```bash
cd /srv/threevo-api
./scripts/backup-db.sh            # selalu backup dulu
git pull

# Docker
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build

# PM2
npm ci && npm run db:deploy && pm2 reload threevo-api
```

- Jangan pernah menjalankan `prisma migrate dev` atau `migrate reset` di production.
- Migration dibuat di lokal (`npm run db:migrate`), di-commit, lalu diterapkan dengan `migrate deploy`.
- **Jangan jalankan ulang `seed-content.js` saat update rutin.** Script itu menimpa layanan
  dan settings, termasuk perubahan yang sudah dibuat lewat panel admin (lihat
  [bagian 2b](#2b-urutan-seed)). Jalankan hanya saat konten company profile memang
  sengaja diperbarui dari repo.

## 6. Backup & restore

Script: `scripts/backup-db.sh` (Linux) dan `scripts/backup-db.ps1` (Windows).
Format `pg_dump --format=custom`, menyimpan 14 backup terakhir (ubah dengan `KEEP`).

**Jadwal harian (cron, 02:00):**
```cron
0 2 * * * cd /srv/threevo-api && BACKUP_DIR=/var/backups/threevo ./scripts/backup-db.sh >> /var/log/threevo-backup.log 2>&1
```
Untuk Docker, jalankan dari host dengan `DATABASE_URL` yang mengarah ke container, atau:
```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U threevo -d threevo_db --format=custom > /var/backups/threevo/threevo_$(date +%F).dump
```

**Windows Task Scheduler:** program `powershell.exe`, argumen
`-NoProfile -File D:\path\scripts\backup-db.ps1 -BackupDir D:\backups\threevo`.

Salin juga backup ke lokasi lain (object storage / server lain) dan **backup folder `uploads`**.

**Restore:**
```bash
pg_restore --clean --if-exists --no-owner --dbname "postgresql://user:pass@host:5432/threevo_db" threevo_YYYYMMDD_HHMMSS.dump
```
Uji restore ke database terpisah secara berkala.

## 7. Monitoring

- **Uptime monitor** (UptimeRobot, Better Stack, dll.) ke `https://api.threevo.id/api/v1/health`
  tiap 1–5 menit. Endpoint mengembalikan **503** jika database tidak bisa dihubungi.
- **Log**: format JSON (pino). Docker: `docker compose logs -f api`; PM2: `pm2 logs`.
  Setiap request punya `X-Request-Id` untuk mencari log terkait.
- **Error tracking**: disarankan Sentry (`@sentry/node`). Ini dependency baru, jadi perlu
  disetujui dulu sebelum ditambahkan.
- Pantau ruang disk (upload + backup) dan masa berlaku SSL.

## 8. Catatan keamanan

- Firewall: buka hanya port 22, 80, 443 (`ufw allow OpenSSH && ufw allow 'Nginx Full' && ufw enable`).
- Login SSH dengan key, nonaktifkan login password & root.
- Ganti password super admin hasil seed setelah login pertama.
- Cache dan rate limit tersimpan di memori: jalankan **satu instance** atau pindah ke Redis.
- Cookie memakai `SameSite=Lax`. Subdomain lain di bawah `threevo.id` dianggap *same-site*,
  jadi jangan hosting konten yang tidak dipercaya di subdomain tersebut.
- `npm audit --audit-level=high` dijalankan di CI.
