import { deletedIds, initCardMenu } from './card-menu';
import { cookedState, favoriteState } from './recipe-actions';
import { filterAndSort, parseState, view, toSearch, type FilterState, type RecipeSummary, type SortKey } from '../lib/filter';

interface Data {
  recipes: RecipeSummary[];
  tags: string[];
}

const countText = (n: number) => `${n} ${n === 1 ? 'Rezept' : 'Rezepte'}`;

function init({ recipes: allRecipes, tags }: Data): void {
  const grid = document.querySelector<HTMLElement>('.card-grid')!;
  const cards = new Map([...grid.querySelectorAll<HTMLElement>('.card')].map((card) => [card.dataset.id!, card]));
  // In der App gelöschte Rezepte sofort ausblenden, auch solange die alte Version noch online ist.
  const deleted = deletedIds();
  let recipes = allRecipes.filter((r) => !deleted.has(r.id));
  for (const id of deleted) {
    cards.get(id)?.remove();
    cards.delete(id);
  }
  // Herz und „Heute gekocht“ aus der Rezeptseite sofort zeigen, auch solange die neue Version noch nicht online ist.
  for (const [id, card] of cards) {
    const heart = card.querySelector<HTMLElement>('.card-heart');
    if (heart) heart.hidden = !favoriteState(id, card.dataset.favorite === 'true');
    const count = card.querySelector<HTMLElement>('.cook-count');
    if (count) {
      const n = cookedState(id, JSON.parse(card.dataset.cooked ?? '[]') as string[]);
      count.textContent = `${n}× gekocht`;
      count.hidden = n === 0;
      const summary = recipes.find((r) => r.id === id);
      if (summary) Object.assign(summary, { cookedCount: n, cooked: summary.rating !== null || n > 0 });
    }
  }
  const search = document.querySelector<HTMLInputElement>('.search')!;
  const sort = document.querySelector<HTMLSelectElement>('.sort')!;
  const folders = [...document.querySelectorAll<HTMLElement>('.home-grid .folder')];
  const phaseFolders = [...document.querySelectorAll<HTMLElement>('.phase-folder')];
  const phaseView = document.querySelector<HTMLElement>('.phase-view')!;
  const phaseBack = document.querySelector<HTMLButtonElement>('.phase-back')!;
  const keywordChips = [...document.querySelectorAll<HTMLButtonElement>('.keyword-chip')];
  const folderGrid = document.querySelector<HTMLElement>('.home-grid')!;
  const listView = document.querySelector<HTMLElement>('.list-view')!;
  const listTitle = document.querySelector<HTMLElement>('.list-title')!;
  const backButton = document.querySelector<HTMLButtonElement>('.back-btn')!;
  const uncookedChip = document.querySelector<HTMLButtonElement>('.uncooked-chip')!;
  const empty = document.querySelector<HTMLElement>('.empty:not(.empty-own)')!;
  const emptyOwn = document.querySelector<HTMLElement>('.empty-own')!;
  const bookButtons = [...document.querySelectorAll<HTMLAnchorElement>('.book-btn')];
  const count = document.querySelector<HTMLElement>('.result-count')!;
  let state: FilterState = parseState(location.search, tags);

  function title(): string {
    if (state.q.trim()) return 'Suche';
    if (state.phase) return [state.phase, ...state.tags].join(' + ');
    if (state.tags.length > 0) return state.tags.join(' + ');
    if (state.uncooked && !state.all) return 'Noch nicht gekocht';
    return 'Alle Rezepte';
  }

  function render(): void {
    const current = view(state);
    const home = current !== 'list';
    folderGrid.hidden = current !== 'home';
    phaseView.hidden = current !== 'zyklus';
    listView.hidden = home;
    const bookRecipes = recipes.filter((r) => r.book === state.book);
    for (const folder of folders) {
      const tag = folder.dataset.tag ?? '';
      folder.hidden = folder.dataset.book !== state.book;
      const n = folder.dataset.zyklus !== undefined
        ? bookRecipes.filter((r) => r.phase).length
        : bookRecipes.filter((r) => !tag || r.tags.includes(tag)).length;
      folder.querySelector('.folder-count')!.textContent = countText(n);
    }
    for (const folder of phaseFolders) {
      const n = bookRecipes.filter((r) => r.phase === folder.dataset.phase).length;
      folder.querySelector('.folder-count')!.textContent = countText(n);
      folder.classList.toggle('folder--empty', n === 0);
    }
    backButton.textContent = state.phase ? '‹ Zyklus' : '‹ Kategorien';
    for (const chip of keywordChips) {
      chip.hidden = chip.dataset.book !== state.book;
      chip.setAttribute('aria-pressed', String(state.q.trim() === chip.dataset.keyword));
    }
    const ids = filterAndSort(recipes, state);
    const visible = new Set(ids);
    for (const [id, card] of cards) card.hidden = home || !visible.has(id);
    for (const id of ids) grid.appendChild(cards.get(id)!);
    listTitle.textContent = title();
    uncookedChip.setAttribute('aria-pressed', String(state.uncooked));
    if (search.value !== state.q) search.value = state.q;
    sort.value = state.sort;
    for (const button of bookButtons) {
      if (button.dataset.book === state.book) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    }
    const ownEmpty = bookRecipes.length === 0 && state.book === 'janita' && !state.q.trim();
    empty.hidden = home || ids.length > 0 || ownEmpty;
    emptyOwn.hidden = !ownEmpty;
    count.textContent = countText(ids.length);
    history.replaceState(history.state, '', toSearch(state) || location.pathname);
  }

  // Einen Ordner öffnen legt einen Verlaufseintrag an, damit „Zurück“ (auch per Wischgeste) zur Startseite führt.
  function open(next: FilterState): void {
    history.pushState({ folder: true }, '', toSearch(next) || location.pathname);
    state = next;
    render();
    window.scrollTo(0, 0);
  }

  for (const folder of folders) {
    folder.querySelector('a')!.addEventListener('click', (event) => {
      event.preventDefault();
      if (folder.dataset.zyklus !== undefined) {
        open({ ...state, tags: [], all: false, q: '', uncooked: false, zyklus: true, phase: null });
        return;
      }
      const tag = folder.dataset.tag ?? '';
      open({ ...state, tags: tag ? [tag] : [], all: !tag, q: '', uncooked: false, zyklus: false, phase: null });
    });
  }
  for (const folder of phaseFolders) {
    folder.querySelector('a')!.addEventListener('click', (event) => {
      event.preventDefault();
      open({ ...state, tags: [], all: false, q: '', uncooked: false, zyklus: true, phase: folder.dataset.phase as FilterState['phase'] });
    });
  }
  // Aus den Phasen-Ordnern zurück zur Startseite.
  phaseBack.addEventListener('click', () => {
    if (history.state?.folder) {
      history.back();
      return;
    }
    state = { ...state, zyklus: false, phase: null };
    render();
  });
  for (const chip of keywordChips) {
    chip.addEventListener('click', () => {
      const keyword = chip.dataset.keyword!;
      if (state.q.trim() === keyword) {
        state = { ...state, q: '' };
        render();
      } else open({ ...state, q: keyword, tags: [], all: false, uncooked: false });
    });
  }
  backButton.addEventListener('click', () => {
    if (history.state?.folder) {
      history.back();
      return;
    }
    // Direkt geöffnete Phase (ohne Verlauf): zurück zu den Phasen-Ordnern, sonst zur Startseite.
    state = { ...state, tags: [], q: '', uncooked: false, all: false, zyklus: Boolean(state.phase), phase: null };
    render();
  });
  search.addEventListener('input', () => {
    state = { ...state, q: search.value };
    render();
  });
  sort.addEventListener('change', () => {
    state = { ...state, sort: sort.value as SortKey };
    render();
  });
  for (const button of bookButtons) {
    button.addEventListener('click', (event) => {
      // Auf der Übersicht ohne Neuladen umschalten; zurück zu den Kategorien des Buchs.
      event.preventDefault();
      state = { tags: [], q: '', sort: state.sort, uncooked: false, all: false, zyklus: false, phase: null, book: button.dataset.book === 'mirco' ? 'mirco' : 'janita' };
      render();
    });
  }
  uncookedChip.addEventListener('click', () => {
    state = { ...state, uncooked: !state.uncooked };
    render();
  });
  window.addEventListener('popstate', () => {
    state = parseState(location.search, tags);
    render();
  });
  initCardMenu(grid, (id) => {
    recipes = recipes.filter((r) => r.id !== id);
    cards.get(id)?.remove();
    cards.delete(id);
    render();
  });
  render();
}

const dataElement = document.getElementById('recipe-data');
if (dataElement?.textContent) init(JSON.parse(dataElement.textContent) as Data);
