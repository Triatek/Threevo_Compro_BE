/** UTF-8 byte order mark so Excel detects the encoding correctly. */
export const UTF8_BOM = '﻿';

// Cells starting with these characters can be executed as formulas by spreadsheet apps.
const FORMULA_PREFIX = /^[=+\-@\t\r]/;

export function escapeCsvCell(value) {
  if (value == null) return '';
  let text = value instanceof Date ? value.toISOString() : String(value);

  // Prevent CSV/formula injection.
  if (FORMULA_PREFIX.test(text)) text = `'${text}`;

  if (/[",\r\n]/.test(text)) {
    text = `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * @param {string[]} headers
 * @param {Array<Array<unknown>>} rows
 * @returns {string} CSV with BOM and CRLF line endings
 */
export function toCsv(headers, rows) {
  const lines = [headers, ...rows].map((row) => row.map(escapeCsvCell).join(','));
  return UTF8_BOM + lines.join('\r\n') + '\r\n';
}
