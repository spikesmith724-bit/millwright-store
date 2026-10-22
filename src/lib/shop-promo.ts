/** Tool Store promotion logic. Pure, no network. */

export type PromoItem = { id: string; title: string; active: boolean; crew_pick: boolean; sort_order: number; tags: string[]; is_deal?: boolean; price_current?: number | null; price_typical?: number | null };

/** Percent off typical when the item is flagged as a deal (10% or more below typical), else null. */
export function dealPercent(item: Pick<PromoItem, 'is_deal' | 'price_current' | 'price_typical'>): number | null {
  const cur = item.price_current ?? null;
  const typ = item.price_typical ?? null;
  if (!item.is_deal || !cur || !typ || cur >= typ) return null;
  const pct = Math.round((1 - cur / typ) * 100);
  return pct >= 10 ? pct : null;
}

/** Weeks since 2026-01-05 (a Monday), so the pick changes every Monday. */
export function weekNumber(now: Date = new Date()) {
  const start = Date.UTC(2026, 0, 5);
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.floor((today - start) / (7 * 86400000));
}

/** Crew picks first, then sort order, then title. */
export function sortShop<T extends PromoItem>(items: T[]): T[] {
  return [...items].sort((a, b) => Number(b.crew_pick) - Number(a.crew_pick) || a.sort_order - b.sort_order || a.title.localeCompare(b.title));
}

/** The admin's pick if it is still active; otherwise rotate weekly through the active items. */
export function toolOfTheWeek<T extends PromoItem>(items: T[], featuredId: string | null | undefined, now: Date = new Date()): T | null {
  const active = items.filter((i) => i.active);
  if (!active.length) return null;
  const picked = featuredId ? active.find((i) => i.id === featuredId) : undefined;
  if (picked) return picked;
  // Prefer a deal: rotate through current deals when there are any.
  const deals = active.filter((i) => dealPercent(i) !== null);
  const pool = deals.length ? deals : active;
  const ordered = [...pool].sort((a, b) => a.sort_order - b.sort_order || a.id.localeCompare(b.id));
  const n = weekNumber(now);
  return ordered[((n % ordered.length) + ordered.length) % ordered.length];
}

/** Up to `count` active items matching any tag, crew picks first, rotating weekly among equals. */
export function suggestionsFor<T extends PromoItem>(items: T[], tags: string[], count = 3, now: Date = new Date()): T[] {
  const wanted = new Set(tags.map((t) => t.toLowerCase()));
  const matches = items.filter((i) => i.active && i.tags.some((t) => wanted.has(t.toLowerCase())));
  // Rank by how many tags match, so the most relevant tools come first.
  const score = (i: T) => i.tags.filter((t) => wanted.has(t.toLowerCase())).length;
  const shift = weekNumber(now);
  const ranked = [...matches].sort((a, b) => Number(b.crew_pick) - Number(a.crew_pick) || score(b) - score(a) || a.sort_order - b.sort_order);
  // Keep crew picks at the front; rotate the rest so the strip doesn't always show the same tools.
  const picks = ranked.filter((i) => i.crew_pick);
  const rest = ranked.filter((i) => !i.crew_pick);
  const offset = rest.length ? shift % rest.length : 0;
  return [...picks, ...rest.slice(offset), ...rest.slice(0, offset)].slice(0, count);
}

/** Text for the native share sheet. */
export function shareMessage(title: string, link: string) {
  return `Check out this tool from the Millwright Store: ${title}\n${link}`;
}

/** Essential store items I don't own yet, in store order. */
export function missingEssentials<T extends PromoItem & { asin?: string | null }>(items: T[], ownedIds: Set<string>): T[] {
  return items.filter((i) => i.active && i.tags.includes('essential') && i.asin && !ownedIds.has(i.id));
}
