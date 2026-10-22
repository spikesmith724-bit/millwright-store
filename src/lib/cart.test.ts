import assert from 'node:assert/strict';
import { test } from 'node:test';

import { amazonCartUrl, cartTotal, mergeCart, parseCart, setQty } from './cart';

test('mergeCart keeps the larger quantity, or sums', () => {
  const c = mergeCart([{ asin: 'B09FRBS84N', qty: 1 }], [{ asin: 'B09FRBS84N', qty: 2 }, { asin: 'B0006J429K', qty: 1 }, { asin: 'bad', qty: 1 }]);
  assert.deepEqual(c, [{ asin: 'B09FRBS84N', qty: 2 }, { asin: 'B0006J429K', qty: 1 }]);
  assert.equal(mergeCart(c, [{ asin: 'B0006J429K', qty: 1 }], 'sum')[1].qty, 2);
  assert.deepEqual(setQty(c, 'B09FRBS84N', 0), [{ asin: 'B0006J429K', qty: 1 }]);
});

test('amazonCartUrl lists every item and both tag params', () => {
  const url = amazonCartUrl([{ asin: 'B09FRBS84N', qty: 2 }, { asin: 'B0006J429K', qty: 1 }], 'tillsontools-20');
  assert.equal(url, 'https://www.amazon.com/gp/aws/cart/add.html?ASIN.1=B09FRBS84N&Quantity.1=2&ASIN.2=B0006J429K&Quantity.2=1&AssociateTag=tillsontools-20&tag=tillsontools-20');
  assert.equal(amazonCartUrl([{ asin: 'B09FRBS84N', qty: 1 }], null), 'https://www.amazon.com/gp/aws/cart/add.html?ASIN.1=B09FRBS84N&Quantity.1=1');
  assert.equal(amazonCartUrl([], 'x-20'), null);
});

test('cartTotal and parseCart', () => {
  const t = cartTotal([{ asin: 'A000000001', qty: 2 }, { asin: 'A000000002', qty: 1 }], new Map([['A000000001', 10], ['A000000002', null]]));
  assert.deepEqual(t, { total: 20, missing: 1 });
  assert.deepEqual(parseCart('nope'), []);
});


test('matchesSearch', async () => {
  const { matchesSearch } = await import('./search-words');
  assert.ok(matchesSearch('Mitutoyo 2416A dial indicator', 'dial mitu'));
  assert.ok(!matchesSearch('Plumb bob', 'dial'));
});

test('unitsOf and fitsUnits', async () => {
  const { unitsOf, fitsUnits } = await import('./search-words');
  assert.equal(unitsOf('Tekton metric combination wrench set'), 'metric');
  assert.equal(unitsOf('Tekton SAE combination wrench set'), 'sae');
  assert.equal(unitsOf('GearWrench 56 Pc 3/8" Dr SAE/Metric set'), 'both');
  assert.equal(unitsOf('Estwing 16 oz hammer'), null);
  assert.ok(fitsUnits(null, 'metric'));
  assert.ok(!fitsUnits('sae', 'metric'));
});
