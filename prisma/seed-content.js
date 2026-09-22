/**
 * Mengisi konten asli Threevo dari company profile 2026.
 *
 * Terpisah dari `seed.js` (yang hanya memastikan struktur dasar ada) karena
 * script ini sengaja MENIMPA isi layanan dan settings setiap kali dijalankan,
 * sehingga aman diulang saat konten diperbarui.
 *
 * Jalankan: npm run db:seed:content
 */
import { prisma } from '../src/lib/prisma.js';
import { sanitizeRichText } from '../src/lib/sanitize.js';
import { SETTING_DEFINITIONS } from '../src/modules/settings/settings.schema.js';
import {
  OBSOLETE_LOCATION_NAMES,
  OBSOLETE_SERVICE_SLUGS,
  locations,
  pricingPage,
  services,
  settings,
} from './content/threevo.js';

async function upsertService({ slug, content, ...data }) {
  // Disanitasi seperti endpoint admin, supaya isi yang tersimpan identik
  // dengan hasil input lewat panel admin dan tag terlarang ketahuan sejak awal.
  const clean = sanitizeRichText(content.trim());
  const removed = content.trim().length - clean.length;
  if (removed > 0) {
    console.warn(`  Peringatan: ${removed} karakter dibuang sanitizer pada "${data.name}"`);
  }

  const payload = { ...data, content: clean, isActive: true };

  await prisma.service.upsert({
    where: { slug },
    // Sengaja menimpa: berkas konten adalah sumber kebenarannya.
    // `deletedAt: null` memulihkan layanan yang sempat di-soft delete.
    update: { ...payload, deletedAt: null },
    create: { slug, ...payload },
  });

  console.log(`- Layanan "${data.name}" diperbarui`);
}

/**
 * Menonaktifkan layanan bawaan seed lama yang tidak lagi relevan.
 * Memakai soft delete: barisnya tetap ada di database dan bisa dipulihkan
 * dengan mengosongkan kembali kolom `deleted_at`.
 */
async function retireObsoleteServices() {
  const { count } = await prisma.service.updateMany({
    where: { slug: { in: OBSOLETE_SERVICE_SLUGS }, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });

  if (count > 0) {
    console.log(`- ${count} layanan bawaan seed lama dinonaktifkan (soft delete, dapat dipulihkan)`);
  }
}

/**
 * Lokasi tidak punya kolom unik selain id, jadi pencocokannya lewat nama.
 * Yang lama dinonaktifkan (isActive: false), bukan dihapus, supaya tetap
 * terlihat di panel admin dan bisa dipulihkan.
 */
async function applyLocations() {
  for (const location of locations) {
    const existing = await prisma.location.findFirst({ where: { name: location.name } });

    if (existing) {
      await prisma.location.update({
        where: { id: existing.id },
        data: { ...location, isActive: true },
      });
    } else {
      await prisma.location.create({ data: { ...location, isActive: true } });
    }
  }
  console.log(`- ${locations.length} lokasi diperbarui`);

  const { count } = await prisma.location.updateMany({
    where: { name: { in: OBSOLETE_LOCATION_NAMES }, isActive: true },
    data: { isActive: false },
  });
  if (count > 0) console.log(`- ${count} lokasi contoh lama dinonaktifkan`);
}

/** Menulis settings setelah divalidasi dengan skema yang dipakai endpoint admin. */
async function applySettings() {
  for (const [key, value] of Object.entries(settings)) {
    const definition = SETTING_DEFINITIONS[key];
    if (!definition) throw new Error(`Setting tidak dikenal: ${key}`);

    const parsed = definition.schema.safeParse(value);
    if (!parsed.success) {
      throw new Error(`Nilai setting "${key}" ditolak: ${parsed.error.issues[0].message}`);
    }

    await prisma.setting.upsert({
      where: { key },
      update: { value: parsed.data },
      create: { key, value: parsed.data, isPublic: definition.isPublic },
    });
  }

  console.log(`- ${Object.keys(settings).length} settings diperbarui`);
}

async function main() {
  console.log('Mengisi konten Threevo dari company profile...');

  await applySettings();
  await applyLocations();
  for (const service of services) await upsertService(service);
  await upsertService(pricingPage);
  await retireObsoleteServices();

  console.log('Selesai. Restart server agar cache endpoint publik ikut tersegarkan.');
}

main()
  .catch((err) => {
    console.error('Gagal mengisi konten:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
