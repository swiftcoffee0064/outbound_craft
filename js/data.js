import { indexItems } from './calc.js';

// Relative path: works at /outbound_craft/ on GitHub Pages and on localhost.
// The service worker serves it network-first so recipe fixes show up immediately.
export async function loadData() {
  const res = await fetch('./data/data.json');
  if (!res.ok) throw new Error(`data.json: HTTP ${res.status}`);
  const data = await res.json();
  return {
    data,
    itemsById: indexItems(data),
    stationsById: new Map(data.stations.map((s) => [s.id, s])),
  };
}
