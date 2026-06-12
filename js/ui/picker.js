import { t, localName } from '../i18n.js';
import { allocate } from '../calc.js';
import { esc, matches } from './html.js';

let query = '';

export function initPicker(ctx) {
  const search = document.getElementById('craft-search');
  search.addEventListener('input', () => {
    query = search.value.trim();
    renderResults(ctx);
  });

  document.getElementById('search-results').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-add]');
    if (!btn) return;
    ctx.update((state) => {
      const existing = state.selected.find((s) => s.id === btn.dataset.add);
      if (existing) existing.qty += 1;
      else state.selected.push({ id: btn.dataset.add, qty: 1 });
    });
    search.value = '';
    query = '';
  });

  document.getElementById('selected-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-action]');
    if (!btn) return;
    const id = btn.closest('li').dataset.id;
    ctx.update((state) => {
      const idx = state.selected.findIndex((s) => s.id === id);
      if (idx === -1) return;
      const sel = state.selected[idx];
      switch (btn.dataset.action) {
        case 'inc': sel.qty += 1; break;
        case 'dec': sel.qty -= 1; if (sel.qty <= 0) state.selected.splice(idx, 1); break;
        case 'remove': state.selected.splice(idx, 1); break;
        case 'up': if (idx > 0) [state.selected[idx - 1], state.selected[idx]] = [sel, state.selected[idx - 1]]; break;
        case 'down': if (idx < state.selected.length - 1) [state.selected[idx + 1], state.selected[idx]] = [sel, state.selected[idx + 1]]; break;
      }
    });
  });
}

function renderResults(ctx) {
  const { state, data, itemsById, stationsById } = ctx;
  const lang = state.lang;
  const box = document.getElementById('search-results');
  if (!query) {
    box.innerHTML = '';
    box.hidden = true;
    return;
  }
  const hits = data.items.filter(
    (it) => it.type === 'craftable' && matches(localName(it, lang), query),
  ).slice(0, 12);
  box.hidden = false;
  box.innerHTML = hits.length
    ? hits.map((it) => {
        const station = localName(stationsById.get(it.station), lang);
        return `<li><button type="button" data-add="${esc(it.id)}">
            <span class="result-name">${esc(localName(it, lang))}</span>
            <span class="result-station">${esc(station)}</span>
          </button></li>`;
      }).join('')
    : `<li class="empty">${esc(t(lang, 'no_results'))}</li>`;
}

export function renderPicker(ctx) {
  const { state, itemsById, stationsById } = ctx;
  const lang = state.lang;
  renderResults(ctx);

  document.getElementById('allocation-hint').textContent =
    state.selected.length > 1 ? t(lang, 'allocation_hint') : '';

  const list = document.getElementById('selected-list');
  if (!state.selected.length) {
    list.innerHTML = `<li class="empty">${esc(t(lang, 'empty_selection'))}</li>`;
    return;
  }

  const flags = allocate(state.selected, state.inventory, itemsById);
  list.innerHTML = state.selected.map((sel, idx) => {
    const item = itemsById.get(sel.id);
    const flag = flags[idx];
    const station = localName(stationsById.get(item.station), lang);
    const missing = [...flag.shortfall]
      .map(([id, qty]) => `${qty}× ${localName(itemsById.get(id), lang)}`)
      .join(', ');
    return `<li data-id="${esc(sel.id)}" class="${flag.craftable ? 'ok' : ''}">
      <div class="sel-main">
        <span class="sel-name">${esc(localName(item, lang))}
          ${item.unverified ? `<small class="unverified" title="${esc(t(lang, 'unverified'))}">≈</small>` : ''}
        </span>
        <span class="sel-station">${esc(t(lang, 'made_at', { station }))}</span>
        ${flag.craftable
          ? `<span class="badge ok-badge">✓ ${esc(t(lang, 'craftable'))}</span>`
          : `<span class="badge missing-badge">${esc(t(lang, 'missing'))} ${esc(missing)}</span>`}
      </div>
      <div class="sel-controls">
        <button type="button" data-action="dec" aria-label="${esc(t(lang, 'decrement'))}">−</button>
        <span class="qty" aria-label="${esc(t(lang, 'qty'))}">${sel.qty}</span>
        <button type="button" data-action="inc" aria-label="${esc(t(lang, 'increment'))}">+</button>
        <button type="button" data-action="up" aria-label="${esc(t(lang, 'move_up'))}" ${idx === 0 ? 'disabled' : ''}>▲</button>
        <button type="button" data-action="down" aria-label="${esc(t(lang, 'move_down'))}" ${idx === state.selected.length - 1 ? 'disabled' : ''}>▼</button>
        <button type="button" data-action="remove" aria-label="${esc(t(lang, 'remove'))}">✕</button>
      </div>
    </li>`;
  }).join('');
}
