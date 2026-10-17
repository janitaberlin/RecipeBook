import { readList, setListItem } from './keywords';

// „Heute gekocht“: Frontmatter-Feld `cooked: [2026-10-17, 2026-10-20]`, ein Eintrag pro Tag.

/** Datum als JJJJ-MM-TT in der Zeitzone des Geräts (nicht UTC). */
export function localIsoDate(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function cookedLabel(count: number): string {
  if (count <= 0) return 'Noch nie gekocht';
  if (count === 1) return '1× gekocht';
  return `Schon ${count}× gekocht`;
}

export function readCooked(markdown: string): string[] {
  return readList(markdown, 'cooked');
}

/** Trägt den Tag ein bzw. nimmt ihn wieder heraus; derselbe Tag zählt nur einmal. */
export function setCooked(markdown: string, date: string, present: boolean): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error(`Ungültiges Datum: ${date}`);
  return setListItem(markdown, 'cooked', date, present, ['rating', 'added']);
}

/** Anzahl der Koch-Tage mit dem in diesem Browser gewünschten Zustand für einen Tag. */
export function cookedCount(published: string[], date: string, cookedOnDate: boolean): number {
  return published.filter((d) => d !== date).length + (cookedOnDate ? 1 : 0);
}
