/**
 * Turn any text into a URL friendly slug.
 * "Tips Logistik & Gudang: Édisi 2025!" -> "tips-logistik-dan-gudang-edisi-2025"
 */
export function slugify(text, { maxLength = 200 } = {}) {
  return String(text ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .toLowerCase()
    .replace(/&/g, ' dan ')
    .replace(/['’]/g, '') // "Jum'at" -> "jumat"
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, maxLength)
    .replace(/-+$/, '');
}

/**
 * Build a slug that does not exist yet by appending -2, -3, ...
 * @param {string} text source text (title/name) or desired slug
 * @param {(slug: string) => Promise<boolean>} exists checks whether a slug is taken
 */
export async function generateUniqueSlug(text, exists, { maxLength = 200 } = {}) {
  const base = slugify(text, { maxLength: maxLength - 6 }) || 'item';
  let candidate = base;
  let counter = 2;
  while (await exists(candidate)) {
    candidate = `${base}-${counter}`;
    counter += 1;
  }
  return candidate;
}
