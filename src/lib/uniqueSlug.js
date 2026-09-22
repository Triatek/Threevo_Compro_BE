import { ConflictError, ValidationError } from '../utils/AppError.js';
import { generateUniqueSlug, slugify } from '../utils/slug.js';
import { prisma } from './prisma.js';

/**
 * Resolve the slug for a record with a unique `slug` column.
 * - Explicit slug from the admin: normalized, 409 if already used.
 * - No slug: generated from `source` (title/name), "-2", "-3" appended when taken.
 * Soft-deleted rows still own their slug (unique index), so they count as taken.
 *
 * @param {string} model Prisma delegate name
 * @param {{ explicitSlug?: string, source?: string, excludeId?: number, maxLength?: number }} options
 */
export async function resolveSlug(model, { explicitSlug, source, excludeId, maxLength = 200 }) {
  const isTaken = async (slug) => {
    const found = await prisma[model].findUnique({ where: { slug }, select: { id: true } });
    return Boolean(found) && found.id !== excludeId;
  };

  if (explicitSlug) {
    const slug = slugify(explicitSlug, { maxLength });
    if (!slug) {
      throw new ValidationError(undefined, [{ field: 'slug', message: 'Slug tidak valid' }]);
    }
    if (await isTaken(slug)) {
      throw new ConflictError('Slug sudah digunakan', [
        { field: 'slug', message: 'Slug sudah digunakan' },
      ]);
    }
    return slug;
  }

  return generateUniqueSlug(source, isTaken, { maxLength });
}
