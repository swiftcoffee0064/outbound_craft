import { t, localName } from '../i18n.js';
import { shoppingList } from '../calc.js';
import { esc } from './html.js';

export function initInventory(ctx) {
  document.getElementById('shopping-list').addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-step]');
    if (!btn) return;
    const id = btn.closest('li').dataset.id;
    const delta = btn.dataset.step === '+' ? 1 : -1;
    ctx.update((state) => {
      const next = (state.inventory[id] ?? 0) + delta;
      if (next <= 0) delete state.inventory[id];
      else state.inventory[id] = next;
    });
  });

  document.getElementById('reset-gathered').addEventListener('click', () => {
    if (!confirm(t(ctx.state.lang, 'reset_confirm'))) return;
    ctx.update((state) => {
      state.inventory = {};
    });
  });
}

export function renderInventory(ctx) {
  const { state, itemsById } = ctx;
  const lang = state.lang;
  const list = document.getElementById('shopping-list');
  const resetBtn = document.getElementById('reset-gathered');
  resetBtn.textContent = t(lang, 'reset_gathered');

  if (!state.selected.length) {
    list.innerHTML = `<li class="empty">${esc(t(lang, 'empty_selection'))}</li>`;
    resetBtn.hidden = true;
    return;
  }
  resetBtn.hidden = false;

  const rows = shoppingList(state.selected, state.inventory, itemsById);
  const allDone = rows.every((r) => r.remaining === 0);
  list.innerHTML = (allDone ? `<li class="all-done">✓ ${esc(t(lang, 'all_gathered'))}</li>` : '')
    + rows.map((row) => {
      const item = itemsById.get(row.id);
      return `<li data-id="${esc(row.id)}" class="${row.remaining === 0 ? 'done' : ''}">
        <span class="res-name">${esc(localName(item, lang))}</span>
        <span class="res-counts">
          <span class="res-progress">${row.gathered}/${row.needed}</span>
          ${row.remaining === 0
            ? `<span class="badge ok-badge">✓ ${esc(t(lang, 'done'))}</span>`
            : `<span class="badge todo-badge">${row.remaining} ${esc(t(lang, 'remaining'))}</span>`}
        </span>
        <span class="res-steppers">
          <button type="button" data-step="-" aria-label="${esc(t(lang, 'decrement'))}" ${row.gathered === 0 ? 'disabled' : ''}>−</button>
          <button type="button" data-step="+" aria-label="${esc(t(lang, 'increment'))}">+</button>
        </span>
      </li>`;
    }).join('');
}
