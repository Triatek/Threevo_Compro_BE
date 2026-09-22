/**
 * Konten asli Threevo, disalin dari company profile 2026.
 *
 * Hanya data; logika penulisannya ada di `prisma/seed-content.js`.
 * HTML memakai tag yang lolos `sanitizeRichText` (heading, paragraf, daftar,
 * dan tabel) tanpa atribut class, supaya penataannya sepenuhnya diatur CSS
 * frontend dan tetap rapi bila nanti disunting lewat panel admin.
 */

/** Slug bawaan seed lama yang tidak lagi mencerminkan layanan Threevo. */
export const OBSOLETE_SERVICE_SLUGS = [
  'warehouse-management-system',
  'transport-management-system',
  'fulfillment',
];

export const settings = {
  company_name: 'Threevo',
  company_tagline: 'Powering Commerce Operations',
  contact_phone: '0856-956-565-168',
  contact_email: 'admin@triatekcorp.com',
  contact_address: 'Pasar Modern Batununggal RE 05, Bandung, Jawa Barat, Indonesia',
  whatsapp_number: '62856956565168',
  whatsapp_message: 'Halo Threevo, saya ingin berkonsultasi tentang layanan Anda.',
  footer_text: 'Threevo. Seluruh hak cipta dilindungi.',
};

export const services = [
  {
    slug: 'marketplace-management',
    name: 'Marketplace Management',
    icon: 'store',
    isFeatured: true,
    sortOrder: 1,
    shortDesc:
      'Pengelolaan toko marketplace menyeluruh: operasional strategis, manajemen produk, eksekusi kampanye, dan pertumbuhan berbasis data.',
    metaTitle: 'Marketplace Management - Threevo',
    metaDescription:
      'Kelola toko marketplace Anda bersama Threevo: setup toko, manajemen katalog, eksekusi kampanye, dan optimasi penjualan berbasis data.',
    content: `
<p>Kami mengelola toko marketplace Anda dari hulu ke hilir, mulai dari aktivasi toko sampai optimasi penjualan berkelanjutan. Tujuannya satu: performa toko naik tanpa Anda harus mengurus operasional hariannya.</p>

<h2>Tiga pilihan paket</h2>

<h3>Starter Plan - Marketplace Foundation</h3>
<p>Membangun fondasi marketplace yang kuat lewat setup toko, manajemen katalog produk, dukungan operasional, dan proses yang terstandar, agar bisnis Anda siap bertumbuh.</p>

<h3>Growth Plan - Marketplace Optimization</h3>
<p>Memperkuat performa marketplace dengan manajemen operasional yang lebih dalam, eksekusi kampanye, optimasi penjualan, dan perbaikan berbasis data yang meningkatkan efisiensi sekaligus pengalaman pelanggan.</p>

<h3>Scale Up Plan - Commerce Growth Partnership</h3>
<p>Solusi marketplace menyeluruh yang memadukan keunggulan operasional, strategi pertumbuhan, optimasi perangkat pemasaran, dan pembenahan berkelanjutan untuk memaksimalkan pertumbuhan penjualan.</p>

<h2>Perbandingan isi paket</h2>
<table>
  <thead>
    <tr>
      <th scope="col">Cakupan</th>
      <th scope="col">Starter</th>
      <th scope="col">Growth</th>
      <th scope="col">Scale Up</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Fokus layanan</th>
      <td>Aktivasi marketplace dan setup toko</td>
      <td>Optimasi customer journey</td>
      <td>Manajemen marketplace menyeluruh</td>
    </tr>
    <tr>
      <th scope="row">Kapasitas gudang</th>
      <td>Setengah rak</td>
      <td>1 rak</td>
      <td>2 rak</td>
    </tr>
    <tr>
      <th scope="row">Dukungan operasional</th>
      <td>Wi-Fi, listrik, perangkat operasional</td>
      <td>Wi-Fi, listrik, perangkat operasional</td>
      <td>Wi-Fi, listrik, perangkat operasional</td>
    </tr>
    <tr>
      <th scope="row">Tim operasional</th>
      <td>Tim entry</td>
      <td>Tim sharing</td>
      <td>Tim dedicated</td>
    </tr>
    <tr>
      <th scope="row">Marketplace admin</th>
      <td>Ya</td>
      <td>Ya</td>
      <td>Ya</td>
    </tr>
    <tr>
      <th scope="row">Packing staff</th>
      <td>Ya</td>
      <td>Ya</td>
      <td>Ya</td>
    </tr>
    <tr>
      <th scope="row">Sales strategist</th>
      <td>Tidak termasuk</td>
      <td>Ya</td>
      <td>Ya</td>
    </tr>
    <tr>
      <th scope="row">Laporan performa</th>
      <td>Tidak termasuk</td>
      <td>Bulanan</td>
      <td>Mingguan</td>
    </tr>
    <tr>
      <th scope="row">Rekomendasi strategis</th>
      <td>Tidak termasuk</td>
      <td>Ya</td>
      <td>Ya</td>
    </tr>
  </tbody>
</table>

<p>Rincian biaya setiap paket ada di halaman Paket dan Harga.</p>
`,
  },
  {
    slug: 'warehouse-fulfillment',
    name: 'Warehouse Fulfillment',
    icon: 'package',
    isFeatured: true,
    sortOrder: 2,
    shortDesc:
      'Solusi fulfillment yang merapikan manajemen stok, pemrosesan pesanan, pengemasan, dan pengiriman agar operasional efisien dan tepat waktu.',
    metaTitle: 'Warehouse Fulfillment - Threevo',
    metaDescription:
      'Layanan fulfillment Threevo: manajemen inventori real-time, pemrosesan pesanan, koordinasi pengiriman, penanganan retur, dan pelaporan stok.',
    content: `
<p>Serahkan operasional gudang kepada tim kami. Dari barang masuk sampai pesanan diterima pelanggan, semua ditangani dengan proses yang terukur dan tercatat.</p>

<h2>Cakupan layanan</h2>

<h3>Inventory Management</h3>
<p>Pemantauan stok real-time, pengendalian persediaan, dan penataan gudang untuk memastikan ketersediaan produk serta akurasi operasional.</p>

<h3>Order Fulfillment</h3>
<p>Picking, packing, dan pemrosesan pesanan yang cepat dan akurat demi pengalaman pelanggan yang mulus.</p>

<h3>Shipping dan Delivery Coordination</h3>
<p>Koordinasi dengan mitra logistik tepercaya agar pengiriman tepat waktu, aman, dan hemat biaya.</p>

<h3>Return Management</h3>
<p>Penanganan retur, penukaran, dan logistik balik yang efisien sambil menjaga akurasi persediaan.</p>

<h3>Inventory Reporting</h3>
<p>Pelaporan stok berkala dan wawasan persediaan untuk mendukung perencanaan dan pengambilan keputusan operasional.</p>

<h3>Value-Added Services</h3>
<p>Pelabelan produk dan pengemasan khusus sesuai kebutuhan bisnis Anda.</p>
`,
  },
  {
    slug: 'social-media-management',
    name: 'Social Media Management',
    icon: 'megaphone',
    isFeatured: true,
    sortOrder: 3,
    shortDesc:
      'Dikelola Sociatrax, divisi kreatif Threevo: konten strategis, produksi kreatif, dan manajemen brand digital yang menggerakkan engagement.',
    metaTitle: 'Social Media Management oleh Sociatrax - Threevo',
    metaDescription:
      'Sociatrax, divisi kreatif Threevo, menangani produksi konten, strategi media sosial, manajemen KOL, editing, dan pelaporan performa.',
    content: `
<p>Threevo bermitra dengan <strong>Sociatrax</strong>, divisi media sosial dan kreatif kami, untuk menghadirkan konten strategis, produksi kreatif, dan pengelolaan brand digital yang memperkuat kehadiran online sekaligus mendorong engagement yang bermakna.</p>

<h2>Cakupan layanan</h2>

<h3>Content Production</h3>
<p>Pembuatan konten profesional yang disesuaikan dengan identitas brand Anda, mencakup konsep kreatif, pemotretan, dan aset visual yang menarik.</p>

<h3>Social Media Strategy</h3>
<p>Perencanaan konten berbasis data, analisis audiens, optimasi platform, dan pemantauan performa untuk membangun kehadiran media sosial yang berkelanjutan.</p>

<h3>KOL dan Influencer Management</h3>
<p>Perencanaan strategis, pencarian, negosiasi, dan pengelolaan kampanye bersama Key Opinion Leader serta influencer untuk memperluas jangkauan dan kredibilitas brand.</p>

<h3>Photo Editing</h3>
<p>Retouching foto berkualitas tinggi dan penyempurnaan visual agar setiap gambar mencerminkan estetika brand yang konsisten dan premium.</p>

<h3>Video Editing</h3>
<p>Editing video profesional untuk Reels, TikTok, Shorts, dan platform digital lain, dioptimalkan untuk memaksimalkan engagement dan retensi audiens.</p>

<h3>Performance Reporting</h3>
<p>Laporan bulanan menyeluruh berisi wawasan yang dapat ditindaklanjuti, analisis performa konten, pertumbuhan audiens, dan rekomendasi strategis.</p>

<p>Rincian paket Lite, Silver, Gold, dan Platinum beserta biayanya ada di halaman Paket dan Harga.</p>
`,
  },
];

/**
 * Halaman harga disimpan sebagai satu record Service ber-slug `paket-harga`.
 * `isFeatured: false` menjaganya keluar dari GET /site, dan frontend menyaring
 * slug ini dari daftar di halaman Layanan.
 */
export const pricingPage = {
  slug: 'paket-harga',
  name: 'Paket dan Harga',
  icon: 'receipt',
  isFeatured: false,
  sortOrder: 99,
  shortDesc:
    'Rincian lengkap biaya paket marketplace, social media management, kampanye influencer, dan paket terintegrasi Threevo.',
  metaTitle: 'Paket dan Harga - Threevo',
  metaDescription:
    'Daftar harga lengkap layanan Threevo: paket marketplace mulai Rp 3.332.000 per bulan, paket social media Sociatrax, dan paket terintegrasi.',
  content: `
<p>Seluruh harga di bawah berlaku per bulan kecuali disebutkan lain, belum termasuk PPN, dan mensyaratkan komitmen berlangganan minimal <strong>3 bulan</strong> agar implementasi berjalan efektif dan hasilnya terukur.</p>

<h2>Total investasi bulanan</h2>
<table>
  <thead>
    <tr>
      <th scope="col">Komponen</th>
      <th scope="col">Starter</th>
      <th scope="col">Growth</th>
      <th scope="col">Scale Up</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Paket marketplace</th>
      <td>Rp 2.950.000</td>
      <td>Rp 6.185.000</td>
      <td>Rp 9.785.000</td>
    </tr>
    <tr>
      <th scope="row">Biaya manajemen operasional</th>
      <td>Rp 382.000</td>
      <td>Rp 930.000</td>
      <td>Rp 1.762.000</td>
    </tr>
    <tr>
      <th scope="row">Total investasi bulanan</th>
      <td>Rp 3.332.000</td>
      <td>Rp 7.115.000</td>
      <td>Rp 11.547.000</td>
    </tr>
  </tbody>
</table>

<h2>Biaya onboarding</h2>
<p>Biaya sekali bayar sebesar <strong>Rp 2.450.000</strong> untuk memastikan persiapan berjalan lancar sebelum operasional dimulai. Mencakup pemuatan stok awal, setup toko marketplace, serta verifikasi stok dan pengecekan inventori. Ongkos kirim tidak termasuk.</p>

<h2>Biaya manajemen operasional</h2>
<p>Mencakup pengawasan strategis dan pengelolaan operasional harian: manajemen akun strategis, pemantauan performa marketplace, koordinasi operasional, optimasi bisnis dan penjualan, pelaporan performa, serta konsultasi dan perbaikan berkelanjutan.</p>

<h2>Layanan tambahan marketplace</h2>
<table>
  <thead>
    <tr>
      <th scope="col">Layanan</th>
      <th scope="col">Biaya</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Kapasitas gudang tambahan</th>
      <td>Rp 500.000 per rak per bulan</td>
    </tr>
    <tr>
      <th scope="row">Manajemen iklan marketplace</th>
      <td>10 persen dari budget iklan klien</td>
    </tr>
    <tr>
      <th scope="row">Marketplace admin tambahan - entry</th>
      <td>Rp 1.900.000 per bulan</td>
    </tr>
    <tr>
      <th scope="row">Marketplace admin tambahan - shared</th>
      <td>Rp 2.400.000 per bulan</td>
    </tr>
    <tr>
      <th scope="row">Marketplace admin tambahan - dedicated</th>
      <td>Rp 5.000.000 per bulan</td>
    </tr>
  </tbody>
</table>
<p>Manajemen iklan mencakup penyiapan kampanye, alokasi budget, pemantauan, optimasi performa, dan laporan iklan dasar.</p>

<h2>Paket social media management</h2>
<p>Dikelola oleh Sociatrax. Harga belum termasuk biaya model, studio atau lokasi pemotretan, dan akomodasi.</p>
<table>
  <thead>
    <tr>
      <th scope="col">Cakupan</th>
      <th scope="col">Lite</th>
      <th scope="col">Silver</th>
      <th scope="col">Gold</th>
      <th scope="col">Platinum</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Biaya per bulan</th>
      <td>Rp 2.750.000</td>
      <td>Rp 4.250.000</td>
      <td>Rp 5.950.000</td>
      <td>Rp 7.950.000</td>
    </tr>
    <tr>
      <th scope="row">Jumlah konten</th>
      <td>9 post statis</td>
      <td>12 post statis dan carousel</td>
      <td>21 post (16 foto, 4 video)</td>
      <td>30 post (22 foto, 8 video)</td>
    </tr>
    <tr>
      <th scope="row">Produksi konten</th>
      <td>Aset disediakan brand</td>
      <td>1x (styling atau detail produk)</td>
      <td>2x (Silver ditambah on model)</td>
      <td>3x (Gold ditambah campaign)</td>
    </tr>
    <tr>
      <th scope="row">Editing konten</th>
      <td>Basic (retone dan crop)</td>
      <td>Standard (Lite ditambah desain grafis)</td>
      <td>Advance (Silver ditambah FX dan transisi)</td>
      <td>Premium (Gold ditambah cinematic look)</td>
    </tr>
    <tr>
      <th scope="row">Katalog produk</th>
      <td>10 produk (4 look)</td>
      <td>10 produk (4 look)</td>
      <td>15 produk (4 look)</td>
      <td>15 produk (4 look)</td>
    </tr>
    <tr>
      <th scope="row">Dukungan marketplace</th>
      <td>Tidak termasuk</td>
      <td>4 aset banner</td>
      <td>8 aset (6 banner, 2 video)</td>
      <td>12 aset (8 banner, 4 video)</td>
    </tr>
    <tr>
      <th scope="row">Revisi minor</th>
      <td>1x</td>
      <td>2x</td>
      <td>4x</td>
      <td>5x</td>
    </tr>
    <tr>
      <th scope="row">Revisi rencana konten</th>
      <td>Tidak termasuk</td>
      <td>Tidak termasuk</td>
      <td>1x</td>
      <td>1x</td>
    </tr>
  </tbody>
</table>

<h2>Manajemen kampanye influencer</h2>
<table>
  <thead>
    <tr>
      <th scope="col">Paket</th>
      <th scope="col">Biaya per kampanye</th>
      <th scope="col">Cakupan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Starter</th>
      <td>Rp 750.000</td>
      <td>Rekomendasi KOL hingga 5 profil, outreach dan negosiasi, koordinasi kampanye, dukungan persetujuan konten</td>
    </tr>
    <tr>
      <th scope="row">Growth</th>
      <td>Rp 1.500.000</td>
      <td>Rekomendasi KOL hingga 10 profil, seleksi dan negosiasi, penyusunan brief, review konten, pemantauan kampanye, laporan performa</td>
    </tr>
    <tr>
      <th scope="row">Enterprise</th>
      <td>Mulai Rp 3.000.000</td>
      <td>Sourcing KOL tanpa batas, pengelolaan kampanye menyeluruh, kontrak dan negosiasi, persetujuan konten, pemantauan, analisis performa, laporan dan rekomendasi</td>
    </tr>
  </tbody>
</table>
<p>Fee KOL tidak termasuk dalam biaya di atas.</p>

<h2>Paket terintegrasi</h2>
<p>Gabungan operasional commerce Threevo dengan keahlian kreatif Sociatrax, dengan harga yang lebih hemat dibanding membeli terpisah.</p>
<table>
  <thead>
    <tr>
      <th scope="col">Kombinasi</th>
      <th scope="col">Harga per bulan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Threevo Starter dan Sociatrax Lite</th>
      <td>Rp 5.250.000</td>
    </tr>
    <tr>
      <th scope="row">Threevo Starter dan Sociatrax Silver</th>
      <td>Rp 6.750.000</td>
    </tr>
    <tr>
      <th scope="row">Threevo Growth dan Sociatrax Lite</th>
      <td>Rp 8.500.000</td>
    </tr>
    <tr>
      <th scope="row">Threevo Growth dan Sociatrax Silver</th>
      <td>Rp 10.000.000</td>
    </tr>
    <tr>
      <th scope="row">Threevo Scale Up dan Sociatrax Gold</th>
      <td>Rp 15.000.000</td>
    </tr>
    <tr>
      <th scope="row">Threevo Scale Up dan Sociatrax Platinum</th>
      <td>Rp 17.000.000</td>
    </tr>
  </tbody>
</table>

<h2>Keuntungan komitmen jangka panjang</h2>

<h3>Paket marketplace</h3>
<table>
  <thead>
    <tr>
      <th scope="col">Skema</th>
      <th scope="col">Komitmen 6 bulan</th>
      <th scope="col">Komitmen 12 bulan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Kontrak</th>
      <td>Diskon 50 persen biaya onboarding, gratis 1x paket Lite social media senilai Rp 2.500.000</td>
      <td>Gratis biaya onboarding, gratis 2x paket Lite social media senilai Rp 5.000.000</td>
    </tr>
    <tr>
      <th scope="row">Pembayaran penuh di muka</th>
      <td>Diskon 50 persen biaya onboarding, gratis 1x paket Silver social media senilai Rp 4.250.000, gratis 2x KOL nano influencer</td>
      <td>Gratis biaya onboarding, gratis 2x paket Silver social media senilai Rp 8.500.000, gratis 4x KOL nano influencer</td>
    </tr>
  </tbody>
</table>

<h3>Paket social media</h3>
<table>
  <thead>
    <tr>
      <th scope="col">Skema</th>
      <th scope="col">Komitmen 6 bulan</th>
      <th scope="col">Komitmen 12 bulan</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th scope="row">Kontrak</th>
      <td>Gratis 5 katalog produk dan 2 produksi video senilai Rp 1.025.000</td>
      <td>Gratis 5 katalog produk, 2 produksi video, dan 5 produksi foto senilai Rp 1.525.000</td>
    </tr>
    <tr>
      <th scope="row">Pembayaran penuh di muka</th>
      <td>Tambahan gratis 1x manajemen kampanye influencer paket Growth, total senilai Rp 2.525.000</td>
      <td>Tambahan gratis 2x manajemen kampanye influencer paket Growth, total senilai Rp 4.525.000</td>
    </tr>
  </tbody>
</table>
<p>Fee KOL tidak termasuk.</p>
`,
};

/** Lokasi contoh bawaan seed lama yang bukan alamat Threevo sebenarnya. */
export const OBSOLETE_LOCATION_NAMES = ['Gudang Jakarta (Contoh)'];

/**
 * Lokasi Threevo.
 *
 * Koordinat sengaja dikosongkan karena titik pastinya belum diketahui;
 * menaruh koordinat kira-kira akan menempatkan penanda peta di tempat yang
 * keliru. Selama kosong, frontend memakai `mapsUrl` sebagai tautan peta.
 * Isi `latitude`/`longitude` lewat panel admin bila titik pastinya sudah ada.
 */
export const locations = [
  {
    name: 'Gudang & Kantor Threevo Bandung',
    type: 'WAREHOUSE',
    address: 'Pasar Modern Batununggal RE 05',
    city: 'Bandung',
    province: 'Jawa Barat',
    phone: '0856-956-565-168',
    mapsUrl:
      'https://www.google.com/maps/search/?api=1&query=Pasar%20Modern%20Batununggal%2C%20Bandung',
    latitude: null,
    longitude: null,
    sortOrder: 1,
  },
];
