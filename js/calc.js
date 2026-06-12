// Pure crafting math — no DOM, no state. Unit-tested in test/calc.test.mjs.
//
// Recipes form a DAG. expandToRaw memoizes per item so shared sub-ingredients
// (diamond shapes) are summed along each path exactly once, never re-walked.

export function indexItems(data) {
  return new Map(data.items.map((item) => [item.id, item]));
}

// Map<rawId, quantity needed per single unit of itemId> (may be fractional when output > 1).
export function expandToRaw(itemId, itemsById, memo = new Map()) {
  const cached = memo.get(itemId);
  if (cached) return cached;
  const item = itemsById.get(itemId);
  if (!item) throw new Error(`Unknown item: ${itemId}`);
  let result;
  if (item.type === 'raw') {
    result = new Map([[itemId, 1]]);
  } else {
    result = new Map();
    const output = item.output ?? 1;
    for (const ing of item.ingredients) {
      for (const [rawId, perUnit] of expandToRaw(ing.id, itemsById, memo)) {
        result.set(rawId, (result.get(rawId) ?? 0) + (ing.qty / output) * perUnit);
      }
    }
  }
  memo.set(itemId, result);
  return result;
}

// Whole-craft requirement: ceil applied per raw at the craft level (not inside
// the memoized per-unit maps), so fractional per-unit costs round up once.
export function requirementFor(itemId, qty, itemsById, memo = new Map()) {
  const req = new Map();
  for (const [rawId, perUnit] of expandToRaw(itemId, itemsById, memo)) {
    req.set(rawId, Math.ceil(perUnit * qty));
  }
  return req;
}

// Total raw needs across the whole selection. selected: [{id, qty}]
export function aggregateRaw(selected, itemsById, memo = new Map()) {
  const total = new Map();
  for (const sel of selected) {
    for (const [rawId, qty] of requirementFor(sel.id, sel.qty, itemsById, memo)) {
      total.set(rawId, (total.get(rawId) ?? 0) + qty);
    }
  }
  return total;
}

// Per-selection breakdown tree; qty at each node is the total needed for that selection.
export function buildTree(itemId, multiplier, itemsById) {
  const item = itemsById.get(itemId);
  if (!item) throw new Error(`Unknown item: ${itemId}`);
  const node = { id: itemId, qty: multiplier, type: item.type, children: [] };
  if (item.type === 'craftable') {
    const output = item.output ?? 1;
    for (const ing of item.ingredients) {
      node.children.push(buildTree(ing.id, Math.ceil((multiplier * ing.qty) / output), itemsById));
    }
  }
  return node;
}

// Craftable flags with greedy allocation in selection order, no partial credit:
// a craft is ✓ only if the remaining pool covers its FULL raw requirement; if so
// the requirement is consumed from the pool before evaluating the next craft.
// inventory: plain object {rawId: gathered}. Returns [{id, qty, craftable, shortfall: Map}].
export function allocate(selected, inventory, itemsById, memo = new Map()) {
  const pool = new Map(Object.entries(inventory ?? {}));
  return selected.map((sel) => {
    const req = requirementFor(sel.id, sel.qty, itemsById, memo);
    const shortfall = new Map();
    for (const [rawId, qty] of req) {
      const missing = qty - (pool.get(rawId) ?? 0);
      if (missing > 0) shortfall.set(rawId, missing);
    }
    const craftable = shortfall.size === 0;
    if (craftable) {
      for (const [rawId, qty] of req) pool.set(rawId, pool.get(rawId) - qty);
    }
    return { id: sel.id, qty: sel.qty, craftable, shortfall };
  });
}

// Checklist rows against the un-allocated totals: remaining = max(0, needed - gathered).
export function shoppingList(selected, inventory, itemsById, memo = new Map()) {
  const rows = [];
  for (const [rawId, needed] of aggregateRaw(selected, itemsById, memo)) {
    const gathered = inventory?.[rawId] ?? 0;
    rows.push({ id: rawId, needed, gathered, remaining: Math.max(0, needed - gathered) });
  }
  rows.sort((a, b) => b.remaining - a.remaining || a.id.localeCompare(b.id));
  return rows;
}
