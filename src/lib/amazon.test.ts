import assert from 'node:assert/strict';
import { test } from 'node:test';

import { asinFrom, buyUrl, priceText } from './amazon';

test('asinFrom reads common Amazon links and bare ASINs', () => {
  assert.equal(asinFrom('https://www.amazon.com/Mitutoyo-2416A-Indicator/dp/B09FRBS84N/ref=sr_1_3?keywords=x'), 'B09FRBS84N');
  assert.equal(asinFrom('https://www.amazon.com/gp/product/B00008IHTL?th=1'), 'B00008IHTL');
  assert.equal(asinFrom('https://amazon.com/dp/b0006j4506'), 'B0006J4506');
  assert.equal(asinFrom('B002K07CTK'), 'B002K07CTK');
  assert.equal(asinFrom('https://example.com/dp/B002K07CTK'), null);
  assert.equal(asinFrom('starrett level'), null);
});

test('buyUrl adds the tag only when set', () => {
  assert.equal(buyUrl('B09FRBS84N', null, null), 'https://www.amazon.com/dp/B09FRBS84N');
  assert.equal(buyUrl('B09FRBS84N', null, ''), 'https://www.amazon.com/dp/B09FRBS84N');
  assert.equal(buyUrl('B09FRBS84N', null, 'tillson-20'), 'https://www.amazon.com/dp/B09FRBS84N?tag=tillson-20');
  assert.equal(buyUrl(null, 'https://www.amazon.com/s?k=level&tag=old-20', 'tillson-20'), 'https://www.amazon.com/s?k=level&tag=tillson-20');
  assert.equal(buyUrl(null, 'https://amzn.to/abc', 'tillson-20'), 'https://amzn.to/abc');
  assert.equal(buyUrl(null, null, 'tillson-20'), null);
});

test('priceText', () => {
  assert.equal(priceText(119), 'about $119 on Amazon');
  assert.equal(priceText(36.11), 'about $36.11 on Amazon');
  assert.equal(priceText(5850), 'about $5,850 on Amazon');
  assert.equal(priceText(null), null);
});
