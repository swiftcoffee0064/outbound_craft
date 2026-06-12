import { loadData } from './data.js';
import { loadState, saveState } from './state.js';
import { t } from './i18n.js';
import { initPicker, renderPicker } from './ui/picker.js';
import { initTree, renderTree } from './ui/tree.js';
import { initInventory, renderInventory } from './ui/inventory.js';

async function boot() {
  let loaded;
  try {
    loaded = await loadData();
  } catch (err) {
    console.error(err);
    document.getElementById('app-error').hidden = false;
    document.getElementById('app-error').textContent = t('en', 'load_error');
    return;
  }
  const { data, itemsById, stationsById } = loaded;
  const state = loadState(itemsById);

  const ctx = {
    data,
    itemsById,
    stationsById,
    state,
    // Single mutation entry point: mutate, persist (debounced), re-render.
    update(mutator) {
      mutator(state);
      saveState(state);
      render();
    },
  };

  function render() {
    document.documentElement.lang = state.lang;
    document.title = t(state.lang, 'app_title');
    document.getElementById('app-title').textContent = t(state.lang, 'app_title');
    document.getElementById('data-version').textContent = t(state.lang, 'data_version', { n: data.version });
    const langBtn = document.getElementById('lang-toggle');
    langBtn.textContent = state.lang === 'en' ? 'FR' : 'EN';
    langBtn.setAttribute('aria-label', t(state.lang, 'switch_lang'));
    document.getElementById('crafts-heading').textContent = t(state.lang, 'crafts');
    document.getElementById('breakdown-heading').textContent = t(state.lang, 'breakdown');
    document.getElementById('shopping-heading').textContent = t(state.lang, 'shopping_list');
    document.getElementById('craft-search').placeholder = t(state.lang, 'search_placeholder');
    renderPicker(ctx);
    renderTree(ctx);
    renderInventory(ctx);
  }

  document.getElementById('lang-toggle').addEventListener('click', () => {
    ctx.update((s) => {
      s.lang = s.lang === 'en' ? 'fr' : 'en';
    });
  });

  initPicker(ctx);
  initTree(ctx);
  initInventory(ctx);
  render();
}

boot();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch((err) => console.warn('SW registration failed', err));
  });
}
