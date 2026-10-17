import { describe, expect, it, vi } from 'vitest';
import { deleteRecipe, deletionEntries, GitHubError, setCookedDay, setFavorite } from './github';

const tree = [
  { path: 'src/content/recipes/shakshuka', type: 'tree' },
  { path: 'src/content/recipes/shakshuka/index.md', type: 'blob' },
  { path: 'src/content/recipes/shakshuka/cover.jpg', type: 'blob' },
  { path: 'src/content/recipes/shakshuka-2/index.md', type: 'blob' },
  { path: 'README.md', type: 'blob' },
];

describe('deletionEntries', () => {
  it('removes only files of the recipe folder', () => {
    expect(deletionEntries(tree, 'shakshuka').map((e) => e.path)).toEqual([
      'src/content/recipes/shakshuka/index.md',
      'src/content/recipes/shakshuka/cover.jpg',
    ]);
    expect(deletionEntries(tree, 'shakshuka')[0]).toMatchObject({ sha: null, type: 'blob' });
  });

  it('rejects invalid slugs', () => {
    expect(() => deletionEntries(tree, '../x')).toThrow();
    expect(() => deletionEntries(tree, '')).toThrow();
  });
});

const toBase64 = (text: string) => btoa(String.fromCharCode(...new TextEncoder().encode(text)));
const fromBase64 = (text: string) => new TextDecoder().decode(Uint8Array.from(atob(text), (c) => c.charCodeAt(0)));

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe('deleteRecipe', () => {
  it('commits a tree without the recipe folder', async () => {
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/git/ref/heads/main')) return json({ object: { sha: 'head' } });
      if (url.endsWith('/git/commits/head')) return json({ tree: { sha: 'tree0' } });
      if (url.includes('/git/trees/tree0')) return json({ tree });
      if (url.endsWith('/git/trees')) return json({ sha: 'tree1' });
      if (url.endsWith('/git/commits')) return json({ sha: 'commit1' });
      if (url.endsWith('/git/refs/heads/main')) return json({ ok: init?.method });
      throw new Error(url);
    });
    await deleteRecipe('shakshuka', 'Shakshuka', 'tok', fetchFn as unknown as typeof fetch);
    const calls = fetchFn.mock.calls;
    const treeBody = JSON.parse(calls[3][1]!.body as string);
    expect(treeBody.base_tree).toBe('tree0');
    expect(treeBody.tree).toHaveLength(2);
    expect(JSON.parse(calls[4][1]!.body as string)).toEqual({ message: 'Rezept gelöscht: Shakshuka', tree: 'tree1', parents: ['head'] });
    expect(calls[5][1]!.method).toBe('PATCH');
    expect((calls[0][1]!.headers as Record<string, string>).Authorization).toBe('Bearer tok');
    expect(calls.every((call) => call[1]?.cache === 'no-store')).toBe(true);
  });

  it('reports the HTTP status on errors', async () => {
    const fetchFn = vi.fn(async () => json({}, 401));
    await expect(deleteRecipe('shakshuka', 'Shakshuka', 'bad', fetchFn as unknown as typeof fetch)).rejects.toMatchObject({ status: 401 });
    await expect(deleteRecipe('shakshuka', 'S', 'bad', fetchFn as unknown as typeof fetch)).rejects.toBeInstanceOf(GitHubError);
  });
});

describe('setFavorite', () => {
  const md = '---\ntitle: Grüne Soße\ntags: [Dinner]\nservings: 2\n---\n\n## Zutaten\n- Kräuter\n';

  function mockFetch(content: string) {
    return vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('/contents/src/content/recipes/gruene-sosse/index.md?ref=main')) return json({ content: toBase64(content), sha: 'blob1' });
      if (url.endsWith('/contents/src/content/recipes/gruene-sosse/index.md') && init?.method === 'PUT') return json({});
      throw new Error(url);
    });
  }

  it('commits the keyword with UTF-8 content and the file sha', async () => {
    const fetchFn = mockFetch(md);
    await setFavorite('gruene-sosse', 'Grüne Soße', true, 'tok', fetchFn as unknown as typeof fetch);
    const body = JSON.parse(fetchFn.mock.calls[1][1]!.body as string);
    expect(body).toMatchObject({ message: 'Lieblingsessen: Grüne Soße', sha: 'blob1', branch: 'main' });
    expect(fromBase64(body.content)).toBe(md.replace('tags: [Dinner]\n', 'tags: [Dinner]\nkeywords: [Lieblingsessen]\n'));
    expect(fetchFn.mock.calls.every((call) => call[1]?.cache === 'no-store')).toBe(true);
  });

  it('removes the keyword with its own message', async () => {
    const fetchFn = mockFetch(md.replace('tags: [Dinner]\n', 'tags: [Dinner]\nkeywords: [Lieblingsessen]\n'));
    await setFavorite('gruene-sosse', 'Grüne Soße', false, 'tok', fetchFn as unknown as typeof fetch);
    const body = JSON.parse(fetchFn.mock.calls[1][1]!.body as string);
    expect(body.message).toBe('Kein Lieblingsessen mehr: Grüne Soße');
    expect(fromBase64(body.content)).toBe(md);
  });

  it('does not commit when the state already matches', async () => {
    const fetchFn = mockFetch(md);
    await setFavorite('gruene-sosse', 'Grüne Soße', false, 'tok', fetchFn as unknown as typeof fetch);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });
});

describe('setCookedDay', () => {
  it('commits the day with „Gekocht: <Titel>“', async () => {
    const md = '---\ntitle: Shakshuka\nadded: 2026-10-01\n---\n';
    const fetchFn = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.endsWith('?ref=main')) return json({ content: toBase64(md), sha: 'blob1' });
      if (init?.method === 'PUT') return json({});
      throw new Error(url);
    });
    await setCookedDay('shakshuka', 'Shakshuka', '2026-10-17', true, 'tok', fetchFn as unknown as typeof fetch);
    const body = JSON.parse(fetchFn.mock.calls[1][1]!.body as string);
    expect(body.message).toBe('Gekocht: Shakshuka');
    expect(fromBase64(body.content)).toBe('---\ntitle: Shakshuka\nadded: 2026-10-01\ncooked: [2026-10-17]\n---\n');
  });
});
