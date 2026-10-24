import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { CartButton } from '@/components/cart-button';
import { SectionTitle } from '@/components/hub';
import { DealBadge, ShopCard } from '@/components/shop-cards';
import { Banner, Button, Card, Chips, Loading, Screen } from '@/components/ui';
import { AMAZON_DISCLOSURE, buyUrl, priceText } from '@/lib/amazon';
import { dealPercent, missingEssentials, sortShop } from '@/lib/shop-promo';
import { ownedItemIds, useMyTools } from '@/shop/my-tools';
import { groupByType } from '@/lib/tool-types';
import { fitsUnits, matchesSearch, unitsOf } from '@/lib/search-words';
import { showToast } from '@/components/toast';
import { addToCart } from '@/shop/cart-store';
import { loadShop, type ShopItem } from '@/shop/api';
import { SECTIONS, sectionBySlug, type SectionSlug } from '@/lib/sections';
import { brand, colors, fonts } from '@/theme';
import { ShareButton } from '@/lib/share';

type Filter = 'all' | 'essential' | 'deals' | 'crew';
const FILTERS: { value: Filter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'essential', label: 'Essential' },
  { value: 'deals', label: 'Deals' },
  { value: 'crew', label: 'Crew picks' },
];


/** Store home (no section) or one section's page. Same code as Tillson's Tool Store, with section tabs. */
export function StoreBrowser({ section }: { section?: SectionSlug }) {
  const current = sectionBySlug(section);
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[] | null>(null);
  const [tag, setTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');
  const [units, setUnits] = useState<'any' | 'metric' | 'sae'>('any');
  const [hideOwned, setHideOwned] = useState(false);
  const owned = ownedItemIds(useMyTools());

  const load = useCallback(async () => {
    try {
      const { items: rows, settings } = await loadShop(true);
      setItems(sortShop(rows.filter((r) => r.active && (!section || r.section === section))));
      setTag(settings.tag);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load the store.');
      setItems((prev) => prev ?? []);
    }
  }, [section]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const all = items ?? [];
  const deals = useMemo(() => all.filter((i) => dealPercent(i) !== null).sort((a, b) => (dealPercent(b) ?? 0) - (dealPercent(a) ?? 0)), [all]);
  const shown = all.filter((i) => {
    if (filter === 'deals' && dealPercent(i) === null) return false;
    if (filter === 'crew' && !i.crew_pick) return false;
    if (filter === 'essential' && !i.tags.includes('essential')) return false;
    if (hideOwned && owned.has(i.id)) return false;
    if (!fitsUnits(unitsOf(`${i.title} ${i.note ?? ''}`), units)) return false;
    return !query.trim() || matchesSearch(`${i.title} ${i.note ?? ''} ${i.subcategory ?? ''} ${i.crew_note ?? ''}`, query);
  });
  const groups = useMemo(() => section
    ? groupByType(shown, (i) => i.subcategory).map((g) => ({ type: g.type, slug: null as string | null, total: g.rows.length, items: g.rows }))
    : SECTIONS.map((sec) => { const rows = shown.filter((i) => i.section === sec.slug); return { type: sec.label, slug: sec.slug as string | null, total: rows.length, items: rows.slice(0, 4) }; }).filter((g) => g.total), [shown, section]);

  const kit = missingEssentials(all, owned);
  const kitTotal = kit.reduce((n, i) => n + (i.price_usd ?? 0) * (i.asin === 'B09FRBS84N' ? 2 : 1), 0);
  async function addKit() {
    // Two dial indicators in a full kit; one of everything else.
    await addToCart(kit.map((i) => ({ asin: i.asin!, qty: i.asin === 'B09FRBS84N' ? 2 : 1 })), 'max');
    showToast(`Full kit added: ${kit.length} items`);
  }

  const title = current ? current.label : brand.name;
  const path = current ? `/category/${current.slug}` : '/';
  return (
    <Screen title={title} onRefresh={load} right={<ShareButton title={current ? `${brand.name}: ${current.label}` : brand.name} path={path} />}>
      <Text style={styles.intro}>{current ? current.blurb : 'Tools for millwright and machinist work. Check off what you need, set the quantity, then send it all to your Amazon cart.'}</Text>
      {error ? <Banner tone="error" text={error} /> : null}
      <CartButton />
      {kit.length ? (
        <Card accent>
          <Text style={styles.kitTitle}>Get the full kit</Text>
          <Text style={styles.note}>{kit.length} essential hand and precision tools you don't have yet, SAE and metric{kitTotal ? `, about $${Math.round(kitTotal).toLocaleString('en-US')} on Amazon` : ''}. Only the ones not already in My tools.</Text>
          <Button label="Add the full kit to cart" onPress={addKit} />
        </Card>
      ) : null}
      <Button label="My tools" tone="secondary" onPress={() => router.push('/my-tools' as never)} />
      {items === null && !error ? <Loading /> : null}

      {deals.length ? (
        <View style={styles.deals}>
          <SectionTitle title="Today's deals" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dealRow}>
            {deals.slice(0, 10).map((i) => {
              const link = buyUrl(i.asin, i.url, tag);
              return (
                <Pressable key={i.id} accessibilityRole="link" accessibilityLabel={`${i.title}, ${dealPercent(i)}% off. Opens Amazon.`} onPress={() => link && Linking.openURL(link).catch(() => {})} style={({ pressed }) => [styles.dealCard, pressed && styles.pressed]}>
                  {i.image_url ? <Image source={{ uri: i.image_url }} contentFit="contain" style={styles.dealPhoto} /> : <View style={styles.dealPhoto} />}
                  <DealBadge item={i} />
                  <Text style={styles.dealTitle} numberOfLines={2}>{i.title}</Text>
                  <Text style={styles.dealPrice}>{priceText(i.price_usd)}</Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      ) : null}

      {items && items.length ? (
        <>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search tools"
            placeholderTextColor={colors.gray}
            autoCorrect={false}
            clearButtonMode="while-editing"
            accessibilityLabel="Search tools"
            style={styles.search}
          />
          <Chips options={[{ value: 'any', label: 'SAE + metric' }, { value: 'sae', label: 'SAE' }, { value: 'metric', label: 'Metric' }]} value={units} onChange={(v) => setUnits(v as typeof units)} />
          {owned.size ? <Chips options={[{ value: 'show', label: 'Show owned' }, { value: 'hide', label: 'Hide owned' }]} value={hideOwned ? 'hide' : 'show'} onChange={(v) => setHideOwned(v === 'hide')} /> : null}
          <Chips options={FILTERS.filter((f) => f.value !== 'deals' || deals.length).filter((f) => f.value !== 'crew' || all.some((i) => i.crew_pick))} value={filter} onChange={(v) => setFilter(v as Filter)} />
        </>
      ) : null}
      {items && shown.length === 0 ? <Card><Text style={styles.note}>{query ? 'No tools match that search.' : 'No products in this section yet.'}</Text></Card> : null}
      {groups.map((g) => (
        <View key={g.type} style={styles.group}>
          <SectionTitle title={g.slug ? `${g.type} (${g.total})` : g.type} />
          {g.items.map((item) => <ShopCard key={item.id} item={item} tag={tag} />)}
          {g.slug && g.total > g.items.length ? <Button label={`See all ${g.total} in ${g.type}`} tone="secondary" onPress={() => router.push(`/category/${g.slug}` as never)} /> : null}
        </View>
      ))}
      <Text style={styles.disclosure}>{AMAZON_DISCLOSURE}</Text>
    </Screen>
  );
}

/** One tab per store section; each opens its own route. */
const styles = StyleSheet.create({
  tabs: { gap: 8, paddingRight: 8 },
  tab: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, justifyContent: 'center' },
  tabOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.charcoal },
  tabTextOn: { color: colors.white },
  kitTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  intro: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.charcoal },
  disclosure: { fontFamily: fonts.regular, fontSize: 12, lineHeight: 16, color: colors.gray, textAlign: 'center', marginTop: 16 },
  note: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.charcoal },
  search: { minHeight: 52, borderRadius: 12, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, paddingHorizontal: 14, fontFamily: fonts.regular, fontSize: 17, color: colors.ink },
  group: { gap: 10 },
  deals: { gap: 8 },
  dealRow: { gap: 10, paddingRight: 8 },
  dealCard: { width: 170, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 10, gap: 6 },
  dealPhoto: { width: '100%', height: 100 },
  dealTitle: { fontFamily: fonts.semibold, fontSize: 14, lineHeight: 18, color: colors.ink },
  dealPrice: { fontFamily: fonts.semibold, fontSize: 14, color: colors.maroon },
  pressed: { opacity: 0.85 },
});
