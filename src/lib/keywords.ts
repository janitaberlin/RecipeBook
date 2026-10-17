// Listen in der Frontmatter eines Rezepts ändern (`keywords`, `cooked`), ohne den Rest der Datei anzufassen.
// Wird vom Herz und von „Heute gekocht“ auf der Rezeptseite genutzt, die über die GitHub-API committen.

export const FAVORITE = 'Lieblingsessen';

const FRONTMATTER = /^---\r?\n([\s\S]*?\r?\n)---(\r?\n|$)/;

function listLine(field: string): RegExp {
  return new RegExp(`^${field}:[^\\S\\r\\n]*\\[(.*)\\][^\\S\\r\\n]*(\\r?\\n|$)`, 'm');
}

function unquote(item: string): string {
  const t = item.trim();
  return /^(['"]).*\1$/.test(t) ? t.slice(1, -1) : t;
}

function frontmatter(markdown: string): { start: number; body: string } {
  const match = FRONTMATTER.exec(markdown);
  if (!match) throw new Error('Keine Frontmatter gefunden');
  return { start: match[0].indexOf('\n') + 1, body: match[1] };
}

/** Einträge einer einzeiligen Liste `feld: [a, b]` in der Frontmatter. */
export function readList(markdown: string, field: string): string[] {
  const match = listLine(field).exec(frontmatter(markdown).body);
  if (!match) return [];
  return match[1].split(',').map(unquote).filter(Boolean);
}

/**
 * Setzt oder entfernt einen Eintrag einer einzeiligen Liste; alles andere bleibt Byte für Byte gleich.
 * Eine leere Liste verschwindet samt Zeile; eine neue Zeile kommt nach dem ersten vorhandenen Feld aus `after`,
 * sonst ans Ende der Frontmatter.
 */
export function setListItem(markdown: string, field: string, value: string, present: boolean, after: string[] = []): string {
  const { start, body } = frontmatter(markdown);
  if (new RegExp(`^${field}:[^\\S\\r\\n]*(\\r?\\n|$)`, 'm').test(body)) throw new Error(`${field} muss als [a, b] in einer Zeile stehen`);
  const match = listLine(field).exec(body);
  const current = match ? match[1].split(',').map(unquote).filter(Boolean) : [];
  if (current.includes(value) === present) return markdown;
  const next = present ? [...current, value] : current.filter((k) => k !== value);
  const eol = body.includes('\r\n') ? '\r\n' : '\n';

  if (match) {
    const from = start + match.index;
    const to = from + match[0].length;
    const line = next.length > 0 ? `${field}: [${next.join(', ')}]${match[2]}` : '';
    return markdown.slice(0, from) + line + markdown.slice(to);
  }
  const anchor = after.map((f) => new RegExp(`^${f}:.*(\\r?\\n)`, 'm').exec(body)).find(Boolean);
  const at = start + (anchor ? anchor.index + anchor[0].length : body.length);
  return markdown.slice(0, at) + `${field}: [${value}]${eol}` + markdown.slice(at);
}

/** Stichwörter laut Frontmatter. */
export function readKeywords(markdown: string): string[] {
  return readList(markdown, 'keywords');
}

/** Setzt oder entfernt ein Stichwort (neue Zeile nach `tags:`). */
export function setKeyword(markdown: string, keyword: string, present: boolean): string {
  return setListItem(markdown, 'keywords', keyword, present, ['tags']);
}

export function toggleKeyword(markdown: string, keyword: string): string {
  return setKeyword(markdown, keyword, !readKeywords(markdown).includes(keyword));
}
