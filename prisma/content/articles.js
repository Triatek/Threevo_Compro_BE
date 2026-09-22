/**
 * Artikel contoh untuk pengembangan dan demo.
 *
 * Sengaja dipisah dari konten asli (`threevo.js`) karena ini data sementara.
 * Semua slug di bawah terdaftar, sehingga `npm run db:seed:articles -- --remove`
 * bisa menghapusnya kembali tanpa menyentuh artikel asli yang Anda tulis.
 *
 * Jumlahnya 12 agar paginasi di frontend (9 artikel per halaman) ikut teruji.
 */

/** Tanggal terbit dibuat menyebar supaya urutan dan paginasi terlihat nyata. */
const at = (isoDate) => new Date(`${isoDate}T09:00:00+07:00`);

export const sampleArticles = [
  {
    slug: 'threevo-resmi-beroperasi-dari-batununggal',
    title: 'Threevo Resmi Beroperasi dari Gudang Batununggal, Bandung',
    category: 'berita-perusahaan',
    publishedAt: at('2026-09-10'),
    excerpt:
      'Gudang pertama Threevo di Pasar Modern Batununggal mulai melayani brand dengan kapasitas penyimpanan, tim operasional, dan sistem pencatatan stok yang terintegrasi.',
    metaTitle: 'Threevo Beroperasi dari Gudang Batununggal Bandung',
    metaDescription:
      'Gudang pertama Threevo di Bandung mulai melayani brand dengan kapasitas penyimpanan dan tim operasional terintegrasi.',
    content: `
<p>Threevo resmi memulai operasional dari gudang pertamanya di Pasar Modern Batununggal, Bandung. Fasilitas ini menjadi pusat kegiatan fulfillment untuk brand-brand yang mempercayakan operasional gudangnya kepada kami.</p>
<h3>Apa saja yang tersedia</h3>
<ul>
  <li>Rak penyimpanan dengan pencatatan stok per unit</li>
  <li>Area penerimaan dan pemeriksaan barang masuk</li>
  <li>Meja packing dengan perlengkapan standar</li>
  <li>Koordinasi pengiriman dengan mitra logistik</li>
</ul>
<p>Setiap barang yang masuk melewati proses verifikasi sebelum dicatat ke sistem, sehingga jumlah di laporan selalu mencerminkan jumlah fisik di rak. Brand dapat meminta laporan stok berkala tanpa perlu datang ke lokasi.</p>
<p>Bagi brand yang ingin melihat langsung, kami membuka sesi kunjungan gudang setiap bulan. Hubungi tim kami untuk menjadwalkannya.</p>
`,
  },
  {
    slug: 'threevo-dan-sociatrax-satu-atap',
    title: 'Threevo dan Sociatrax: Operasional dan Kreatif dalam Satu Atap',
    category: 'berita-perusahaan',
    publishedAt: at('2026-08-28'),
    excerpt:
      'Dua kebutuhan yang selama ini ditangani vendor berbeda kini bisa diurus satu pintu: operasional commerce oleh Threevo, konten dan media sosial oleh Sociatrax.',
    content: `
<p>Banyak brand yang kami temui mengelola dua hubungan kerja sama sekaligus: satu untuk operasional gudang dan marketplace, satu lagi untuk konten media sosial. Keduanya jarang berbicara satu sama lain, dan brand yang menjadi penengah.</p>
<p>Melalui kemitraan dengan Sociatrax, divisi media sosial dan kreatif kami, kedua kebutuhan itu kini bisa diurus lewat satu pintu. Tim operasional dan tim kreatif duduk di koordinasi yang sama, sehingga kampanye tidak dijalankan saat stok menipis, dan foto produk tidak dibuat untuk barang yang belum siap dikirim.</p>
<h3>Yang berubah bagi brand</h3>
<ul>
  <li>Satu jadwal koordinasi, bukan dua</li>
  <li>Kalender konten menyesuaikan ketersediaan stok</li>
  <li>Aset visual marketplace disiapkan bersamaan dengan katalog produk</li>
</ul>
<p>Paket terintegrasi yang menggabungkan layanan keduanya tersedia dengan harga lebih hemat dibanding membeli terpisah.</p>
`,
  },
  {
    slug: 'lima-kesalahan-mengelola-stok',
    title: 'Lima Kesalahan Umum Brand Pemula dalam Mengelola Stok',
    category: 'tips-logistik',
    publishedAt: at('2026-09-02'),
    excerpt:
      'Kehabisan barang saat permintaan naik dan menumpuk barang yang tidak laku adalah dua sisi dari masalah yang sama: pencatatan yang tidak dipercaya.',
    metaTitle: 'Lima Kesalahan Brand Pemula Mengelola Stok',
    metaDescription:
      'Dari pencatatan manual sampai mengabaikan barang mati, ini lima kesalahan stok yang paling sering kami temui pada brand yang sedang bertumbuh.',
    content: `
<p>Dari brand-brand yang beralih ke Threevo, pola masalahnya sering berulang. Berikut lima yang paling sering kami temui.</p>
<h3>1. Mencatat stok di spreadsheet yang diperbarui sesekali</h3>
<p>Spreadsheet tidak salah, yang salah adalah memperbaruinya di akhir hari atau akhir pekan. Begitu ada selisih, tidak ada yang bisa melacak kapan selisih itu muncul.</p>
<h3>2. Tidak memisahkan stok siap jual dan stok bermasalah</h3>
<p>Barang retur, barang rusak, dan barang yang menunggu pemeriksaan sering dihitung bersama stok normal. Angkanya terlihat aman sampai pesanan tidak bisa dipenuhi.</p>
<h3>3. Mengabaikan barang yang tidak bergerak</h3>
<p>Barang yang tidak terjual selama berbulan-bulan tetap memakan tempat dan biaya. Tinjau pergerakan stok minimal sebulan sekali.</p>
<h3>4. Tidak punya angka stok minimum</h3>
<p>Tanpa ambang batas, keputusan restok selalu terlambat. Tentukan titik pemesanan ulang berdasarkan rata-rata penjualan dan waktu tunggu pemasok.</p>
<h3>5. Menunda pemeriksaan fisik</h3>
<p>Pencocokan stok fisik dengan catatan sebaiknya rutin, bukan hanya saat ada masalah. Semakin jarang dilakukan, semakin sulit menemukan sumber selisihnya.</p>
`,
  },
  {
    slug: 'cara-menghitung-safety-stock',
    title: 'Cara Menghitung Safety Stock agar Tidak Kehabisan Barang',
    category: 'tips-logistik',
    publishedAt: at('2026-08-19'),
    excerpt:
      'Safety stock bukan tebakan. Dengan data penjualan harian dan waktu tunggu pemasok, angkanya bisa dihitung dan disesuaikan tiap bulan.',
    content: `
<p>Safety stock adalah cadangan yang menahan Anda dari kehabisan barang ketika penjualan melonjak atau pemasok terlambat. Banyak brand menentukannya dengan perasaan, padahal angkanya bisa dihitung.</p>
<h3>Yang perlu Anda ketahui lebih dulu</h3>
<ul>
  <li>Rata-rata penjualan harian dalam 30 hari terakhir</li>
  <li>Penjualan harian tertinggi pada periode yang sama</li>
  <li>Waktu tunggu pemasok, dari pesan sampai barang masuk gudang</li>
  <li>Waktu tunggu terburuk yang pernah terjadi</li>
</ul>
<p>Cara paling sederhana: kalikan penjualan harian tertinggi dengan waktu tunggu terburuk, lalu kurangi dengan hasil kali penjualan rata-rata dan waktu tunggu normal. Selisihnya adalah cadangan yang perlu Anda simpan.</p>
<p>Angka ini bukan sekali jadi. Tinjau ulang setiap bulan, terutama menjelang periode penjualan tinggi ketika pola permintaan berubah cepat.</p>
`,
  },
  {
    slug: 'packing-benar-menekan-biaya-retur',
    title: 'Packing yang Benar Menekan Biaya Retur',
    category: 'tips-logistik',
    publishedAt: at('2026-07-30'),
    excerpt:
      'Biaya retur jarang dihitung utuh. Selain ongkos kirim balik, ada barang rusak, waktu tim, dan pelanggan yang tidak kembali.',
    content: `
<p>Retur karena barang rusak di perjalanan adalah biaya yang bisa ditekan, tapi sering diabaikan karena dianggap kecil. Padahal biaya sebenarnya bukan hanya ongkos kirim balik.</p>
<h3>Biaya yang jarang dihitung</h3>
<ul>
  <li>Ongkos kirim dua arah yang ditanggung brand</li>
  <li>Nilai barang yang tidak bisa dijual lagi</li>
  <li>Waktu tim untuk memeriksa dan memproses retur</li>
  <li>Pelanggan yang tidak kembali membeli</li>
</ul>
<p>Perbaikannya biasanya sederhana. Sesuaikan ukuran kardus dengan isinya agar barang tidak berguncang, beri pengisi pada ruang kosong, dan lapisi barang pecah belah dari segala sisi, bukan hanya atas dan bawah.</p>
<p>Catat juga alasan setiap retur. Setelah beberapa puluh kasus, polanya akan terlihat, dan Anda tahu persis produk mana yang perlu penanganan khusus.</p>
`,
  },
  {
    slug: 'kapan-berhenti-mengurus-gudang-sendiri',
    title: 'Kapan Saatnya Brand Berhenti Mengurus Gudang Sendiri',
    category: 'tips-logistik',
    publishedAt: at('2026-07-15'),
    excerpt:
      'Bukan soal jumlah pesanan semata. Tanda paling jelas adalah ketika waktu founder habis di gudang, bukan di pengembangan produk dan pasar.',
    content: `
<p>Pertanyaan ini hampir selalu muncul di titik yang sama: ketika pesanan sudah cukup banyak untuk melelahkan, tapi belum cukup besar untuk membenarkan tim gudang sendiri.</p>
<h3>Tanda yang perlu diperhatikan</h3>
<ul>
  <li>Packing memakan lebih dari separuh hari kerja tim inti</li>
  <li>Pesanan sering terlambat dikirim di hari ramai</li>
  <li>Selisih stok makin sering terjadi dan sulit ditelusuri</li>
  <li>Founder lebih banyak mengurus operasional daripada produk dan pasar</li>
</ul>
<p>Tanda terakhir yang paling menentukan. Gudang bisa ditambah orang, tapi waktu founder tidak bisa ditambah. Ketika visi produk tertunda karena urusan pengemasan, biayanya jauh lebih besar dari yang terlihat di pembukuan.</p>
<p>Menyerahkan operasional bukan berarti kehilangan kendali. Yang perlu dipastikan adalah Anda tetap mendapat laporan stok yang jelas dan bisa menelusuri setiap pesanan.</p>
`,
  },
  {
    slug: 'menyiapkan-operasional-menjelang-harbolnas',
    title: 'Menyiapkan Operasional Menjelang Harbolnas',
    category: 'tips-logistik',
    publishedAt: at('2026-06-26'),
    excerpt:
      'Persiapan yang dimulai seminggu sebelum kampanye hampir selalu terlambat. Ini urutan yang kami sarankan, dimulai dari enam minggu sebelumnya.',
    content: `
<p>Lonjakan pesanan pada hari belanja nasional menguji dua hal sekaligus: ketersediaan stok dan kecepatan pengemasan. Keduanya perlu disiapkan jauh sebelum kampanye dimulai.</p>
<h3>Enam minggu sebelumnya</h3>
<p>Tentukan produk yang akan dikampanyekan dan perkirakan jumlah penjualannya berdasarkan data periode ramai sebelumnya. Kirim pesanan ke pemasok sekarang, bukan nanti.</p>
<h3>Tiga minggu sebelumnya</h3>
<p>Pastikan stok sudah masuk gudang dan tercatat. Siapkan bahan pengemasan dalam jumlah berlebih, karena kehabisan kardus di hari puncak menghentikan semua pengiriman.</p>
<h3>Satu minggu sebelumnya</h3>
<p>Latih alur pengemasan dengan volume simulasi. Sepakati pembagian tugas dan jam kerja tambahan bersama tim, serta konfirmasi jadwal penjemputan dengan mitra logistik.</p>
<p>Setelah kampanye selesai, catat apa yang berjalan lancar dan apa yang tersendat. Catatan itu menjadi modal persiapan periode berikutnya.</p>
`,
  },
  {
    slug: 'kapasitas-gudang-bertambah',
    title: 'Kapasitas Gudang Threevo Bertambah Dua Kali Lipat',
    category: 'berita-perusahaan',
    publishedAt: at('2026-06-11'),
    excerpt:
      'Penambahan rak penyimpanan membuat kami bisa menerima lebih banyak brand, termasuk yang membutuhkan kapasitas lebih dari dua rak.',
    content: `
<p>Sejak beroperasi, permintaan kapasitas penyimpanan tumbuh lebih cepat dari perkiraan kami. Beberapa brand yang bergabung dengan paket Starter kini membutuhkan ruang jauh lebih besar.</p>
<p>Penambahan rak yang baru selesai membuat kapasitas gudang bertambah dua kali lipat. Brand yang sudah bergabung dapat menambah kapasitas tanpa perlu menunggu daftar antrean.</p>
<p>Penambahan kapasitas tersedia sebagai layanan tambahan dengan biaya per rak per bulan. Tim kami akan membantu memperkirakan kebutuhan ruang berdasarkan jumlah dan ukuran produk Anda.</p>
`,
  },
  {
    slug: 'tiga-paket-untuk-setiap-tahap-pertumbuhan',
    title: 'Tiga Paket Baru untuk Brand di Setiap Tahap Pertumbuhan',
    category: 'berita-perusahaan',
    publishedAt: at('2026-05-20'),
    excerpt:
      'Starter, Growth, dan Scale Up dirancang agar brand tidak membayar layanan yang belum dibutuhkan, tapi tetap bisa naik tingkat tanpa pindah vendor.',
    content: `
<p>Kebutuhan brand yang baru membuka toko marketplace berbeda jauh dari brand yang sudah menjalankan kampanye rutin. Karena itu layanan kami dibagi menjadi tiga paket.</p>
<h3>Starter</h3>
<p>Fokus pada fondasi: aktivasi toko, penataan katalog produk, dan dukungan operasional dasar. Cocok untuk brand yang baru memindahkan operasionalnya.</p>
<h3>Growth</h3>
<p>Menambahkan sales strategist, eksekusi kampanye, dan laporan performa bulanan. Untuk brand yang penjualannya sudah stabil dan siap dioptimalkan.</p>
<h3>Scale Up</h3>
<p>Tim operasional khusus, laporan mingguan, dan pengelolaan marketplace menyeluruh. Untuk brand dengan volume tinggi yang membutuhkan perhatian penuh.</p>
<p>Perpindahan antarpaket bisa dilakukan tanpa proses onboarding ulang. Rincian isi dan biaya setiap paket tersedia di halaman Paket dan Harga.</p>
`,
  },
  {
    slug: 'threevo-di-bandung-creative-week-2026',
    title: 'Threevo Hadir di Bandung Creative Week 2026',
    category: 'event',
    publishedAt: at('2026-05-05'),
    excerpt:
      'Kami membuka booth konsultasi operasional gratis selama tiga hari, khusus untuk brand lokal yang sedang menyiapkan penjualan online.',
    content: `
<p>Threevo akan hadir di Bandung Creative Week 2026 dengan booth konsultasi operasional. Selama tiga hari acara, tim kami siap membahas tantangan operasional yang sedang Anda hadapi, tanpa biaya.</p>
<h3>Yang bisa Anda tanyakan</h3>
<ul>
  <li>Menyiapkan toko marketplace dari nol</li>
  <li>Menghitung kebutuhan kapasitas gudang</li>
  <li>Menyusun alur pengemasan dan pengiriman</li>
  <li>Memilih paket yang sesuai tahap bisnis Anda</li>
</ul>
<p>Tidak perlu mendaftar lebih dulu, tapi sesi dengan janji temu akan diprioritaskan. Hubungi kami lewat WhatsApp untuk memesan slot.</p>
`,
  },
  {
    slug: 'workshop-menyiapkan-toko-marketplace',
    title: 'Workshop: Menyiapkan Toko Marketplace dari Nol',
    category: 'event',
    publishedAt: at('2026-04-14'),
    excerpt:
      'Sesi setengah hari untuk brand yang belum pernah berjualan di marketplace, mulai dari pendaftaran toko sampai pesanan pertama siap dikirim.',
    content: `
<p>Workshop ini dirancang untuk brand yang produknya sudah siap tetapi belum pernah membuka toko di marketplace. Pesertanya dibatasi agar setiap orang bisa dibimbing langsung.</p>
<h3>Materi</h3>
<ul>
  <li>Pendaftaran dan verifikasi toko</li>
  <li>Menyusun judul dan deskripsi produk yang mudah ditemukan</li>
  <li>Menyiapkan foto produk dengan perlengkapan seadanya</li>
  <li>Mengatur ongkos kirim dan pilihan kurir</li>
  <li>Alur pesanan pertama sampai barang dikirim</li>
</ul>
<p>Peserta diharapkan membawa laptop dan data produk yang akan dijual, agar toko bisa langsung dibuat di tempat.</p>
`,
  },
  {
    slug: 'buka-gudang-sesi-kunjungan-mitra',
    title: 'Buka Gudang: Sesi Kunjungan untuk Calon Mitra',
    category: 'event',
    publishedAt: at('2026-03-18'),
    excerpt:
      'Melihat langsung tempat barang Anda akan disimpan sering lebih meyakinkan daripada membaca proposal. Kami membuka kunjungan gudang setiap bulan.',
    content: `
<p>Menyerahkan stok kepada pihak lain adalah keputusan yang tidak mudah. Karena itu kami membuka sesi kunjungan gudang rutin, supaya calon mitra bisa melihat sendiri bagaimana barang ditangani.</p>
<h3>Yang akan Anda lihat</h3>
<ul>
  <li>Alur barang masuk, dari penerimaan sampai masuk rak</li>
  <li>Cara stok dicatat dan dicocokkan</li>
  <li>Proses pengemasan dan penyerahan ke kurir</li>
  <li>Penanganan barang retur</li>
</ul>
<p>Sesi berlangsung sekitar satu jam dan diakhiri diskusi singkat mengenai kebutuhan spesifik brand Anda. Silakan hubungi tim kami untuk menjadwalkan.</p>
`,
  },
];

/** Slug artikel contoh, dipakai perintah penghapusan agar artikel asli aman. */
export const SAMPLE_ARTICLE_SLUGS = sampleArticles.map((article) => article.slug);
