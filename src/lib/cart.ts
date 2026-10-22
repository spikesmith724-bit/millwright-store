/** Amazon cart helpers. Pure, no network. */

export type CartLine = { asin: string; qty: number };

/** Add lines to a cart. When the same ASIN is added again, keep the larger quantity so overlapping lists don't double up. */
export function mergeCart(cart: CartLine[], add: CartLine[], mode: 'max' | 'sum' = 'max'): CartLine[] {
  const map = new Map(cart.map((l) => [l.asin, l.qty]));
  for (const line of add) {
    if (!/^[A-Z0-9]{10}$/.test(line.asin) || line.qty < 1) continue;
    const prev = map.get(line.asin) ?? 0;
    map.set(line.asin, Math.min(99, mode === 'sum' ? prev + line.qty : Math.max(prev, line.qty)));
  }
  return Array.from(map, ([asin, qty]) => ({ asin, qty }));
}

export function setQty(cart: CartLine[], asin: string, qty: number): CartLine[] {
  if (qty < 1) return cart.filter((l) => l.asin !== asin);
  return cart.map((l) => (l.asin === asin ? { ...l, qty: Math.min(99, Math.round(qty)) } : l));
}

/** Amazon's add-to-cart URL with every item at once, tagged when a tag is set. */
export function amazonCartUrl(cart: CartLine[], tag: string | null | undefined): string | null {
  const lines = cart.filter((l) => /^[A-Z0-9]{10}$/.test(l.asin) && l.qty > 0);
  if (!lines.length) return null;
  const params = lines.flatMap((l, i) => [`ASIN.${i + 1}=${l.asin}`, `Quantity.${i + 1}=${l.qty}`]);
  const cleanTag = (tag ?? '').trim();
  if (/^[A-Za-z0-9-]{3,40}$/.test(cleanTag)) params.push(`AssociateTag=${cleanTag}`, `tag=${cleanTag}`);
  return `https://www.amazon.com/gp/aws/cart/add.html?${params.join('&')}`;
}

export function cartTotal(cart: CartLine[], prices: Map<string, number | null>) {
  let total = 0;
  let missing = 0;
  for (const l of cart) {
    const p = prices.get(l.asin);
    if (p === null || p === undefined) missing += 1;
    else total += p * l.qty;
  }
  return { total, missing };
}

export function parseCart(raw: string | null): CartLine[] {
  try {
    const value = JSON.parse(raw ?? '[]');
    return Array.isArray(value) ? mergeCart([], value.filter((l) => l && typeof l.asin === 'string').map((l) => ({ asin: l.asin, qty: Number(l.qty) || 1 })), 'sum') : [];
  } catch {
    return [];
  }
}
