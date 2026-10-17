import { describe, expect, it } from 'vitest';
import { cookedCount, cookedLabel, localIsoDate, readCooked, setCooked } from './cooked';

const md = (extra = '') => `---\ntitle: Shakshuka\ntags: [Dinner]\nrating: 4\n${extra}added: 2026-10-01\n---\n\n## Zutaten\n- {{4}} Eier\n`;

describe('setCooked', () => {
  it('adds a cooked line after rating', () => {
    expect(setCooked(md(), '2026-10-17', true)).toBe(md('cooked: [2026-10-17]\n'));
  });

  it('adds after added when there is no rating', () => {
    const plain = '---\ntitle: X\nadded: 2026-10-01\nservings: 2\n---\n';
    expect(setCooked(plain, '2026-10-17', true)).toBe('---\ntitle: X\nadded: 2026-10-01\ncooked: [2026-10-17]\nservings: 2\n---\n');
  });

  it('appends further days but never the same day twice', () => {
    const once = setCooked(md(), '2026-10-17', true);
    expect(setCooked(once, '2026-10-17', true)).toBe(once);
    expect(setCooked(once, '2026-10-20', true)).toBe(md('cooked: [2026-10-17, 2026-10-20]\n'));
  });

  it('undoes a day and drops the empty line', () => {
    expect(setCooked(md('cooked: [2026-10-17, 2026-10-20]\n'), '2026-10-20', false)).toBe(md('cooked: [2026-10-17]\n'));
    expect(setCooked(md('cooked: [2026-10-17]\n'), '2026-10-17', false)).toBe(md());
  });

  it('rejects invalid dates', () => {
    expect(() => setCooked(md(), '17.10.2026', true)).toThrow();
  });

  it('reads the cooked days', () => {
    expect(readCooked(md('cooked: [2026-10-17, 2026-10-20]\n'))).toEqual(['2026-10-17', '2026-10-20']);
    expect(readCooked(md())).toEqual([]);
  });
});

describe('cookedLabel', () => {
  it('formats the count', () => {
    expect(cookedLabel(0)).toBe('Noch nie gekocht');
    expect(cookedLabel(1)).toBe('1× gekocht');
    expect(cookedLabel(5)).toBe('Schon 5× gekocht');
  });
});

describe('cookedCount', () => {
  it('counts today once, depending on the wanted state', () => {
    expect(cookedCount(['2026-10-01'], '2026-10-17', true)).toBe(2);
    expect(cookedCount(['2026-10-01', '2026-10-17'], '2026-10-17', true)).toBe(2);
    expect(cookedCount(['2026-10-01', '2026-10-17'], '2026-10-17', false)).toBe(1);
  });
});

describe('localIsoDate', () => {
  it('uses the local calendar day', () => {
    expect(localIsoDate(new Date(2026, 0, 5, 23, 30))).toBe('2026-01-05');
  });
});
