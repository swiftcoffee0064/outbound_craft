import test from 'node:test';
import assert from 'node:assert/strict';
import { indexItems, expandToRaw, requirementFor, aggregateRaw, buildTree, allocate, shoppingList } from '../js/calc.js';

// Synthetic diamond DAG: gadget -> 1 widget + 2 plate; widget -> 2 plate + 1 ore; plate -> 2 ore.
// Shared sub-ingredient (plate/ore) must aggregate via path multiplication, not double-count.
const fixture = {
  items: [
    { id: 'ore', name: { en: 'Ore' }, type: 'raw' },
    { id: 'plate', name: { en: 'Plate' }, type: 'craftable', station: 's', ingredients: [{ id: 'ore', qty: 2 }] },
    {
      id: 'widget', name: { en: 'Widget' }, type: 'craftable', station: 's',
      ingredients: [{ id: 'plate', qty: 2 }, { id: 'ore', qty: 1 }],
    },
    {
      id: 'gadget', name: { en: 'Gadget' }, type: 'craftable', station: 's',
      ingredients: [{ id: 'widget', qty: 1 }, { id: 'plate', qty: 2 }],
    },
    // output > 1: one craft yields 4 nails from 1 plate => 0.25 plate (0.5 ore) per nail.
    { id: 'nails', name: { en: 'Nails' }, type: 'craftable', station: 's', output: 4, ingredients: [{ id: 'plate', qty: 1 }] },
  ],
};
const itemsById = indexItems(fixture);

test('expandToRaw: raw item is itself', () => {
  assert.deepEqual([...expandToRaw('ore', itemsById)], [['ore', 1]]);
});

test('expandToRaw: diamond DAG sums shared sub-ingredients without double-counting', () => {
  // gadget = widget(2 plate + 1 ore) + 2 plate = 4 plate + 1 ore = 9 ore total
  assert.deepEqual([...expandToRaw('gadget', itemsById)], [['ore', 9]]);
});

test('expandToRaw: memo is shared and stable across calls', () => {
  const memo = new Map();
  expandToRaw('gadget', itemsById, memo);
  assert.deepEqual([...expandToRaw('widget', itemsById, memo)], [['ore', 5]]);
});

test('requirementFor: output > 1 keeps fractions per unit, ceils per craft', () => {
  assert.deepEqual([...expandToRaw('nails', itemsById)], [['ore', 0.5]]);
  assert.deepEqual([...requirementFor('nails', 1, itemsById)], [['ore', 1]]); // ceil(0.5)
  assert.deepEqual([...requirementFor('nails', 4, itemsById)], [['ore', 2]]); // ceil(2.0), not 4×ceil(0.5)
});

test('aggregateRaw: sums requirements across the selection', () => {
  const total = aggregateRaw([{ id: 'gadget', qty: 2 }, { id: 'plate', qty: 1 }], itemsById);
  assert.deepEqual([...total], [['ore', 20]]); // 2×9 + 2
});

test('buildTree: per-node quantities multiply down the tree', () => {
  const tree = buildTree('gadget', 2, itemsById);
  assert.equal(tree.qty, 2);
  const widget = tree.children.find((c) => c.id === 'widget');
  const plate = tree.children.find((c) => c.id === 'plate');
  assert.equal(widget.qty, 2);
  assert.equal(plate.qty, 4);
  assert.equal(widget.children.find((c) => c.id === 'plate').qty, 4);
  assert.equal(plate.children[0].qty, 8); // ore under direct plates
});

test('allocate: greedy in list order, full requirement only, consumes pool', () => {
  // gadget needs 9 ore, plate needs 2. Pool of 10: gadget ✓ (consumes 9), plate ✗ (1 left).
  const flags = allocate([{ id: 'gadget', qty: 1 }, { id: 'plate', qty: 1 }], { ore: 10 }, itemsById);
  assert.equal(flags[0].craftable, true);
  assert.equal(flags[1].craftable, false);
  assert.deepEqual([...flags[1].shortfall], [['ore', 1]]);
});

test('allocate: a failed craft consumes nothing, later cheaper crafts can still pass', () => {
  const flags = allocate([{ id: 'gadget', qty: 1 }, { id: 'plate', qty: 1 }], { ore: 5 }, itemsById);
  assert.equal(flags[0].craftable, false);
  assert.deepEqual([...flags[0].shortfall], [['ore', 4]]);
  assert.equal(flags[1].craftable, true); // 5 ore untouched covers plate's 2
});

test('allocate: order matters (reordering flips which craft wins the pool)', () => {
  const a = allocate([{ id: 'widget', qty: 1 }, { id: 'plate', qty: 1 }], { ore: 6 }, itemsById);
  assert.deepEqual(a.map((f) => f.craftable), [true, false]); // widget takes 5, 1 left
  const b = allocate([{ id: 'plate', qty: 1 }, { id: 'widget', qty: 1 }], { ore: 6 }, itemsById);
  assert.deepEqual(b.map((f) => f.craftable), [true, false]); // plate takes 2, 4 < 5
});

test('shoppingList: remaining is against un-allocated totals, never negative', () => {
  const rows = shoppingList([{ id: 'gadget', qty: 1 }], { ore: 100 }, itemsById);
  assert.deepEqual(rows, [{ id: 'ore', needed: 9, gathered: 100, remaining: 0 }]);
});

test('unknown item throws', () => {
  assert.throws(() => expandToRaw('nope', itemsById), /Unknown item/);
});
