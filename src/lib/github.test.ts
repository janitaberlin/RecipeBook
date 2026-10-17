import { describe, expect, it, vi } from 'vitest';
import { deleteRecipe, deletionEntries, GitHubError } from './github';

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
  });

  it('reports the HTTP status on errors', async () => {
    const fetchFn = vi.fn(async () => json({}, 401));
    await expect(deleteRecipe('shakshuka', 'Shakshuka', 'bad', fetchFn as unknown as typeof fetch)).rejects.toMatchObject({ status: 401 });
    await expect(deleteRecipe('shakshuka', 'S', 'bad', fetchFn as unknown as typeof fetch)).rejects.toBeInstanceOf(GitHubError);
  });
});
