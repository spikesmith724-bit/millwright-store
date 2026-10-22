// One-time: builds src/data/catalog.json from Tillson's Tool Store migrations + the latest price-refresh log.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
const dir = process.argv[2] ?? '/workspace/tillson-app/supabase/migrations';
const logPath = process.argv[3] ?? '/workspace/tillson-price-refresh-2026-10-20.log';
function parseTuple(s) { // s like ('a', null, 1, array['x'])
  const out = []; let i = 0;
  while (i < s.length) {
    const c = s[i];
    if (c === "'") { let v = ''; i++; for (;;) { if (s[i] === "'" && s[i + 1] === "'") { v += "'"; i += 2; } else if (s[i] === "'") { i++; break; } else v += s[i++]; } out.push(v); }
    else if (s.startsWith('array[', i)) { const end = s.indexOf(']', i); out.push(parseTuple(s.slice(i + 6, end))); i = end + 1; }
    else if (/[\d.-]/.test(c)) { const m = /^[\d.-]+/.exec(s.slice(i))[0]; out.push(Number(m)); i += m.length; }
    else if (s.startsWith('null', i)) { out.push(null); i += 4; }
    else if (s.startsWith('true', i)) { out.push(true); i += 4; }
    else if (s.startsWith('false', i)) { out.push(false); i += 5; }
    else i++;
  }
  return out;
}
const items = new Map();
let essentials = [];
for (const f of readdirSync(dir).sort()) {
  const sql = readFileSync(`${dir}/${f}`, 'utf8');
  if (!sql.includes('tillson_shop_items')) continue;
  for (const m of sql.matchAll(/insert into public\.tillson_shop_items \(([^)]+)\)\s*values\s*([\s\S]*?)on conflict/g)) {
    const cols = m[1].split(',').map((c) => c.trim());
    for (const line of m[2].split('\n')) {
      const t = line.trim().replace(/,$/, '');
      if (!t.startsWith('(')) continue;
      const vals = parseTuple(t.slice(1, -1));
      const row = Object.fromEntries(cols.map((c, k) => [c, vals[k]]));
      if (typeof row.title !== 'string' || !/^[A-Z0-9]{10}$/.test(row.asin ?? '')) continue;
      if (!items.has(row.asin)) items.set(row.asin, row);
    }
  }
  const e = /set tags = array\(select distinct unnest\(tags \|\| array\['essential'\]\)\)\s*where asin in \(([^)]+)\)/.exec(sql);
  if (e) essentials = parseTuple(e[1]);
}
// Promotion migration tag rules (applied where tags were empty)
function autoTags(r) {
  const t = r.title.toLowerCase(), s = r.subcategory;
  if (s === 'Indicators') return ['alignment', 'clearances'];
  if (s === 'Alignment' || s === 'Levels & straight edges') return ['alignment'];
  if (s === 'Torque') return ['torque'];
  if (s === 'Gauges' || s === 'Micrometers & calipers') return ['clearances'];
  if (s === 'Pry bars & pullers' && t.includes('puller')) return ['bearings'];
  if (t.includes('bearing heater')) return ['bearings', 'temperature'];
  if (t.includes('thermometer')) return ['temperature', 'bearings'];
  if (t.includes('vibration') || t.includes('tachometer')) return ['vibration', 'bearings'];
  if (s === 'Shims & lights' && t.includes('shim')) return ['alignment'];
  if (s === 'Hammers' && t.includes('dead blow')) return ['alignment'];
  if (s === 'Wrenches & sockets') return ['torque'];
  return [];
}
const log = new Map();
for (const line of readFileSync(logPath, 'utf8').split('\n')) {
  const m = /^\s*\d+\s+([A-Z0-9]{10})\s+\$([\d.]+)/.exec(line);
  if (m) log.set(m[1], Number(m[2]));
}
const out = [...items.values()].map((r, k) => {
  const base = r.price_usd ?? null;
  const current = log.get(r.asin) ?? r.price_current ?? base;
  const tags = r.tags && r.tags.length ? [...r.tags] : autoTags(r);
  if (essentials.includes(r.asin) && !tags.includes('essential')) tags.push('essential');
  const typical = r.price_typical ?? base ?? current;
  const low = Math.min(...[r.price_low ?? base ?? current, current].filter((x) => x != null)) ;
  return {
    id: r.asin, title: r.title, note: r.note ?? null, category: r.category, subcategory: r.subcategory ?? null,
    asin: r.asin, url: r.url, image_url: r.image_url ?? null, price_usd: current, price_seen: log.has(r.asin) ? '2026-10-20' : (r.price_seen ?? null),
    section: null, source: 'tillson', sort_order: r.sort_order ?? 1000, active: true, crew_pick: false, crew_note: null, tags,
    price_current: current, price_typical: typical, price_low: Number.isFinite(low) ? low : null,
    price_checked_at: log.has(r.asin) ? '2026-10-20T00:00:00Z' : null,
    is_deal: current != null && typical != null && current <= typical * 0.9,
  };
});
writeFileSync(new URL('./tillson-items.json', import.meta.url), JSON.stringify(out, null, 1) + '\n');
console.log(`items ${out.length}, essentials ${out.filter((i) => i.tags.includes('essential')).length}, logPrices ${out.filter((i) => log.has(i.asin)).length}, deals ${out.filter((i) => i.is_deal).length}`);
const by = {}; for (const i of out) by[`${i.category}/${i.subcategory}`] = (by[`${i.category}/${i.subcategory}`] ?? 0) + 1; console.log(by);
