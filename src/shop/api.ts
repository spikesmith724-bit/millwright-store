import catalog from '@/data/catalog.json';
import { AMAZON_TAG } from '@/lib/amazon';
import type { SectionSlug } from '@/lib/sections';

/** Same shape as Tillson's tillson_shop_items row, plus the store section. Data is bundled in src/data/catalog.json. */
export type ShopItem = {
  id: string;
  title: string;
  note: string | null;
  category: ShopCategory;
  section: SectionSlug;
  subcategory: string | null;
  asin: string | null;
  url: string;
  image_url: string | null;
  price_usd: number | null;
  price_seen: string | null;
  sort_order: number;
  active: boolean;
  crew_pick: boolean;
  price_current: number | null;
  price_typical: number | null;
  price_low: number | null;
  price_checked_at: string | null;
  is_deal: boolean;
  crew_note: string | null;
  tags: string[];
  source?: string;
};
export type ShopCategory = 'precision' | 'hand' | 'power' | 'rigging' | 'ppe' | 'other';

export type ShopSettings = { tag: string | null; featuredId: string | null; suggestions: boolean };

export function listShopItems(): ShopItem[] {
  return (catalog as unknown as ShopItem[]).map((i) => ({ ...i, tags: i.tags ?? [], is_deal: !!i.is_deal }));
}

export function shopSettings(): ShopSettings {
  return { tag: AMAZON_TAG, featuredId: null, suggestions: true };
}

/** Kept async to match Tillson's call sites. */
export function loadShop(_force = false): Promise<{ items: ShopItem[]; settings: ShopSettings }> {
  return Promise.resolve({ items: listShopItems(), settings: shopSettings() });
}
