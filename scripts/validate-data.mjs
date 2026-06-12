#!/usr/bin/env node
// Validates data/data.json: structure, referential integrity, DAG (no recipe cycles).
// Exits non-zero on errors; missing French names and unverified recipes are warnings only.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const file = join(root, 'data', 'data.json');

const errors = [];
const warnings = [];

let data;
try {
  data = JSON.parse(readFileSync(file, 'utf8'));
} catch (e) {
  console.error(`✗ ${file}: ${e.message}`);
  process.exit(1);
}

if (!Number.isInteger(data.version)) errors.push('top-level "version" must be an integer');
if (!Array.isArray(data.stations)) errors.push('"stations" must be an array');
if (!Array.isArray(data.items)) errors.push('"items" must be an array');

const stationIds = new Set();
for (const s of data.stations ?? []) {
  if (typeof s.id !== 'string' || !/^[a-z0-9_]+$/.test(s.id)) errors.push(`station id invalid: ${JSON.stringify(s.id)}`);
  if (stationIds.has(s.id)) errors.push(`duplicate station id: ${s.id}`);
  stationIds.add(s.id);
  if (typeof s.name?.en !== 'string') errors.push(`station ${s.id}: missing name.en`);
  if (typeof s.name?.fr !== 'string') warnings.push(`station ${s.id}: missing name.fr (will fall back to English)`);
}

const itemIds = new Set();
for (const it of data.items ?? []) {
  if (typeof it.id !== 'string' || !/^[a-z0-9_]+$/.test(it.id)) errors.push(`item id invalid: ${JSON.stringify(it.id)}`);
  if (itemIds.has(it.id)) errors.push(`duplicate item id: ${it.id}`);
  itemIds.add(it.id);
  if (typeof it.name?.en !== 'string') errors.push(`item ${it.id}: missing name.en`);
  if (typeof it.name?.fr !== 'string') warnings.push(`item ${it.id}: missing name.fr (will fall back to English)`);
  if (it.unverified) warnings.push(`item ${it.id}: recipe marked unverified`);

  if (it.type === 'raw') {
    if (it.station || it.ingredients) errors.push(`item ${it.id}: raw items must not have station/ingredients`);
  } else if (it.type === 'craftable') {
    if (!stationIds.has(it.station)) errors.push(`item ${it.id}: unknown station ${JSON.stringify(it.station)}`);
    if (!Array.isArray(it.ingredients) || it.ingredients.length === 0) {
      errors.push(`item ${it.id}: craftable items need a non-empty ingredients array`);
    } else {
      const seen = new Set();
      for (const ing of it.ingredients) {
        if (typeof ing.id !== 'string') errors.push(`item ${it.id}: ingredient without id`);
        if (seen.has(ing.id)) errors.push(`item ${it.id}: duplicate ingredient ${ing.id}`);
        seen.add(ing.id);
        if (!Number.isInteger(ing.qty) || ing.qty < 1) errors.push(`item ${it.id}: ingredient ${ing.id} qty must be a positive integer`);
      }
    }
    if (it.output !== undefined && (!Number.isInteger(it.output) || it.output < 1)) {
      errors.push(`item ${it.id}: output must be a positive integer`);
    }
  } else {
    errors.push(`item ${it.id}: type must be "raw" or "craftable", got ${JSON.stringify(it.type)}`);
  }
}

// Referential integrity of ingredient ids (after all ids are known).
for (const it of data.items ?? []) {
  for (const ing of it.ingredients ?? []) {
    if (ing.id && !itemIds.has(ing.id)) errors.push(`item ${it.id}: unknown ingredient ${ing.id}`);
  }
}

// Cycle detection (DFS coloring) — recipes must form a DAG.
const byId = new Map((data.items ?? []).map((i) => [i.id, i]));
const color = new Map(); // undefined=white, 1=in progress, 2=done
function visit(id, path) {
  if (color.get(id) === 2) return;
  if (color.get(id) === 1) {
    errors.push(`recipe cycle: ${[...path, id].join(' -> ')}`);
    return;
  }
  color.set(id, 1);
  for (const ing of byId.get(id)?.ingredients ?? []) {
    if (byId.has(ing.id)) visit(ing.id, [...path, id]);
  }
  color.set(id, 2);
}
for (const id of itemIds) visit(id, []);

for (const w of warnings) console.warn(`⚠ ${w}`);
if (errors.length) {
  for (const e of errors) console.error(`✗ ${e}`);
  console.error(`\n${errors.length} error(s) in data/data.json`);
  process.exit(1);
}
console.log(`✓ data/data.json valid: ${data.stations.length} stations, ${data.items.length} items (${warnings.length} warning(s))`);
