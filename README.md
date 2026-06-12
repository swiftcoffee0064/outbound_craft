# Outbound Craft

A mobile-first, installable PWA that works as a **crafting shopping list** for the indie game
[Outbound](https://store.steampowered.com/app/2681030/Outbound/).

Pick crafts (e.g. 2× Battery Components), see every resource you need, tick quantities off as you
gather them, and get a **Craftable ✓** flag when a craft is fully covered. The whole UI — including
item and station names — switches between **English and French**.

## Features

- **Shopping list**: add craftable items with quantities; raw resource needs are aggregated across
  the whole selection.
- **Expandable breakdown tree**: each craft expands from intermediate components (Electronics,
  Sheet Metal…) down to raw gatherable resources.
- **Shared gathered pool**: +/− steppers track what you've gathered; one pool counts toward every
  craft needing that resource. Persisted in `localStorage`.
- **Craftable flag**: resources are allocated to crafts top-to-bottom (reorder with ▲▼); a craft is
  flagged ✓ only when its full requirement is covered.
- **EN/FR toggle** at runtime; French falls back to English where a translation is missing.
- **Offline-capable PWA**: install it from your phone's browser ("Add to Home Screen").

## Run locally

No build step, no dependencies. Serve the repo root with any static server:

```sh
npm run serve            # python3 -m http.server 8080
# open http://localhost:8080
```

## Tests & data validation

```sh
npm test                 # validates data/data.json + runs unit tests (node --test)
```

## Game data — corrections welcome

All recipes live in **`data/data.json`** (single source of truth): `items` with
`name: {en, fr}`, `type: "raw" | "craftable"`, `station`, `ingredients: [{id, qty}]`, optional
`output` (units produced per craft).

Recipes were assembled from the Steam Community databases ([Production Stations](https://steamcommunity.com/sharedfiles/filedetails/?id=3725074523),
[Tools](https://steamcommunity.com/sharedfiles/filedetails/?id=3725411744),
[Resources](https://steamcommunity.com/sharedfiles/filedetails/?id=3724167433)) cross-checked with
outbound.wikily.gg and outboundalmanac.com. Items marked **`"unverified": true`** have *estimated
quantities or uncertain ingredient names* — shown
with a `≈` marker in the app. To correct a recipe, edit the quantities in `data.json` (ids never
need to change), bump the top-level `"version"`, and run `npm test`.

## Deployment (GitHub Pages)

`deploy.yml` publishes the repo root to GitHub Pages on every push to `main` (tests gate the
deploy). **One-time setup**: in the repo settings → *Pages* → set *Source* to **GitHub Actions**.

**Release step**: when shell files (HTML/CSS/JS/icons) change, bump `CACHE_VERSION` in `sw.js` so
installed clients pick up the new version. `data/data.json` is fetched network-first, so data
corrections appear without a cache bump.

## Manual smoke checklist

1. Add **2× Battery Components** → breakdown shows 2× Electronics, 4× Sheet Metal, 8× Bolts;
   shopping list shows **32× Scrap Metal** (each unit reduces to 16).
2. Expand Electronics in the tree → raw counts appear (`gathered/needed`).
3. Tap + on Scrap Metal until 32/32 → the craft flips to **✓ Craftable**, list shows all done.
4. Toggle **FR** → UI and item names switch (Tôle, Boulons, Ferraille…).
5. Reload → selection, gathered counts and language persist.
