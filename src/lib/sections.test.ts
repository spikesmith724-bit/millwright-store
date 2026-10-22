import assert from 'node:assert/strict';
import { test } from 'node:test';

import { SECTIONS, sectionBySlug, sectionForTillson } from './sections';
import { AMAZON_TAG, buyUrl, priceAsOf } from './amazon';
import { groupByType } from './tool-types';
import catalog from '../data/catalog.json';

test('every required section exists with a unique slug', () => {
  const labels = SECTIONS.map((s) => s.label);
  for (const l of ['Hand Tools', 'Rigging', 'Precision Tools', 'Power Tools', 'Safety / PPE', 'Bolting & Torque', 'Lubrication', 'Tool Storage & Bags']) assert.ok(labels.includes(l), l);
  assert.equal(new Set(SECTIONS.map((s) => s.slug)).size, SECTIONS.length);
  assert.equal(sectionBySlug('rigging')?.label, 'Rigging');
  assert.equal(sectionBySlug('nope'), null);
});

test('Tillson items map into store sections', () => {
  assert.equal(sectionForTillson('precision', 'Torque', 'CDI torque wrench'), 'bolting');
  assert.equal(sectionForTillson('hand', 'Rigging & lifting', 'Crosby shackle'), 'rigging');
  assert.equal(sectionForTillson('hand', 'Shims & lights', 'Brass shim stock assortment'), 'shims');
  assert.equal(sectionForTillson('hand', 'Shims & lights', 'Streamlight penlight'), 'hand');
  assert.equal(sectionForTillson('precision', 'Indicators', 'Mitutoyo dial indicator'), 'precision');
  assert.equal(sectionForTillson('hand', 'Pry bars & pullers', 'Enerpac flange spreader'), 'bolting');
});

test('price date label', () => {
  assert.equal(priceAsOf('2026-10-21'), 'Price checked Oct 21, 2026');
  assert.equal(priceAsOf(null), null);
});

test('catalog rows are real Amazon listings with valid sections and the Tillson tag on buy links', () => {
  const slugs = new Set(SECTIONS.map((s) => s.slug));
  const asins = new Set<string>();
  for (const i of catalog as { asin: string; url: string; section: string; price_usd: number | null; price_seen: string | null }[]) {
    assert.match(i.asin, /^[A-Z0-9]{10}$/);
    assert.equal(i.url, `https://www.amazon.com/dp/${i.asin}`);
    assert.ok(slugs.has(i.section as never), i.section);
    assert.ok(!asins.has(i.asin), `duplicate ${i.asin}`);
    asins.add(i.asin);
    if (i.price_usd !== null) assert.ok(i.price_seen, `${i.asin} has a price without a date`);
    assert.equal(buyUrl(i.asin, i.url, AMAZON_TAG), `${i.url}?tag=tillsontools-20`);
  }
});

test('groupByType keeps unknown types as their own groups', () => {
  const g = groupByType([{ t: 'Indicators' }, { t: 'Shackles' }, { t: null }], (r) => r.t);
  assert.deepEqual(g.map((x) => x.type), ['Indicators', 'Shackles', 'Other']);
});
