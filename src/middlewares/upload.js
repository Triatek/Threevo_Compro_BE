import multer from 'multer';
import { env } from '../config/env.js';
import { BadRequestError } from '../utils/AppError.js';

// SVG is intentionally not allowed (can contain scripts).
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

/**
 * Parse a single image from multipart field `file` into memory (`req.file.buffer`).
 * The mimetype check here is only a first filter; the real content is verified
 * with sharp in the media service.
 */
export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: env.UPLOAD_MAX_SIZE_MB * 1024 * 1024,
    files: 1,
    fields: 5,
  },
  fileFilter(req, file, callback) {
    if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype)) {
      return callback(new BadRequestError('Format file tidak didukung. Gunakan JPG, PNG, atau WebP'));
    }
    callback(null, true);
  },
}).single('file');
