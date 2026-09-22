import { describe, expect, it } from 'vitest';
import { buildPaginationMeta, getPagination, paginationSchema } from '../src/utils/pagination.js';
import { generateUniqueSlug, slugify } from '../src/utils/slug.js';

describe('slugify', () => {
  it.each([
    ['Warehouse Management System', 'warehouse-management-system'],
    ['Tips Logistik & Gudang: Édisi 2025!', 'tips-logistik-dan-gudang-edisi-2025'],
    ["Promo Jum'at Berkah", 'promo-jumat-berkah'],
    ['  --Halo   Dunia--  ', 'halo-dunia'],
    ['Café São Paulo', 'cafe-sao-paulo'],
    ['!!!', ''],
  ])('%s -> %s', (input, expected) => {
    expect(slugify(input)).toBe(expected);
  });

  it('respects maxLength without trailing dash', () => {
    expect(slugify('abc def ghi', { maxLength: 4 })).toBe('abc');
  });
});

describe('generateUniqueSlug', () => {
  it('appends -2, -3 when the slug is taken', async () => {
    const taken = new Set(['berita', 'berita-2']);
    const slug = await generateUniqueSlug('Berita', async (s) => taken.has(s));
    expect(slug).toBe('berita-3');
  });

  it('falls back to "item" for empty slugs', async () => {
    expect(await generateUniqueSlug('???', async () => false)).toBe('item');
  });
});

describe('pagination', () => {
  it('applies defaults and max limit', () => {
    expect(paginationSchema.parse({})).toEqual({ page: 1, limit: 10 });
    expect(paginationSchema.safeParse({ limit: '51' }).success).toBe(false);
    expect(paginationSchema.parse({ page: '3', limit: '20' })).toEqual({ page: 3, limit: 20 });
  });

  it('computes skip/take and meta', () => {
    expect(getPagination({ page: 3, limit: 10 })).toEqual({ skip: 20, take: 10 });
    expect(buildPaginationMeta({ page: 2, limit: 10, total: 25 })).toEqual({
      page: 2,
      limit: 10,
      total: 25,
      totalPages: 3,
      hasNextPage: true,
      hasPrevPage: true,
    });
    expect(buildPaginationMeta({ page: 1, limit: 10, total: 0 })).toMatchObject({
      totalPages: 0,
      hasNextPage: false,
      hasPrevPage: false,
    });
  });
});
