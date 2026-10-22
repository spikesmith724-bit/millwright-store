# Millwright Store

Standalone Expo (SDK 57, expo-router) tool store for millwrights and machinists, built from the Tool Store in the Tillson app.
Every product is a real Amazon listing (`amazon.com/dp/<ASIN>`); links carry the Associates tag `tillsontools-20`.

- Catalog: `src/data/catalog.json` (edit or extend here). Sections: `src/lib/sections.ts`; each has a route `/category/<slug>`.
- Build the catalog: `node scripts/extract-catalog.mjs` (Tillson items) → `python3 scripts/research-amazon.py > scripts/research.json` → `node scripts/build-catalog.mjs`.
- Prices: `npm run refresh-prices` (ported Tillson pipeline, writes the JSON). Prices show the date they were checked; no price shows "See price on Amazon".
- `npm test`, `npm run typecheck`, `npm run export:pages` (GitHub Pages build with 404.html, .nojekyll and per-route index.html).
