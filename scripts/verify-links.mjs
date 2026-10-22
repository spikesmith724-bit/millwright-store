// Checks every catalog link (https://www.amazon.com/dp/<ASIN>). 404 → added to scripts/dropped-asins.json
// (build-catalog.mjs then leaves it out). 503/robot pages are kept: Amazon throttles, the listing may still be fine.
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
const catalog = JSON.parse(readFileSync(new URL('../src/data/catalog.json', import.meta.url), 'utf8'));
const out = new URL('./link-check.json', import.meta.url);
const results = existsSync(out) ? JSON.parse(readFileSync(out, 'utf8')) : {};
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36';
const delay = Number(process.argv[2]) || 2000;
for (const item of catalog) {
  if (results[item.asin] && results[item.asin] !== 503 && results[item.asin] !== 0) continue;
  let code = 0;
  try { code = Number(execFileSync('curl', ['-s', '-o', '/dev/null', '-L', '--compressed', '--max-time', '25', '-A', UA, '-H', 'Accept-Language: en-US,en;q=0.9', '-w', '%{http_code}', item.url]).toString()); } catch {}
  results[item.asin] = code;
  console.error(code, item.asin, item.title.slice(0, 50));
  writeFileSync(out, JSON.stringify(results, null, 1));
  await new Promise((r) => setTimeout(r, delay));
}
const missing = Object.entries(results).filter(([, c]) => c === 404).map(([a]) => a);
const prev = existsSync(new URL('./dropped-asins.json', import.meta.url)) ? JSON.parse(readFileSync(new URL('./dropped-asins.json', import.meta.url), 'utf8')) : [];
writeFileSync(new URL('./dropped-asins.json', import.meta.url), JSON.stringify([...new Set([...prev, ...missing])], null, 1) + '\n');
const tally = {}; for (const c of Object.values(results)) tally[c] = (tally[c] ?? 0) + 1;
console.log(JSON.stringify(tally), 'dropped:', missing.length);
