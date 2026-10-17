import { cookedCount, cookedLabel, localIsoDate } from '../lib/cooked';
import { GitHubError, setCookedDay, setFavorite } from '../lib/github';
import { readStorage, TOKEN_KEY, writeStorage } from './storage';

// Herz (Lieblingsessen) und „Heute gekocht“: je ein Commit auf main über die GitHub-API.
// Bis die neu gebaute Seite online ist, merkt sich der Browser den gewünschten Zustand.
const PENDING_KEY = 'pending-edits';

function readPending(): Record<string, boolean> {
  try {
    const value = JSON.parse(readStorage(PENDING_KEY) ?? '{}') as unknown;
    return value && typeof value === 'object' ? (value as Record<string, boolean>) : {};
  } catch {
    return {};
  }
}

function writePending(key: string, value: boolean | null): void {
  const pending = readPending();
  if (value === null) delete pending[key];
  else pending[key] = value;
  writeStorage(PENDING_KEY, Object.keys(pending).length > 0 ? JSON.stringify(pending) : null);
}

/** Angezeigter Zustand: offene Änderung aus diesem Browser, sonst der Stand der Seite. */
function pendingState(key: string, published: boolean): boolean {
  const pending = readPending()[key];
  if (pending === undefined) return published;
  if (pending === published) {
    writePending(key, null); // Neue Version ist online.
    return published;
  }
  return pending;
}

const favoriteKey = (id: string) => `favorite:${id}`;
const cookedKey = (id: string, date: string) => `cooked:${id}:${date}`;

export function favoriteState(id: string, published: boolean): boolean {
  return pendingState(favoriteKey(id), published);
}

/** Koch-Anzahl inkl. eines heute in diesem Browser getippten, noch nicht veröffentlichten „Heute gekocht“. */
export function cookedState(id: string, published: string[], today = localIsoDate()): number {
  return cookedCount(published, today, pendingState(cookedKey(id, today), published.includes(today)));
}

/** Einmaliger Dialog für den GitHub-Schlüssel; liefert null, wenn abgebrochen. */
function tokenPrompt(dialog: HTMLDialogElement): (message?: string) => Promise<string | null> {
  const input = dialog.querySelector<HTMLInputElement>('.token-input')!;
  const status = dialog.querySelector<HTMLElement>('.card-menu-status')!;
  const confirm = dialog.querySelector<HTMLButtonElement>('[data-action="confirm-token"]')!;
  let resolve: ((token: string | null) => void) | null = null;
  const finish = (token: string | null) => {
    resolve?.(token);
    resolve = null;
  };
  confirm.addEventListener('click', () => {
    const token = input.value.trim();
    if (!token) {
      status.textContent = 'Bitte zuerst den GitHub-Schlüssel eingeben.';
      input.focus();
      return;
    }
    input.value = '';
    finish(token);
    dialog.close();
  });
  dialog.addEventListener('close', () => finish(null));
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close();
  });
  return (message = '') =>
    new Promise((done) => {
      finish(null);
      resolve = done;
      status.textContent = message;
      if (!dialog.open) dialog.showModal();
      input.focus();
    });
}

interface Toggle {
  /** Zustand umschalten (bei Bedarf vorher den Schlüssel abfragen) und committen. */
  set(next: boolean): Promise<void>;
  readonly state: boolean;
}

/** Ein an/aus-Zustand, der per Commit gespeichert wird; zeigt Änderungen sofort an. */
function commitToggle(options: {
  key: string;
  published: boolean;
  commit: (state: boolean, token: string) => Promise<void>;
  render: (state: boolean) => void;
  askToken: (message?: string) => Promise<string | null>;
  say: (text: string) => void;
}): Toggle {
  let shown = pendingState(options.key, options.published);
  let saved = shown;
  let busy = false;

  async function sync(token: string): Promise<void> {
    if (busy) return;
    busy = true;
    try {
      while (saved !== shown) {
        const target = shown;
        await options.commit(target, token);
        writeStorage(TOKEN_KEY, token);
        saved = target;
        writePending(options.key, target === options.published ? null : target);
      }
    } catch (error) {
      const wanted = shown;
      shown = saved;
      options.render(shown);
      if (error instanceof GitHubError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        writeStorage(TOKEN_KEY, null);
        busy = false;
        const token = await options.askToken('Der GitHub-Schlüssel passt nicht. Bitte neu eingeben.');
        if (token) {
          shown = wanted;
          options.render(shown);
          await sync(token);
        }
        return;
      }
      options.say('Speichern hat nicht geklappt. Bitte später nochmal versuchen.');
    } finally {
      busy = false;
    }
  }

  options.render(shown);
  return {
    get state() {
      return shown;
    },
    async set(next: boolean) {
      options.say('');
      if (next === shown) return;
      const token = readStorage(TOKEN_KEY) ?? (await options.askToken());
      if (!token) return;
      shown = next;
      options.render(shown);
      navigator.vibrate?.(10);
      await sync(token);
    },
  };
}

export function initRecipeActions(article: HTMLElement): void {
  const dialog = document.querySelector<HTMLDialogElement>('.token-dialog');
  if (!dialog) return;
  const id = article.dataset.recipeId!;
  const title = article.querySelector('h1')?.textContent ?? '';
  const toast = article.querySelector<HTMLElement>('.action-status')!;
  const askToken = tokenPrompt(dialog);
  const say = (text: string) => {
    toast.textContent = text;
    toast.hidden = !text;
  };

  const heart = article.querySelector<HTMLButtonElement>('.favorite-btn');
  if (heart) {
    const favorite = commitToggle({
      key: favoriteKey(id),
      published: heart.dataset.published === 'true',
      commit: (state, token) => setFavorite(id, title, state, token),
      render: (state) => {
        heart.setAttribute('aria-pressed', String(state));
        heart.setAttribute('aria-label', state ? 'Kein Lieblingsessen mehr' : 'Als Lieblingsessen merken');
        heart.title = state ? 'Lieblingsessen' : 'Als Lieblingsessen merken';
      },
      askToken,
      say,
    });
    heart.addEventListener('click', () => void favorite.set(!favorite.state));
  }

  const cookedBox = article.querySelector<HTMLElement>('.cooked-box');
  if (cookedBox) {
    const today = localIsoDate();
    const published = JSON.parse(cookedBox.dataset.published ?? '[]') as string[];
    const button = cookedBox.querySelector<HTMLButtonElement>('.cooked-btn')!;
    const undo = cookedBox.querySelector<HTMLButtonElement>('.cooked-undo')!;
    const label = cookedBox.querySelector<HTMLElement>('.cooked-count')!;
    const cooked = commitToggle({
      key: cookedKey(id, today),
      published: published.includes(today),
      commit: (state, token) => setCookedDay(id, title, today, state, token),
      render: (state) => {
        button.setAttribute('aria-pressed', String(state));
        button.disabled = state;
        button.textContent = state ? '✓ Heute gekocht' : 'Heute gekocht';
        undo.hidden = !state;
        label.textContent = cookedLabel(cookedCount(published, today, state));
      },
      askToken,
      say,
    });
    button.addEventListener('click', () => void cooked.set(true));
    undo.addEventListener('click', () => void cooked.set(false));
  }
}
