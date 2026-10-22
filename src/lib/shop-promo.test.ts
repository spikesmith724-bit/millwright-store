import assert from 'node:assert/strict';
import { test } from 'node:test';

import { dealPercent, shareMessage, sortShop, suggestionsFor, toolOfTheWeek, weekNumber } from './shop-promo';

const item = (id: string, sort: number, tags: string[] = [], crew = false, active = true) => ({ id, title: id, active, crew_pick: crew, sort_order: sort, tags });
const items = [item('a', 10, ['alignment']), item('b', 20, ['torque']), item('c', 30, ['alignment', 'clearances'], true), item('d', 40, ['alignment'], false, false)];

test('weekNumber changes on Mondays', () => {
  assert.equal(weekNumber(new Date(2026, 9, 18)), weekNumber(new Date(2026, 9, 12)));
  assert.equal(weekNumber(new Date(2026, 9, 19)), weekNumber(new Date(2026, 9, 18)) + 1);
});

test('toolOfTheWeek uses the pick, else rotates through active items', () => {
  assert.equal(toolOfTheWeek(items, 'b')?.id, 'b');
  assert.notEqual(toolOfTheWeek(items, 'd')?.id, 'd');
  const seen = new Set([0, 1, 2].map((w) => toolOfTheWeek(items, null, new Date(2026, 9, 19 + w * 7))?.id));
  assert.equal(seen.size, 3);
  assert.equal(toolOfTheWeek([], null), null);
});

test('toolOfTheWeek prefers a deal when nothing is picked', () => {
  const withDeal = [...items, { ...item('e', 50), is_deal: true, price_current: 80, price_typical: 100 }];
  assert.equal(toolOfTheWeek(withDeal, null)?.id, 'e');
  assert.equal(toolOfTheWeek(withDeal, 'a')?.id, 'a');
  assert.equal(dealPercent({ is_deal: true, price_current: 80, price_typical: 100 }), 20);
  assert.equal(dealPercent({ is_deal: true, price_current: 95, price_typical: 100 }), null);
});

test('sortShop puts crew picks first', () => {
  assert.deepEqual(sortShop(items).map((i) => i.id), ['c', 'a', 'b', 'd']);
});

test('suggestionsFor matches tags, skips hidden items, crew picks first', () => {
  const s = suggestionsFor(items, ['alignment'], 3);
  assert.equal(s[0].id, 'c');
  assert.deepEqual(s.map((i) => i.id).sort(), ['a', 'c']);
  assert.deepEqual(suggestionsFor(items, ['bearings']), []);
});

test('shareMessage', () => {
  assert.match(shareMessage('Mitutoyo 2416A', 'https://www.amazon.com/dp/B09FRBS84N?tag=tillsontools-20'), /tag=tillsontools-20/);
});

test('missingEssentials skips owned and non-essential items', async () => {
  const { missingEssentials } = await import('./shop-promo');
  const list = [
    { ...item('a', 1, ['essential']), asin: 'A000000001' },
    { ...item('b', 2, ['essential']), asin: 'A000000002' },
    { ...item('c', 3, []), asin: 'A000000003' },
    { ...item('d', 4, ['essential'], false, false), asin: 'A000000004' },
  ];
  assert.deepEqual(missingEssentials(list, new Set(['a'])).map((i) => i.id), ['b']);
});
