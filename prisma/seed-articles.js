/**
 * Mengisi artikel contoh untuk pengembangan dan demo.
 *
 * Jalankan:
 *   npm run db:seed:articles              isi / perbarui artikel contoh
 *   npm run db:seed:articles -- --remove  hapus kembali artikel contoh
 *
 * Penghapusan hanya menyentuh slug yang terdaftar di `content/articles.js`,
 * jadi artikel yang Anda tulis sendiri tidak ikut terhapus.
 */
import { prisma } from '../src/lib/prisma.js';
import { sanitizeRichText } from '../src/lib/sanitize.js';
import { SAMPLE_ARTICLE_SLUGS, sampleArticles } from './content/articles.js';

async function resolveCategoryIds() {
  const categories = await prisma.category.findMany({ select: { id: true, slug: true } });
  return new Map(categories.map((category) => [category.slug, category.id]));
}

async function resolveAuthorId() {
  const admin = await prisma.user.findFirst({
    where: { role: 'SUPER_ADMIN' },
    orderBy: { id: 'asc' },
    select: { id: true },
  });
  return admin?.id ?? null;
}

async function seed() {
  const categoryIds = await resolveCategoryIds();
  const authorId = await resolveAuthorId();

  for (const { slug, category, content, ...data } of sampleArticles) {
    const categoryId = categoryIds.get(category);
    if (!categoryId) {
      console.warn(`- Lewati "${slug}": kategori "${category}" belum ada`);
      continue;
    }

    const payload = {
      ...data,
      content: sanitizeRichText(content.trim()),
      status: 'PUBLISHED',
      categoryId,
      authorId,
    };

    await prisma.article.upsert({
      where: { slug },
      // viewCount sengaja tidak ikut ditimpa agar angka kunjungan tidak kembali nol.
      update: { ...payload, deletedAt: null },
      create: { slug, ...payload },
    });
  }

  console.log(`- ${sampleArticles.length} artikel contoh siap`);
}

async function remove() {
  const { count } = await prisma.article.deleteMany({
    where: { slug: { in: SAMPLE_ARTICLE_SLUGS } },
  });
  console.log(`- ${count} artikel contoh dihapus`);
}

async function main() {
  const isRemoving = process.argv.includes('--remove');

  if (isRemoving) {
    console.log('Menghapus artikel contoh...');
    await remove();
  } else {
    console.log('Mengisi artikel contoh...');
    await seed();
  }

  console.log('Selesai. Restart server agar cache endpoint publik ikut tersegarkan.');
}

main()
  .catch((err) => {
    console.error('Gagal:', err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
