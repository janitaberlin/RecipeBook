import { describe, expect, it } from 'vitest';
import { readKeywords, setKeyword, toggleKeyword } from './keywords';

const base = (keywords?: string) =>
  [
    '---',
    'title: Shakshuka',
    'cover: ./cover.jpg',
    'tags: [Dinner, Veggie Love]',
    ...(keywords === undefined ? [] : [keywords]),
    'duration: 30',
    'servings: 2',
    '---',
    '',
    '## Zutaten',
    '- {{4}} Eier',
    'keywords: [Nicht, Frontmatter]',
    '',
  ].join('\n');

describe('toggleKeyword', () => {
  it('adds a keywords line after the tags line if missing', () => {
    expect(toggleKeyword(base(), 'Lieblingsessen')).toBe(base('keywords: [Lieblingsessen]'));
  });

  it('appends to an existing array', () => {
    expect(toggleKeyword(base('keywords: [Periode]'), 'Lieblingsessen')).toBe(base('keywords: [Periode, Lieblingsessen]'));
  });

  it('removes the keyword and keeps the others', () => {
    expect(toggleKeyword(base('keywords: [Lieblingsessen, Periode]'), 'Lieblingsessen')).toBe(base('keywords: [Periode]'));
    expect(toggleKeyword(base('keywords: [Shake, Lieblingsessen]'), 'Lieblingsessen')).toBe(base('keywords: [Shake]'));
  });

  it('removes the whole keywords line when it becomes empty', () => {
    expect(toggleKeyword(base('keywords: [Lieblingsessen]'), 'Lieblingsessen')).toBe(base());
  });

  it('round-trips byte-identically', () => {
    const original = base('keywords: [Periode]');
    expect(toggleKeyword(toggleKeyword(original, 'Lieblingsessen'), 'Lieblingsessen')).toBe(original);
    expect(toggleKeyword(toggleKeyword(base(), 'Lieblingsessen'), 'Lieblingsessen')).toBe(base());
  });

  it('keeps CRLF line endings', () => {
    const crlf = base().replace(/\n/g, '\r\n');
    expect(toggleKeyword(crlf, 'Lieblingsessen')).toBe(base('keywords: [Lieblingsessen]').replace(/\n/g, '\r\n'));
  });

  it('inserts at the end of the frontmatter without a tags line', () => {
    const md = '---\ntitle: X\n---\nText\n';
    expect(toggleKeyword(md, 'Lieblingsessen')).toBe('---\ntitle: X\nkeywords: [Lieblingsessen]\n---\nText\n');
  });

  it('rejects files without frontmatter', () => {
    expect(() => toggleKeyword('# Nur Text', 'Lieblingsessen')).toThrow();
  });
});

describe('setKeyword / readKeywords', () => {
  it('is idempotent', () => {
    const md = base('keywords: [Lieblingsessen]');
    expect(setKeyword(md, 'Lieblingsessen', true)).toBe(md);
    expect(setKeyword(base(), 'Lieblingsessen', false)).toBe(base());
  });

  it('reads only frontmatter keywords, unquoted', () => {
    expect(readKeywords(base('keywords: ["Party", Grillen]'))).toEqual(['Party', 'Grillen']);
    expect(readKeywords(base())).toEqual([]);
  });
});
