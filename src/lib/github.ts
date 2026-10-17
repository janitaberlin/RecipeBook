// Löschen eines Rezepts direkt aus der App: ein Commit auf main über die GitHub-API.
// Der Schlüssel (Fine-grained Token) liegt nur im Browser, nie im Repo.
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

export async function deleteRecipe(id: string, title: string, token: string, fetchFn: typeof fetch = fetch): Promise<void> {
  async function call<T>(path: string, init?: { method: string; body: unknown }): Promise<T> {
    const response = await fetchFn(`${API}${path}`, {
      method: init?.method ?? 'GET',
      headers: {
        Accept: 'application/vnd.github+json',
        Authorization: `Bearer ${token}`,
        ...(init ? { 'Content-Type': 'application/json' } : {}),
      },
      body: init ? JSON.stringify(init.body) : undefined,
    });
    if (!response.ok) throw new GitHubError(`GitHub antwortet mit ${response.status}`, response.status);
    return (await response.json()) as T;
  }

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
