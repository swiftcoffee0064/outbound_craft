// Persisted app state: language, selected crafts (order = allocation priority),
// shared gathered-resource pool, expanded tree nodes. One localStorage blob.

const KEY = 'outbound_craft.v1';
const SCHEMA_VERSION = 1;

export function defaultState() {
  const lang = (navigator.language || 'en').toLowerCase().startsWith('fr') ? 'fr' : 'en';
  return { schemaVersion: SCHEMA_VERSION, lang, selected: [], inventory: {}, expanded: [] };
}

// Drops ids that no longer exist in the loaded data so stale storage can't break rendering.
export function loadState(itemsById) {
  let raw;
  try {
    raw = JSON.parse(localStorage.getItem(KEY));
  } catch {
    raw = null;
  }
  if (!raw || raw.schemaVersion !== SCHEMA_VERSION) return defaultState();
  const state = defaultState();
  if (raw.lang === 'fr' || raw.lang === 'en') state.lang = raw.lang;
  if (Array.isArray(raw.selected)) {
    state.selected = raw.selected.filter(
      (s) => itemsById.get(s?.id)?.type === 'craftable' && Number.isInteger(s.qty) && s.qty > 0,
    ).map((s) => ({ id: s.id, qty: s.qty }));
  }
  if (raw.inventory && typeof raw.inventory === 'object') {
    for (const [id, qty] of Object.entries(raw.inventory)) {
      if (itemsById.has(id) && Number.isInteger(qty) && qty > 0) state.inventory[id] = qty;
    }
  }
  if (Array.isArray(raw.expanded)) state.expanded = raw.expanded.filter((k) => typeof k === 'string');
  return state;
}

let saveTimer;
export function saveState(state) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      // storage full or unavailable — app keeps working in-memory
    }
  }, 150);
}
