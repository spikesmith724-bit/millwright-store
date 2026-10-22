// Builds src/data/catalog.json: Tillson's Tool Store items (scripts/tillson-items.json, from extract-catalog.mjs)
// plus real Amazon listings found by research-amazon.py (scripts/research.json). Dedupe by ASIN; Tillson rows win.
// Drops any ASIN listed in scripts/dropped-asins.json (404 on /dp/ during verification).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const read = (p, d) => (existsSync(new URL(p, import.meta.url)) ? JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8')) : d);
const tillson = read('./tillson-items.json', []);
const research = [...read('./research.json', []), ...read('./research2.json', []), ...read('./research-web.json', []).map((r) => ({ ...r, image: null, price: null, fetched: null }))];
const dropped = new Set([...read('./dropped-asins.json', []), ...read('./excluded-asins.json', [])]); // 404s + off-topic picks
const SUB = read('./research-subcategories.json', {});

function sectionForTillson(category, subcategory, title) {
  const t = title.toLowerCase();
  if (subcategory === 'Torque' || /flange (spreader|wedge)|banana wedge/.test(t)) return 'bolting';
  if (subcategory === 'Rigging & lifting') return 'rigging';
  if (/shim|laser shaft alignment/.test(t)) return 'shims';
  if (subcategory === 'Layout' || /combination (square|set)|steel rule|scriber|center punch/.test(t)) return 'layout';
  return { precision: 'precision', power: 'power', ppe: 'ppe', rigging: 'rigging' }[category] ?? 'hand';
}
const CAT = { hand: 'hand', precision: 'precision', bolting: 'hand', rigging: 'rigging', power: 'power', ppe: 'ppe', lubrication: 'other', storage: 'other', machinist: 'other', shims: 'other', layout: 'hand' };
const out = [];
const seen = new Set();
for (const r of tillson) {
  if (dropped.has(r.asin) || seen.has(r.asin)) continue;
  seen.add(r.asin);
  out.push({ ...r, section: sectionForTillson(r.category, r.subcategory, r.title) });
}
// Search pages sometimes mix in unrelated listings; keep a row only if its title shares a product word with the query.
const STOP = new Set(['heavy', 'duty', 'with', 'inch', 'work', 'drive', 'lifting', 'forged', 'machinist', 'brown', 'sharpe']);
const relevant = (r) => {
  const words = r.query.toLowerCase().replace(/gauge/g, 'gage').replace(/-/g, '').replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter((w) => w.length >= 3 && !STOP.has(w));
  const t = `${r.brand ?? ''} ${r.title}`.toLowerCase().replace(/gauge/g, 'gage').replace(/[^a-z0-9]+/g, '');
  return words.some((w) => t.includes(w.slice(0, 5)));
};
let order = 5000;
for (const r of research) {
  if (dropped.has(r.asin) || seen.has(r.asin) || !relevant(r)) continue;
  seen.add(r.asin);
  const brand = r.brand?.trim();
  const title = brand && !r.title.toLowerCase().includes(brand.toLowerCase()) ? `${brand} ${r.title}` : r.title;
  const date = r.fetched ?? '2026-10-21';
  out.push({
    id: r.asin, title: title.length > 140 ? `${title.slice(0, 137).trim()}…` : title, note: null, category: CAT[r.cat] ?? 'other', section: r.cat,
    subcategory: SUB[r.query] ?? null, asin: r.asin, url: `https://www.amazon.com/dp/${r.asin}`, image_url: r.image && r.image.replace(/\._AC_[^.]+_\./, '._AC_SL600_.'),
    price_usd: r.price, price_seen: r.price == null ? null : date, sort_order: order++, active: true, crew_pick: false, crew_note: null, tags: [],
    price_current: r.price, price_typical: r.price, price_low: r.price, price_checked_at: null, is_deal: false, source: 'amazon-search',
  });
}
writeFileSync(new URL('../src/data/catalog.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
const counts = {};
for (const i of out) counts[i.section] = (counts[i.section] ?? 0) + 1;
console.log(out.length, counts);
