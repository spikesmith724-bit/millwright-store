#!/usr/bin/env node
/**
 * Price refresh for the Millwright Store, ported from Tillson's scripts/refresh-tool-prices.mjs.
 * Same Amazon page parsing, deal rule (10% under typical) and exact brand+model swap logic; it reads and writes
 * src/data/catalog.json (and src/data/price-history.json, scripts/price-swaps.json) instead of Supabase.
 *
 *   node scripts/refresh-tool-prices.mjs                 # check every item, save prices and deal flags
 *   node scripts/refresh-tool-prices.mjs --dry-run       # check and print, save nothing
 *   node scripts/refresh-tool-prices.mjs --limit 10      # only the 10 least recently checked items
 *   node scripts/refresh-tool-prices.mjs --delay 4000    # ms between Amazon requests (default 3500)
 *   node scripts/refresh-tool-prices.mjs --drop-missing  # remove listings whose /dp/ page returns 404
 * Rebuild the web export and redeploy after a refresh so the live site shows the new prices.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const args = process.argv.slice(2);
const dry = args.includes('--dry-run');
const limit = Number(args[args.indexOf('--limit') + 1]) || (args.includes('--limit') ? 0 : Infinity);
const delay = Number(args[args.indexOf('--delay') + 1]) || 3500;
const DEAL = 0.10;
const FAR_ABOVE = 0.25;
const dropMissing = args.includes('--drop-missing');
const CATALOG = new URL('../src/data/catalog.json', import.meta.url);
const HISTORY = new URL('../src/data/price-history.json', import.meta.url);
const SWAPS = new URL('./price-swaps.json', import.meta.url);
const readJson = (u, d) => (existsSync(u) ? JSON.parse(readFileSync(u, 'utf8')) : d);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms + Math.random() * 1000));
const money = (s) => { const m = /\$\s*([\d,]+(?:\.\d{2})?)/.exec(s ?? ''); return m ? Number(m[1].replace(/,/g, '')) : null; };
const text = (s) => s.replace(/<[^>]+>/g, ' ').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n))).replace(/&lrm;|&rlm;|\u200e|\u200f/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
const norm = (s) => (s ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');

function get(url) {
  try {
    const out = execFileSync('curl', ['-sL', '--compressed', '--max-time', '30', '-A', UA, '-H', 'Accept-Language: en-US,en;q=0.9',
      '-H', 'Accept: text/html,application/xhtml+xml', '-w', '\n__STATUS__%{http_code}', url], { maxBuffer: 30e6 }).toString('utf8');
    const i = out.lastIndexOf('\n__STATUS__');
    return { status: Number(out.slice(i + 11)), html: out.slice(0, i) };
  } catch {
    return { status: 0, html: '' };
  }
}
const isBlocked = ({ status, html }) => status === 503 || status === 0 || /validateCaptcha|Type the characters you see|api-services-support@amazon\.com/i.test(html.slice(0, 20000));

export function parseProduct(html) {
  const coreAt = html.search(/id="(corePriceDisplay_desktop_feature_div|corePrice_feature_div|corePrice_desktop)"/);
  const core = coreAt >= 0 ? html.slice(coreAt, coreAt + 20000) : '';
  let price = money(/class="aok-offscreen">\s*([^<]+)/.exec(core)?.[1]) ?? money(/class="a-offscreen">([^<]+)</.exec(core)?.[1]);
  const basis = /(?:Typical price|List Price|List:|Was:)[\s\S]{0,600}?class="a-offscreen">([^<]+)</.exec(core) ?? /data-a-strike="true"[\s\S]{0,300}?class="a-offscreen">([^<]+)</.exec(core);
  const listPrice = money(basis?.[1]);
  // Only trust the buy box: the same phrases appear in page-wide JSON for other variants.
  const availAt = html.indexOf('id="availability"');
  const avail = availAt >= 0 ? text(html.slice(availAt, availAt + 1500)).slice(0, 200) : '';
  const unavailable = !price && (/id="outOfStock"/.test(html) || /currently unavailable|out of stock|we don.t know when or if/i.test(avail));
  if (unavailable) price = null;
  const title = text(/id="productTitle"[^>]*>([\s\S]*?)<\/span>/.exec(html)?.[1] ?? '');
  const byline = text(/id="bylineInfo"[^>]*>([\s\S]*?)<\/a>/.exec(html)?.[1] ?? '');
  const brand = byline.replace(/^Visit the\s+/i, '').replace(/\s+Store$/i, '').replace(/^Brand:\s*/i, '').trim() || null;
  const model = text(/Item model number\s*<\/(?:th|span)>[\s\S]{0,200}?<(?:td|span)[^>]*>([\s\S]*?)<\/(?:td|span)>/.exec(html)?.[1] ?? '') ||
    (/Item model number[^A-Za-z0-9]{0,40}([A-Za-z0-9][A-Za-z0-9 ._/-]{1,30})/.exec(text(html.slice(html.indexOf('Item model number'), html.indexOf('Item model number') + 300)))?.[1]?.trim() ?? null);
  return { price, listPrice: listPrice && price && listPrice > price ? listPrice : listPrice, unavailable, title, brand, model: model || null };
}

async function fetchProduct(asin) {
  const res = get(`https://www.amazon.com/dp/${asin}`);
  if (isBlocked(res)) return { status: 'blocked' };
  if (res.status === 404) return { status: 'unavailable', missing: true };
  if (res.status !== 200) return { status: 'error' };
  const p = parseProduct(res.html);
  return { status: p.unavailable ? 'unavailable' : p.price ? 'ok' : 'no-price', ...p };
}

async function findSwap(item, product) {
  const brand = product.brand;
  const model = product.model;
  if (!brand || !model) return null;
  await sleep(delay);
  const res = get(`https://www.amazon.com/s?k=${encodeURIComponent(`${brand} ${model}`)}`);
  if (isBlocked(res)) return { blocked: true };
  const asins = [...new Set([...res.html.matchAll(/data-asin="([A-Z0-9]{10})"/g)].map((m) => m[1]))].filter((a) => a !== item.asin).slice(0, 4);
  for (const asin of asins) {
    await sleep(delay);
    const cand = await fetchProduct(asin);
    if (cand.status === 'blocked') return { blocked: true };
    if (cand.status !== 'ok') continue;
    const exact = norm(cand.brand) === norm(brand) && norm(cand.model) === norm(model);
    const better = !product.price || cand.price < product.price;
    if (better && exact) return { asin, price: cand.price, exact: true, brand, model };
    if (better && norm(cand.title).includes(norm(model))) return { asin, price: cand.price, exact: false, brand, model };
  }
  return null;
}

function median(values) {
  const v = values.filter((x) => typeof x === 'number' && x > 0).sort((a, b) => a - b);
  if (!v.length) return null;
  const m = Math.floor(v.length / 2);
  return v.length % 2 ? v[m] : Math.round(((v[m - 1] + v[m]) / 2) * 100) / 100;
}

async function main() {
  const catalog = readJson(CATALOG, []);
  const history = readJson(HISTORY, {});
  const swaps = readJson(SWAPS, []);
  const today = new Date().toISOString().slice(0, 10);
  const items = catalog.filter((i) => i.active && i.asin).sort((a, b) => String(a.price_checked_at ?? '').localeCompare(String(b.price_checked_at ?? '')) || a.sort_order - b.sort_order);
  const todo = items.slice(0, limit);
  const summary = { checked: 0, ok: 0, deals: 0, unavailable: 0, missing: 0, noPrice: 0, blocked: 0, errors: 0, swapsApplied: 0, swapsSuggested: 0 };
  const drop = new Set();
  for (const [n, item] of todo.entries()) {
    if (n) await sleep(delay);
    const p = await fetchProduct(item.asin);
    summary.checked += 1;
    const recent = (history[item.id] ?? []).filter((h) => h.status === 'ok' && Date.now() - Date.parse(h.at) < 30 * 864e5).map((h) => h.price);
    history[item.id] = [...(history[item.id] ?? []), { at: new Date().toISOString(), price: p.price ?? null, list: p.listPrice ?? null, status: p.status }].slice(-60);
    let note = p.status;
    if (p.status === 'blocked') summary.blocked += 1;
    else if (p.status === 'error') summary.errors += 1;
    else if (p.status === 'no-price') summary.noPrice += 1;
    if (p.status === 'ok') {
      summary.ok += 1;
      const typical = p.listPrice && p.listPrice >= p.price ? p.listPrice : median([...recent, p.price]) ?? Number(item.price_typical) ?? p.price;
      const low = Math.min(p.price, Number(item.price_low) || p.price);
      const deal = typical > 0 && p.price <= typical * (1 - DEAL);
      if (deal) summary.deals += 1;
      note = `$${p.price}${deal ? ` DEAL ${Math.round((1 - p.price / typical) * 100)}% off $${typical}` : ''}`;
      if (!dry) Object.assign(item, { price_current: p.price, price_usd: p.price, price_seen: today, price_typical: typical, price_low: low, is_deal: deal, price_checked_at: new Date().toISOString() });
    } else if (p.status === 'unavailable') {
      summary.unavailable += 1;
      if (p.missing) { summary.missing += 1; if (dropMissing) drop.add(item.id); }
      if (!dry) Object.assign(item, { price_current: null, price_usd: null, is_deal: false, price_checked_at: new Date().toISOString() });
    }
    const typicalNow = Number(item.price_typical) || null;
    const farAbove = p.status === 'ok' && typicalNow && p.price >= typicalNow * (1 + FAR_ABOVE);
    if ((p.status === 'unavailable' && !p.missing) || farAbove) {
      const swap = await findSwap(item, p);
      if (swap?.blocked) summary.blocked += 1;
      else if (swap) {
        const apply = swap.exact && !catalog.some((o) => o.asin === swap.asin);
        if (apply) {
          summary.swapsApplied += 1;
          if (!dry) Object.assign(item, { asin: swap.asin, url: `https://www.amazon.com/dp/${swap.asin}`, price_current: swap.price, price_usd: swap.price, price_seen: today, price_checked_at: new Date().toISOString() });
        } else summary.swapsSuggested += 1;
        swaps.push({ at: new Date().toISOString(), item_id: item.id, old_asin: item.asin, new_asin: swap.asin, brand: swap.brand, model: swap.model, price: swap.price, applied: apply });
        note += ` → ${apply ? 'swapped to' : 'suggest'} ${swap.asin} ($${swap.price})`;
      }
    }
    console.error(`${String(n + 1).padStart(3)}  ${item.asin}  ${note.padEnd(34)}  ${item.title.slice(0, 60)}`);
    if (!dry && (n % 10 === 9 || n === todo.length - 1)) {
      writeFileSync(CATALOG, JSON.stringify(catalog.filter((i) => !drop.has(i.id)), null, 1) + '\n');
      writeFileSync(HISTORY, JSON.stringify(history) + '\n');
      writeFileSync(SWAPS, JSON.stringify(swaps, null, 1) + '\n');
    }
  }
  const blockedRate = summary.checked ? Math.round((summary.blocked / summary.checked) * 100) : 0;
  console.log(`\nChecked ${summary.checked} of ${items.length} items${dry ? ' (dry run, nothing saved)' : ''}.`);
  console.log(`Prices: ${summary.ok} · deals: ${summary.deals} · unavailable: ${summary.unavailable} (404: ${summary.missing}${dropMissing ? ', dropped' : ''}) · no price on page: ${summary.noPrice} · errors: ${summary.errors}`);
  console.log(`Blocked by Amazon: ${summary.blocked} (${blockedRate}% of checks)${blockedRate >= 20 ? ' — slow down with --delay or run later' : ''}`);
  console.log(`Swaps: ${summary.swapsApplied} applied (exact brand + model), ${summary.swapsSuggested} suggested (see scripts/price-swaps.json)`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e.message); process.exit(1); });
