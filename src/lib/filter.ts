export type SortKey = 'name' | 'rating' | 'duration' | 'added' | 'cooked';
export const SORT_KEYS: SortKey[] = ['name', 'rating', 'duration', 'added', 'cooked'];
export type Book = 'janita' | 'mirco';

export interface FilterState {
  tags: string[];
  q: string;
  sort: SortKey;
  uncooked: boolean;
  book: Book;
  /** Ordner „Alle“ geöffnet (sonst zeigt die Startseite die Kategorie-Ordner). */
  all: boolean;
}

export interface RecipeSummary {
  id: string;
  title: string;
  tags: string[];
  rating: number | null;
  duration: number | null;
  added: string;
  ingredients: string;
  /** Weiterer Suchtext: Kategorien, Stichwörter und Tipps. */
  extra?: string;
  /** Schon gekocht: hat Sterne oder mindestens einen Koch-Tag. */
  cooked: boolean;
  /** Wie oft gekocht („Heute gekocht“). */
  cookedCount?: number;
  book: Book;
}

export function normalize(text: string): string {
  return text
    .toLocaleLowerCase('de')
    .replace(/ß/g, 'ss')
    .replace(/ae/g, 'a')
    .replace(/oe/g, 'o')
    .replace(/ue/g, 'u')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

type Compare = (a: RecipeSummary, b: RecipeSummary) => number;

function missingLast(get: (r: RecipeSummary) => number | null, direction: 1 | -1): Compare {
  return (a, b) => {
    const x = get(a);
    const y = get(b);
    if (x === null && y === null) return 0;
    if (x === null) return 1;
    if (y === null) return -1;
    return (x - y) * direction;
  };
}

const COMPARE: Record<SortKey, Compare> = {
  name: () => 0,
  rating: missingLast((r) => r.rating, -1),
  duration: missingLast((r) => r.duration, 1),
  added: (a, b) => b.added.localeCompare(a.added),
  cooked: (a, b) => (b.cookedCount ?? 0) - (a.cookedCount ?? 0),
};

export function filterAndSort(items: RecipeSummary[], state: FilterState): string[] {
  const words = normalize(state.q).split(/\s+/).filter(Boolean);
  const byName: Compare = (a, b) => a.title.localeCompare(b.title, 'de');
  const compare = COMPARE[state.sort];
  return items
    // Ohne Suchbegriff nur das gewählte Rezeptbuch, mit Suchbegriff beide.
    .filter((r) => words.length > 0 || r.book === state.book)
    .filter((r) => !state.uncooked || !r.cooked)
    .filter((r) => state.tags.every((t) => r.tags.includes(t)))
    .filter((r) => {
      const haystack = normalize(`${r.title} ${r.ingredients} ${r.extra ?? ''}`);
      return words.every((w) => haystack.includes(w));
    })
    .sort((a, b) => compare(a, b) || byName(a, b))
    .map((r) => r.id);
}

export function parseState(search: string, knownTags: string[]): FilterState {
  const params = new URLSearchParams(search);
  const tags = (params.get('tags') ?? '')
    .split(',')
    .map((t) => t.trim())
    .filter((t) => knownTags.includes(t));
  const sort = params.get('sort');
  return {
    tags: [...new Set(tags)],
    q: params.get('q') ?? '',
    sort: SORT_KEYS.includes(sort as SortKey) ? (sort as SortKey) : 'name',
    uncooked: params.get('gekocht') === 'nein',
    book: params.get('buch') === 'mirco' ? 'mirco' : 'janita',
    all: params.get('alle') === '1',
  };
}

export function toSearch(state: FilterState): string {
  const params = new URLSearchParams();
  if (state.tags.length > 0) params.set('tags', state.tags.join(','));
  if (state.q.trim()) params.set('q', state.q.trim());
  if (state.sort !== 'name') params.set('sort', state.sort);
  if (state.uncooked) params.set('gekocht', 'nein');
  if (state.book !== 'janita') params.set('buch', state.book);
  if (state.all) params.set('alle', '1');
  const query = params.toString();
  return query ? `?${query}` : '';
}

/** Startseite mit Kategorie-Ordnern statt Rezeptliste: nichts gewählt, gesucht oder gefiltert. */
export function isHome(state: FilterState): boolean {
  return !state.all && state.tags.length === 0 && !state.q.trim() && !state.uncooked;
}
