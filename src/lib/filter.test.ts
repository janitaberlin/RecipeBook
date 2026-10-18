import { describe, expect, it } from 'vitest';
import { filterAndSort, isHome, normalize, view, parseState, toSearch, type RecipeSummary } from './filter';

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
const state = (over: Partial<{ tags: string[]; q: string; sort: 'name' | 'rating' | 'duration' | 'added' | 'cooked'; uncooked: boolean; book: 'janita' | 'mirco'; all: boolean; zyklus: boolean; phase: 'Periode' | 'Follikelphase' | 'Eisprung' | 'Lutealphase' | null }> = {}) => ({
  tags: [],
  q: '',
  sort: 'cooked' as const,
  uncooked: false,
  book: 'janita' as const,
  all: false,
  zyklus: false,
  phase: null,
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

  it('sorts by cooked count desc, then stars, then name', () => {
    const counted = items.map((r) => ({ ...r, cookedCount: { steak: 2, mochis: 5 }[r.id] ?? 0 }));
    expect(filterAndSort(counted, state({ sort: 'cooked' }))).toEqual(['mochis', 'steak', 'orzo', 'gnocchi']);
  });

  it('sorts by added desc with name as tie-breaker', () => {
    expect(filterAndSort(items, state({ sort: 'added' }))).toEqual(['gnocchi', 'orzo', 'mochis', 'steak']);
  });
});

describe('URL state', () => {
  const known = ['Hähnchen', 'Hauptspeise', 'Rind'];

  it('round-trips state through the query string', () => {
    const s = { tags: ['Hähnchen', 'Rind'], q: 'orzo', sort: 'rating' as const, uncooked: true, book: 'mirco' as const, all: true, zyklus: true, phase: 'Lutealphase' as const };
    expect(toSearch(s)).toContain('alle=1');
    expect(toSearch(s)).toContain('buch=mirco');
    expect(toSearch(s)).toContain('gekocht=nein');
    expect(parseState(toSearch(s), known)).toEqual(s);
  });

  it('omits defaults', () => {
    expect(toSearch(state())).toBe('');
  });

  it('ignores unknown tags and invalid sort values', () => {
    expect(parseState('?tags=Main%20dish,Rind&sort=xyz', known)).toEqual({ tags: ['Rind'], q: '', sort: 'cooked', uncooked: false, book: 'janita', all: false, zyklus: false, phase: null });
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

describe('Zyklus', () => {
  const cycle = [
    r('suppe', 'Kurkuma-Suppe', { phase: 'Periode' }),
    r('kekse', 'Cookies', { phase: 'Lutealphase' }),
    r('salat', 'Salat'),
  ];
  it('filters by phase', () => {
    expect(filterAndSort(cycle, state({ zyklus: true, phase: 'Periode' }))).toEqual(['suppe']);
    expect(filterAndSort(cycle, state({ zyklus: true, phase: 'Eisprung' }))).toEqual([]);
  });
  it('parses phase and zyklus params, ignoring unknown phases', () => {
    expect(parseState('?zyklus=1&phase=Lutealphase', [])).toMatchObject({ zyklus: true, phase: 'Lutealphase' });
    expect(parseState('?phase=Winter', [])).toMatchObject({ zyklus: false, phase: null });
    expect(toSearch(state({ zyklus: true }))).toBe('?zyklus=1');
  });
  it('picks the view', () => {
    expect(view(state())).toBe('home');
    expect(view(state({ zyklus: true }))).toBe('zyklus');
    expect(view(state({ zyklus: true, book: 'mirco' }))).toBe('home');
    expect(view(state({ zyklus: true, phase: 'Periode' }))).toBe('list');
    expect(view(state({ zyklus: true, q: 'suppe' }))).toBe('list');
  });
});
