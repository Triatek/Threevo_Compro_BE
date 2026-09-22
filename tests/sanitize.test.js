import { describe, expect, it } from 'vitest';
import { sanitizeRichText } from '../src/lib/sanitize.js';

describe('sanitizeRichText', () => {
  it('keeps safe formatting', () => {
    const html = '<h2>Judul</h2><p><strong>Tebal</strong> <a href="https://threevo.id">link</a></p>';
    expect(sanitizeRichText(html)).toBe(html);
  });

  it('removes scripts, event handlers, iframes and javascript: URLs', () => {
    const dirty =
      '<p onclick="alert(1)">Hai</p><script>alert(1)</script><iframe src="https://x"></iframe>' +
      '<a href="javascript:alert(1)">klik</a><img src="x" onerror="alert(1)">';
    const clean = sanitizeRichText(dirty);

    expect(clean).not.toMatch(/script|onclick|onerror|iframe|javascript:/i);
    expect(clean).toContain('<p>Hai</p>');
  });

  it('adds rel="noopener noreferrer" to links opening a new tab', () => {
    expect(sanitizeRichText('<a href="https://a.com" target="_blank">a</a>')).toBe(
      '<a href="https://a.com" target="_blank" rel="noopener noreferrer">a</a>',
    );
  });

  it('passes null/undefined through', () => {
    expect(sanitizeRichText(null)).toBeNull();
    expect(sanitizeRichText(undefined)).toBeUndefined();
  });
});
