/** Schlüssel für den GitHub-Token (Fine-grained), liegt nur in Janitas Browser. */
export const TOKEN_KEY = 'github-token';

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Speicher nicht verfügbar – Zustand gilt nur bis zum Neuladen.
  }
}
