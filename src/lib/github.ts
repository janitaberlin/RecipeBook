// Löschen, Herz (Lieblingsessen) und „Heute gekocht“ direkt aus der App: je ein Commit auf main über die GitHub-API.
// Der Schlüssel (Fine-grained Token) liegt nur im Browser, nie im Repo.
import { setCooked } from './cooked';
import { FAVORITE, setKeyword } from './keywords';

export const REPO = 'janitaberlin/RecipeBook';
const API = `https://api.github.com/repos/${REPO}`;

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

interface TreeItem {
  path: string;
  type: string;
}

export interface DeletionEntry {
  path: string;
  mode: '100644';
  type: 'blob';
  sha: null;
}

export function recipeFolder(id: string): string {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(id)) throw new Error(`Ungültiger Rezept-Slug: ${id}`);
  return `src/content/recipes/${id}/`;
}

/** Baum-Einträge, die alle Dateien im Rezeptordner entfernen. */
export function deletionEntries(tree: TreeItem[], id: string): DeletionEntry[] {
  const folder = recipeFolder(id);
  return tree
    .filter((item) => item.type === 'blob' && item.path.startsWith(folder))
    .map((item) => ({ path: item.path, mode: '100644', type: 'blob', sha: null }));
}

function api(token: string, fetchFn: typeof fetch) {
  return async function call<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
    const response = await fetchFn(`${API}${path}`, {
      method: init?.method ?? 'GET',
      // GitHub erlaubt dem Browser, Antworten 60 Sek. zu cachen; ein veralteter Stand von main
      // lässt das nächste Commit scheitern („not a fast forward“ bzw. 409 wegen alter sha).
      cache: 'no-store',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        ...(init ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init ? JSON.stringify(init.body) : undefined,
    });
    if (!response.ok) throw new GitHubError(`GitHub antwortet mit ${response.status}`, response.status);
    return (await response.json()) as T;
  };
}

export async function deleteRecipe(id: string, title: string, token: string, fetchFn: typeof fetch = fetch): Promise<void> {
  const call = api(token, fetchFn);
  const ref = await call<{ object: { sha: string } }>('/git/ref/heads/main');
  const head = ref.object.sha;
  const commit = await call<{ tree: { sha: string } }>(`/git/commits/${head}`);
  const tree = await call<{ tree: TreeItem[] }>(`/git/trees/${commit.tree.sha}?recursive=1`);
  const entries = deletionEntries(tree.tree, id);
  if (entries.length === 0) return; // schon gelöscht
  const newTree = await call<{ sha: string }>('/git/trees', { method: 'POST', body: { base_tree: commit.tree.sha, tree: entries } });
  const newCommit = await call<{ sha: string }>('/git/commits', {
    method: 'POST',
    body: { message: `Rezept gelöscht: ${title}`, tree: newTree.sha, parents: [head] },
  });
  await call('/git/refs/heads/main', { method: 'PATCH', body: { sha: newCommit.sha } });
}

function decodeBase64(text: string): string {
  const binary = atob(text.replace(/\s/g, ''));
  return new TextDecoder().decode(Uint8Array.from(binary, (c) => c.charCodeAt(0)));
}

function encodeBase64(text: string): string {
  let binary = '';
  for (const byte of new TextEncoder().encode(text)) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/** Ändert die index.md eines Rezepts per Commit auf main; ohne Commit, wenn sich nichts ändert. */
async function editRecipe(id: string, edit: (markdown: string) => string, message: string, token: string, fetchFn: typeof fetch): Promise<void> {
  const call = api(token, fetchFn);
  const path = `${recipeFolder(id)}index.md`;
  const file = await call<{ content: string; sha: string }>(`/contents/${path}?ref=main`);
  const markdown = decodeBase64(file.content);
  const changed = edit(markdown);
  if (changed === markdown) return;
  await call(`/contents/${path}`, {
    method: 'PUT',
    body: { message, content: encodeBase64(changed), sha: file.sha, branch: 'main' },
  });
}

/** Setzt bzw. entfernt das Stichwort „Lieblingsessen“ (Herz). */
export function setFavorite(id: string, title: string, favorite: boolean, token: string, fetchFn: typeof fetch = fetch): Promise<void> {
  const message = favorite ? `Lieblingsessen: ${title}` : `Kein Lieblingsessen mehr: ${title}`;
  return editRecipe(id, (md) => setKeyword(md, FAVORITE, favorite), message, token, fetchFn);
}

/** Trägt einen Koch-Tag ein („Heute gekocht“) bzw. nimmt ihn zurück. */
export function setCookedDay(id: string, title: string, date: string, cooked: boolean, token: string, fetchFn: typeof fetch = fetch): Promise<void> {
  const message = cooked ? `Gekocht: ${title}` : `Gekocht rückgängig: ${title}`;
  return editRecipe(id, (md) => setCooked(md, date, cooked), message, token, fetchFn);
}
