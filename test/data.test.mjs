import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { indexItems, expandToRaw, aggregateRaw } from '../js/calc.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(readFileSync(join(root, 'data', 'data.json'), 'utf8'));
const itemsById = indexItems(data);

test('every item expands to raw resources without throwing (DAG, no dangling refs)', () => {
  const memo = new Map();
  for (const item of data.items) {
    const raw = expandToRaw(item.id, itemsById, memo);
    for (const [rawId, qty] of raw) {
      assert.equal(itemsById.get(rawId).type, 'raw', `${item.id} expanded to non-raw ${rawId}`);
      assert.ok(qty > 0);
    }
  }
});

test('anchor recipe: 2× Battery Components level-1 ingredients', () => {
  const bc = itemsById.get('battery_components');
  assert.deepEqual(
    bc.ingredients.map((i) => [i.id, i.qty * 2]),
    [['electronics', 2], ['sheet_metal', 4], ['bolts', 8]],
  );
});

test('anchor recipe: Battery Components fully reduce to scrap metal only', () => {
  // electronics(2 bolts + 1 sheet) + 2 sheet + 4 bolts = 6 bolts + 3 sheet = 18 scrap
  assert.deepEqual([...aggregateRaw([{ id: 'battery_components', qty: 1 }], itemsById)], [['scrap_metal', 18]]);
});

test('all stations referenced by craftables exist', () => {
  const stations = new Set(data.stations.map((s) => s.id));
  for (const item of data.items) {
    if (item.type === 'craftable') assert.ok(stations.has(item.station), `${item.id}: station ${item.station}`);
  }
});
