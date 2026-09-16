import { randomBytes } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { env } from '../src/config/env.js';
import { prisma } from '../src/lib/prisma.js';

const BCRYPT_COST = 12;

async function seedSuperAdmin() {
  let password = env.SEED_ADMIN_PASSWORD;
  let generated = false;

  if (!password) {
    if (env.isProduction) {
      throw new Error('SEED_ADMIN_PASSWORD is required in production');
    }
    password = randomBytes(12).toString('base64url');
    generated = true;
  }

  const existing = await prisma.user.findUnique({ where: { email: env.SEED_ADMIN_EMAIL } });
  if (existing) {
    console.log(`- Super admin ${env.SEED_ADMIN_EMAIL} already exists, skipped`);
    return existing;
  }

  const admin = await prisma.user.create({
    data: {
      name: env.SEED_ADMIN_NAME,
      email: env.SEED_ADMIN_EMAIL,
      passwordHash: await bcrypt.hash(password, BCRYPT_COST),
      role: 'SUPER_ADMIN',
    },
  });

  console.log(`- Super admin created: ${admin.email}`);
  if (generated) console.log(`  Generated password (save it now): ${password}`);
  return admin;
}

async function seedSettings() {
  const settings = [
    { key: 'company_name', value: 'Threevo' },
    { key: 'company_tagline', value: 'Solusi fulfillment & logistik terpercaya' },
    { key: 'contact_phone', value: '+62 21 0000 0000' },
    { key: 'contact_email', value: 'hello@threevo.id' },
    { key: 'contact_address', value: 'Jakarta, Indonesia' },
    { key: 'contact_maps_url', value: '' },
    { key: 'whatsapp_number', value: '6281200000000' },
    { key: 'whatsapp_message', value: 'Halo Threevo, saya ingin bertanya tentang layanan Anda.' },
    { key: 'social_instagram', value: '' },
    { key: 'social_linkedin', value: '' },
    { key: 'social_youtube', value: '' },
    { key: 'social_tiktok', value: '' },
    { key: 'tracking_url', value: '' },
    { key: 'footer_text', value: `© ${new Date().getFullYear()} Threevo. All rights reserved.` },
    { key: 'lead_notification_email', value: env.LEAD_NOTIFICATION_EMAIL ?? '', isPublic: false },
  ];

  for (const { key, value, isPublic = true } of settings) {
    // update: {} keeps values already changed by an admin.
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value, isPublic } });
  }
  console.log(`- ${settings.length} settings ensured`);
}

async function seedCategories() {
  const categories = [
    { name: 'Berita Perusahaan', slug: 'berita-perusahaan' },
    { name: 'Tips Logistik', slug: 'tips-logistik' },
    { name: 'Event', slug: 'event' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({ where: { slug: category.slug }, update: {}, create: category });
  }
  console.log(`- ${categories.length} categories ensured`);
}

async function seedServices() {
  const services = [
    {
      name: 'Warehouse Management System',
      slug: 'warehouse-management-system',
      shortDesc: 'Kelola stok, penerimaan, dan pengiriman barang di gudang secara real-time.',
      content: '<p>Sistem manajemen gudang untuk inbound, penyimpanan, picking, dan packing.</p>',
      isFeatured: true,
      sortOrder: 1,
    },
    {
      name: 'Transport Management System',
      slug: 'transport-management-system',
      shortDesc: 'Rencanakan dan pantau pengiriman dari gudang sampai ke pelanggan.',
      content: '<p>Sistem manajemen transportasi untuk penjadwalan armada dan pelacakan pengiriman.</p>',
      isFeatured: true,
      sortOrder: 2,
    },
    {
      name: 'Fulfillment',
      slug: 'fulfillment',
      shortDesc: 'Layanan end-to-end mulai dari penyimpanan, pengemasan, hingga pengiriman pesanan.',
      content: '<p>Serahkan operasional pesanan online Anda kepada tim fulfillment kami.</p>',
      isFeatured: true,
      sortOrder: 3,
    },
  ];

  for (const service of services) {
    await prisma.service.upsert({ where: { slug: service.slug }, update: {}, create: service });
  }
  console.log(`- ${services.length} services ensured`);
}

async function seedDevelopmentSamples(admin) {
  const locationName = 'Gudang Jakarta (Contoh)';
  const location = await prisma.location.findFirst({ where: { name: locationName } });
  if (!location) {
    await prisma.location.create({
      data: {
        name: locationName,
        type: 'WAREHOUSE',
        address: 'Jl. Contoh No. 1, Cakung',
        city: 'Jakarta Timur',
        province: 'DKI Jakarta',
        latitude: '-6.1833000',
        longitude: '106.9333000',
        phone: '+62 21 0000 0000',
      },
    });
  }

  const category = await prisma.category.findUnique({ where: { slug: 'berita-perusahaan' } });
  await prisma.article.upsert({
    where: { slug: 'selamat-datang-di-threevo' },
    update: {},
    create: {
      title: 'Selamat Datang di Threevo',
      slug: 'selamat-datang-di-threevo',
      excerpt: 'Contoh artikel draft untuk pengembangan.',
      content: '<p>Ini adalah contoh artikel. Ubah atau hapus dari panel admin.</p>',
      status: 'DRAFT',
      categoryId: category?.id,
      authorId: admin.id,
    },
  });
  console.log('- Development samples ensured (1 location, 1 draft article)');
}

async function main() {
  console.log(`Seeding database (${env.NODE_ENV})...`);
  const admin = await seedSuperAdmin();
  await seedSettings();
  await seedCategories();
  await seedServices();
  if (env.isDevelopment) await seedDevelopmentSamples(admin);
  console.log('Seeding finished');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
