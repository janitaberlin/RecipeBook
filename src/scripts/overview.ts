import { filterAndSort, parseState, toSearch, type FilterState, type RecipeSummary, type SortKey } from '../lib/filter';

interface Data {
  recipes: RecipeSummary[];
  tags: string[];
}

function init({ recipes, tags }: Data): void {
  const grid = document.querySelector<HTMLElement>('.card-grid')!;
  const cards = new Map([...grid.querySelectorAll<HTMLElement>('.card')].map((card) => [card.dataset.id!, card]));
  const search = document.querySelector<HTMLInputElement>('.search')!;
  const sort = document.querySelector<HTMLSelectElement>('.sort')!;
  const chips = [...document.querySelectorAll<HTMLButtonElement>('.tag-chip[data-tag]')];
  const uncookedChip = document.querySelector<HTMLButtonElement>('.uncooked-chip')!;
  const empty = document.querySelector<HTMLElement>('.empty:not(.empty-own)')!;
  const emptyOwn = document.querySelector<HTMLElement>('.empty-own')!;
  const bookButtons = [...document.querySelectorAll<HTMLButtonElement>('.book-btn')];
  const count = document.querySelector<HTMLElement>('.result-count')!;
  let state: FilterState = parseState(location.search, tags);

  function render(): void {
    const ids = filterAndSort(recipes, state);
    const visible = new Set(ids);
    for (const [id, card] of cards) card.hidden = !visible.has(id);
    for (const id of ids) grid.appendChild(cards.get(id)!);
    for (const chip of chips) chip.setAttribute('aria-pressed', String(state.tags.includes(chip.dataset.tag!)));
    uncookedChip.setAttribute('aria-pressed', String(state.uncooked));
    if (search.value !== state.q) search.value = state.q;
    sort.value = state.sort;
    for (const button of bookButtons) button.setAttribute('aria-pressed', String(button.dataset.book === state.book));
    // Gesamtzahl: bei einer Suche beide Bücher, sonst nur das gewählte.
    const total = state.q.trim() ? recipes.length : recipes.filter((r) => r.book === state.book).length;
    const ownEmpty = total === 0 && state.book === 'janita' && !state.q.trim();
    empty.hidden = ids.length > 0 || ownEmpty;
    emptyOwn.hidden = !ownEmpty;
    count.textContent = ids.length === total ? `${ids.length} ${ids.length === 1 ? 'Rezept' : 'Rezepte'}` : `${ids.length} von ${total} Rezepten`;
    history.replaceState(null, '', toSearch(state) || location.pathname);
  }

  search.addEventListener('input', () => {
    state = { ...state, q: search.value };
    render();
  });
  sort.addEventListener('change', () => {
    state = { ...state, sort: sort.value as SortKey };
    render();
  });
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const tag = chip.dataset.tag!;
      const tagsNow = state.tags.includes(tag) ? state.tags.filter((t) => t !== tag) : [...state.tags, tag];
      state = { ...state, tags: tagsNow };
      render();
    });
  }
  for (const button of bookButtons) {
    button.addEventListener('click', () => {
      state = { ...state, book: button.dataset.book === 'mirco' ? 'mirco' : 'janita' };
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
  render();
}

const dataElement = document.getElementById('recipe-data');
if (dataElement?.textContent) init(JSON.parse(dataElement.textContent) as Data);
