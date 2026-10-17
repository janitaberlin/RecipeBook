import { deleteRecipe, GitHubError } from '../lib/github';
import { recipeUrl } from '../lib/url';

const TOKEN_KEY = 'github-token';
const DELETED_KEY = 'deleted-recipes';
const LONG_PRESS_MS = 550;

function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string | null): void {
  try {
    if (value === null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    // Speicher nicht verfügbar – dann muss der Schlüssel jedes Mal neu eingegeben werden.
  }
}

/** Rezepte, die hier gelöscht wurden; bleiben ausgeblendet, bis die neue Version online ist. */
export function deletedIds(): Set<string> {
  try {
    return new Set(JSON.parse(readStorage(DELETED_KEY) ?? '[]') as string[]);
  } catch {
    return new Set();
  }
}

export function initCardMenu(grid: HTMLElement, onDeleted: (id: string) => void): void {
  const dialog = document.querySelector<HTMLDialogElement>('.card-menu')!;
  const title = dialog.querySelector<HTMLElement>('.card-menu-title')!;
  const actions = dialog.querySelector<HTMLElement>('[data-view="actions"]')!;
  const confirm = dialog.querySelector<HTMLElement>('[data-view="confirm"]')!;
  const tokenInput = dialog.querySelector<HTMLInputElement>('.token-input')!;
  const status = dialog.querySelector<HTMLElement>('.card-menu-status')!;
  const confirmButton = dialog.querySelector<HTMLButtonElement>('[data-action="confirm-delete"]')!;
  let current: { id: string; title: string } | null = null;
  let suppressClick = false;

  function open(card: HTMLElement): void {
    if (dialog.open) return;
    current = { id: card.dataset.id!, title: card.querySelector('.card-title')?.textContent ?? '' };
    title.textContent = current.title;
    actions.hidden = false;
    confirm.hidden = true;
    status.textContent = '';
    confirmButton.disabled = false;
    dialog.showModal();
  }

  // Langes Drücken (Handy) bzw. Rechtsklick (Computer) öffnet das Menü.
  let timer: number | undefined;
  let start: { x: number; y: number } | null = null;
  const cancel = () => {
    window.clearTimeout(timer);
    start = null;
  };
  grid.addEventListener('pointerdown', (event) => {
    const card = (event.target as Element).closest<HTMLElement>('.card');
    if (!card || event.button !== 0) return;
    start = { x: event.clientX, y: event.clientY };
    timer = window.setTimeout(() => {
      suppressClick = true;
      navigator.vibrate?.(15);
      open(card);
    }, LONG_PRESS_MS);
  });
  grid.addEventListener('pointermove', (event) => {
    if (start && Math.hypot(event.clientX - start.x, event.clientY - start.y) > 10) cancel();
  });
  for (const type of ['pointerup', 'pointercancel', 'pointerleave'] as const) grid.addEventListener(type, cancel);
  grid.addEventListener('contextmenu', (event) => {
    const card = (event.target as Element).closest<HTMLElement>('.card');
    if (!card) return;
    event.preventDefault();
    cancel();
    open(card);
  });
  grid.addEventListener(
    'click',
    (event) => {
      if (!suppressClick) return;
      suppressClick = false;
      event.preventDefault();
    },
    true,
  );
  dialog.addEventListener('close', () => {
    // Klick, der beim Loslassen nach dem langen Drücken entsteht, nicht als Öffnen werten.
    window.setTimeout(() => (suppressClick = false), 0);
  });
  dialog.addEventListener('click', (event) => {
    if (event.target === dialog) dialog.close(); // Klick auf den Hintergrund
  });

  dialog.querySelector('[data-action="share"]')!.addEventListener('click', async () => {
    if (!current) return;
    const link = new URL(recipeUrl(current.id), location.href).href;
    try {
      if (navigator.share) {
        await navigator.share({ title: current.title, url: link });
        dialog.close();
      } else {
        await navigator.clipboard.writeText(link);
        status.textContent = 'Link kopiert.';
        actions.hidden = true;
        confirm.hidden = true;
        window.setTimeout(() => dialog.close(), 1200);
      }
    } catch {
      // Teilen abgebrochen – Menü bleibt offen.
    }
  });

  async function remove(token: string): Promise<void> {
    if (!current) return;
    actions.hidden = true;
    confirmButton.disabled = true;
    status.textContent = 'Wird gelöscht …';
    try {
      await deleteRecipe(current.id, current.title, token);
      writeStorage(TOKEN_KEY, token);
      tokenInput.value = '';
      writeStorage(DELETED_KEY, JSON.stringify([...deletedIds(), current.id]));
      onDeleted(current.id);
      dialog.close();
    } catch (error) {
      confirmButton.disabled = false;
      if (error instanceof GitHubError && (error.status === 401 || error.status === 403 || error.status === 404)) {
        writeStorage(TOKEN_KEY, null);
        confirm.hidden = false;
        status.textContent = 'Der GitHub-Schlüssel passt nicht. Bitte neu eingeben.';
        tokenInput.focus();
      } else {
        actions.hidden = false;
        status.textContent = 'Löschen hat nicht geklappt. Bitte später nochmal versuchen.';
      }
    }
  }

  // Mit gespeichertem Schlüssel wird sofort gelöscht, sonst einmalig den Schlüssel abfragen.
  dialog.querySelector('[data-action="delete"]')!.addEventListener('click', () => {
    const token = readStorage(TOKEN_KEY);
    if (token) {
      void remove(token);
      return;
    }
    actions.hidden = true;
    confirm.hidden = false;
    tokenInput.focus();
  });

  confirmButton.addEventListener('click', () => {
    const token = tokenInput.value.trim();
    if (!token) {
      status.textContent = 'Bitte zuerst den GitHub-Schlüssel eingeben.';
      tokenInput.focus();
      return;
    }
    void remove(token);
  });
}
