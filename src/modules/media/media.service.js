import sharp from 'sharp';
import { AuditAction, writeAuditLog } from '../../lib/audit.js';
import { logger } from '../../lib/logger.js';
import { prisma } from '../../lib/prisma.js';
import { storage } from '../../lib/storage.js';
import { AppError, BadRequestError, NotFoundError, ValidationError } from '../../utils/AppError.js';
import { buildPaginationMeta, getPagination } from '../../utils/pagination.js';

const ENTITY = 'Media';
const ALLOWED_FORMATS = new Set(['jpeg', 'png', 'webp']);
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 82;
// Protects against "decompression bomb" images (tiny file, huge dimensions).
const MAX_INPUT_PIXELS = 100_000_000;

const include = { uploadedBy: { select: { id: true, name: true } } };

/**
 * Verify the real file content and convert it to WebP.
 * Metadata (EXIF, GPS, ...) is dropped because sharp does not keep it by default.
 */
async function processImage(buffer) {
  try {
    const metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
    if (!ALLOWED_FORMATS.has(metadata.format)) {
      throw new BadRequestError('File bukan gambar JPG, PNG, atau WebP yang valid');
    }

    return await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS })
      .rotate() // apply EXIF orientation before metadata is removed
      .resize({ width: MAX_WIDTH, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toBuffer({ resolveWithObject: true });
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new BadRequestError('File bukan gambar yang valid atau rusak');
  }
}

export async function uploadMedia(actor, file, { alt }) {
  if (!file) {
    throw new ValidationError(undefined, [
      { location: 'body', field: 'file', message: 'File gambar wajib diunggah' },
    ]);
  }

  const { data, info } = await processImage(file.buffer);
  const { key, url } = await storage.save(data, { extension: 'webp' });

  let media;
  try {
    media = await prisma.media.create({
      data: {
        filename: key,
        originalName: file.originalname.slice(0, 255),
        url,
        mimeType: 'image/webp',
        size: info.size,
        width: info.width,
        height: info.height,
        alt: alt || null,
        uploadedById: actor.userId,
      },
      include,
    });
  } catch (err) {
    // Do not leave orphan files when the database write fails.
    await storage.remove(key).catch((removeErr) =>
      logger.error({ err: removeErr, key }, 'Failed to remove orphan upload'),
    );
    throw err;
  }

  await writeAuditLog(actor, {
    action: AuditAction.CREATE,
    entity: ENTITY,
    entityId: media.id,
    metadata: { filename: key, originalName: media.originalName },
  });
  return media;
}

export async function listMedia({ page, limit, q }) {
  const where = q
    ? {
        OR: [
          { originalName: { contains: q, mode: 'insensitive' } },
          { alt: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [items, total] = await prisma.$transaction([
    prisma.media.findMany({
      where,
      include,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...getPagination({ page, limit }),
    }),
    prisma.media.count({ where }),
  ]);
  return { items, meta: buildPaginationMeta({ page, limit, total }) };
}

export async function deleteMedia(actor, id) {
  const media = await prisma.media.findUnique({ where: { id } });
  if (!media) throw new NotFoundError('Media tidak ditemukan');

  await prisma.media.delete({ where: { id } });
  await storage.remove(media.filename);

  await writeAuditLog(actor, {
    action: AuditAction.DELETE,
    entity: ENTITY,
    entityId: id,
    metadata: { filename: media.filename },
  });
}
