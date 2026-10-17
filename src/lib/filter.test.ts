import { describe, expect, it } from 'vitest';
import { filterAndSort, isHome, normalize, parseState, toSearch, type RecipeSummary } from './filter';

const r = (id: string, title: string, extra: Partial<RecipeSummary> = {}): RecipeSummary => ({
  id,
  title,
  tags: [],
  rating: null,
  duration: null,
  added: '2026-10-08',
  ingredients: '',
  cooked: false,
  book: 'janita',
  ...extra,
});

const items = [
  r('orzo', 'Mediterrane Hähnchen-Orzo', { tags: ['Hähnchen', 'Hauptspeise'], rating: 4, duration: 60, ingredients: 'Orzo · Babyspinat', cooked: true }),
  r('gnocchi', 'Gnocchi in Spinat-Frischkäse-Soße', { tags: ['Hauptspeise', 'Vegetarisch'], duration: 20, added: '2026-10-09', ingredients: 'Gnocchi · Babyspinat' }),
  r('steak', 'Steak braten', { tags: ['Hauptspeise', 'Rind'], rating: 5, duration: 15, cooked: true }),
  r('mochis', 'Potato Mochis', { tags: ['Snack'], extra: 'Snack Periode Mit Kürbiskernen super zur Periode.' }),
];
const withMirco = [...items, r('gulasch', 'Biergulasch', { book: 'mirco', ingredients: 'Rindergulasch · Babyspinat' })];
const state = (over: Partial<{ tags: string[]; q: string; sort: 'name' | 'rating' | 'duration' | 'added' | 'cooked'; uncooked: boolean; book: 'janita' | 'mirco'; all: boolean }> = {}) => ({
  tags: [],
  q: '',
  sort: 'name' as const,
  uncooked: false,
  book: 'janita' as const,
  all: false,
  ...over,
});

describe('normalize', () => {
  it('makes umlauts and their transliterations equal', () => {
    expect(normalize('Hähnchen')).toBe(normalize('haehnchen'));
    expect(normalize('Hähnchen')).toBe(normalize('hahnchen'));
    expect(normalize('Soße')).toBe(normalize('sosse'));
  });
});

describe('filterAndSort', () => {
  it('shows only the chosen book without a search', () => {
    expect(filterAndSort(withMirco, state())).toEqual(['gnocchi', 'orzo', 'mochis', 'steak']);
    expect(filterAndSort(withMirco, state({ book: 'mirco' }))).toEqual(['gulasch']);
  });

  it('searches both books', () => {
    expect(filterAndSort(withMirco, state({ q: 'babyspinat' }))).toEqual(['gulasch', 'gnocchi', 'orzo']);
  });

  it('sorts by name by default', () => {
    expect(filterAndSort(items, state())).toEqual(['gnocchi', 'orzo', 'mochis', 'steak']);
  });

  it('shows only recipes not cooked yet when requested', () => {
    expect(filterAndSort(items, state({ uncooked: true }))).toEqual(['gnocchi', 'mochis']);
    expect(filterAndSort(items, state({ uncooked: true, tags: ['Snack'] }))).toEqual(['mochis']);
  });

  it('requires all selected tags', () => {
    expect(filterAndSort(items, state({ tags: ['Hauptspeise', 'Vegetarisch'] }))).toEqual(['gnocchi']);
  });

  it('searches title and ingredients, every word, umlaut-insensitive', () => {
    expect(filterAndSort(items, state({ q: 'haehnchen' }))).toEqual(['orzo']);
    expect(filterAndSort(items, state({ q: 'babyspinat gnocchi' }))).toEqual(['gnocchi']);
    expect(filterAndSort(items, state({ q: 'pizza' }))).toEqual([]);
    expect(filterAndSort(items, state({ q: 'periode' }))).toEqual(['mochis']);
  });

  it('sorts by rating desc with missing values last and name as tie-breaker', () => {
    expect(filterAndSort(items, state({ sort: 'rating' }))).toEqual(['steak', 'orzo', 'gnocchi', 'mochis']);
  });

  it('sorts by duration asc with missing values last', () => {
    expect(filterAndSort(items, state({ sort: 'duration' }))).toEqual(['steak', 'gnocchi', 'orzo', 'mochis']);
  });

  it('sorts by cooked count desc with name as tie-breaker', () => {
    const counted = items.map((r) => ({ ...r, cookedCount: { steak: 2, mochis: 5 }[r.id] ?? 0 }));
    expect(filterAndSort(counted, state({ sort: 'cooked' }))).toEqual(['mochis', 'steak', 'gnocchi', 'orzo']);
  });

  it('sorts by added desc with name as tie-breaker', () => {
    expect(filterAndSort(items, state({ sort: 'added' }))).toEqual(['gnocchi', 'orzo', 'mochis', 'steak']);
  });
});

describe('URL state', () => {
  const known = ['Hähnchen', 'Hauptspeise', 'Rind'];

  it('round-trips state through the query string', () => {
    const s = { tags: ['Hähnchen', 'Rind'], q: 'orzo', sort: 'rating' as const, uncooked: true, book: 'mirco' as const, all: true };
    expect(toSearch(s)).toContain('alle=1');
    expect(toSearch(s)).toContain('buch=mirco');
    expect(toSearch(s)).toContain('gekocht=nein');
    expect(parseState(toSearch(s), known)).toEqual(s);
  });

  it('omits defaults', () => {
    expect(toSearch(state())).toBe('');
  });

  it('ignores unknown tags and invalid sort values', () => {
    expect(parseState('?tags=Main%20dish,Rind&sort=xyz', known)).toEqual({ tags: ['Rind'], q: '', sort: 'name', uncooked: false, book: 'janita', all: false });
  });
});

describe('isHome', () => {
  it('shows the folders only when nothing is selected', () => {
    expect(isHome(state())).toBe(true);
    expect(isHome(state({ all: true }))).toBe(false);
    expect(isHome(state({ tags: ['Rind'] }))).toBe(false);
    expect(isHome(state({ q: 'orzo' }))).toBe(false);
    expect(isHome(state({ q: '  ' }))).toBe(true);
    expect(isHome(state({ uncooked: true }))).toBe(false);
  });
});
