/** Amazon link helpers for the Tool Store. Pure, no network. */

const ASIN_PATTERNS = [/\/dp\/([A-Z0-9]{10})(?=[/?#]|$)/i, /\/gp\/product\/([A-Z0-9]{10})(?=[/?#]|$)/i, /\/gp\/aw\/d\/([A-Z0-9]{10})(?=[/?#]|$)/i, /\/exec\/obidos\/ASIN\/([A-Z0-9]{10})/i, /\/o\/ASIN\/([A-Z0-9]{10})/i];

/** The ASIN in a pasted Amazon link (or a bare ASIN), uppercased, or null. */
export function asinFrom(input: string): string | null {
  const text = input.trim();
  if (/^[A-Z0-9]{10}$/i.test(text) && /\d/.test(text)) return text.toUpperCase();
  if (!/amazon\.|amzn\.|a\.co\//i.test(text)) return null;
  for (const pattern of ASIN_PATTERNS) {
    const m = pattern.exec(text);
    if (m) return m[1].toUpperCase();
  }
  return null;
}

/** Clean product link: amazon.com/dp/ASIN when we know the ASIN, otherwise the given https link. */
export function productUrl(asin: string | null | undefined, url: string | null | undefined): string | null {
  if (asin && /^[A-Z0-9]{10}$/.test(asin)) return `https://www.amazon.com/dp/${asin}`;
  if (url && /^https:\/\//.test(url)) return url;
  return null;
}

/** The link to open, with the Associates tag added when one is set. Links still work with no tag. */
export function buyUrl(asin: string | null | undefined, url: string | null | undefined, tag: string | null | undefined): string | null {
  const base = productUrl(asin, url);
  if (!base) return null;
  const cleanTag = (tag ?? '').trim();
  if (!cleanTag || !/^[A-Za-z0-9-]{3,40}$/.test(cleanTag)) return base;
  // Short links (amzn.to, a.co) carry their own tag; leave them alone.
  if (!/(^|\.)amazon\.com\//i.test(base.replace(/^https:\/\//, ''))) return base;
  const [path, query = ''] = base.split('?');
  const params = query.split('&').filter((p) => p && !/^tag=/i.test(p));
  params.push(`tag=${encodeURIComponent(cleanTag)}`);
  return `${path}?${params.join('&')}`;
}

export function priceText(price: number | null | undefined) {
  if (price === null || price === undefined || !Number.isFinite(Number(price))) return null;
  const n = Number(price);
  return `about $${n >= 100 ? Math.round(n).toLocaleString('en-US') : n.toFixed(2).replace(/\.00$/, '')} on Amazon`;
}

export const AMAZON_DISCLOSURE = 'As an Amazon Associate, Spike Industrial earns from qualifying purchases.';

/** "Price checked Oct 21, 2026" for a YYYY-MM-DD date. */
export function priceAsOf(date: string | null | undefined) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date ?? '');
  if (!m) return null;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `Price checked ${months[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}`;
}

/** The Associates tag Tillson's Tool Store uses (tillson_settings.amazon_tag, docs/tool-store.md). */
export const AMAZON_TAG = 'tillsontools-20';
