import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useState, type ComponentType } from 'react';
import { Linking, Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { SectionTitle } from '@/components/hub';
import { Button } from '@/components/ui';
import { getMeta, setMeta } from '@/db/repo';
import { buyUrl, priceAsOf, priceText } from '@/lib/amazon';
import { dealPercent, shareMessage, suggestionsFor, toolOfTheWeek } from '@/lib/shop-promo';
import { loadShop, type ShopItem } from '@/shop/api';
import { addToCart, setCartQty, useCart } from '@/shop/cart-store';
import { addMyTools, ownedItemIds, useMyTools } from '@/shop/my-tools';
import { showToast } from '@/components/toast';
import { colors, fonts } from '@/theme';

export async function shareItem(item: ShopItem, tag: string | null) {
  const link = buyUrl(item.asin, item.url, tag);
  if (!link) return;
  await Share.share({ message: shareMessage(item.title, link) }).catch(() => {});
}

function ItemPhoto({ item, height }: { item: ShopItem; height: number }) {
  const [failed, setFailed] = useState(false);
  return (
    <View style={[styles.photoWrap, { height }]}>
      {item.image_url && !failed ? (
        <Image source={{ uri: item.image_url }} contentFit="contain" transition={150} onError={() => setFailed(true)} style={styles.photo} accessibilityLabel={item.title} />
      ) : (
        <Ionicons name="construct-outline" size={height / 3} color={colors.gray} />
      )}
    </View>
  );
}

export function DealBadge({ item }: { item: ShopItem }) {
  const pct = dealPercent(item);
  if (pct === null) return null;
  return <Text style={styles.dealBadge}>DEAL · {pct}% OFF</Text>;
}

function dealLine(item: ShopItem) {
  const pct = dealPercent(item);
  return pct !== null && item.price_typical ? `Usually about $${Math.round(item.price_typical).toLocaleString('en-US')}` : null;
}

/** Checkbox to put the item in the cart, then a quantity stepper. */
export function CartControl({ item }: { item: ShopItem }) {
  const line = useCart().find((l) => l.asin === item.asin);
  if (!item.asin) return null;
  const asin = item.asin;
  return (
    <View style={styles.cartRow}>
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: !!line }}
        accessibilityLabel={`${line ? 'In cart' : 'Add to cart'}: ${item.title}`}
        onPress={() => (line ? setCartQty(asin, 0) : addToCart([{ asin, qty: 1 }]).then(() => showToast('Added to cart'))).catch(() => {})}
        style={styles.check}>
        <Ionicons name={line ? 'checkbox' : 'square-outline'} size={28} color={line ? colors.maroon : colors.gray} />
        <Text style={styles.checkText}>{line ? 'In cart' : 'Add to cart'}</Text>
      </Pressable>
      {line ? (
        <View style={styles.stepper}>
          <Pressable accessibilityRole="button" accessibilityLabel="One fewer" onPress={() => setCartQty(asin, line.qty - 1)} style={styles.step}><Text style={styles.stepText}>−</Text></Pressable>
          <Text style={styles.qty} accessibilityLabel={`Quantity ${line.qty}`}>{line.qty}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel="One more" onPress={() => setCartQty(asin, line.qty + 1)} style={styles.step}><Text style={styles.stepText}>+</Text></Pressable>
        </View>
      ) : null}
    </View>
  );
}

export function OwnedBadge() {
  return <Text style={styles.ownedBadge}>OWNED</Text>;
}

export function CrewBadge() {
  return <Text style={styles.crewBadge}>CREW PICK</Text>;
}

/** Full shop card: photo, crew pick badge and note, price, Buy and Share. */
export function ShopCard({ item, tag }: { item: ShopItem; tag: string | null }) {
  const owned = ownedItemIds(useMyTools()).has(item.id);
  const link = buyUrl(item.asin, item.url, tag);
  const price = priceText(item.price_usd);
  return (
    <View style={[styles.card, item.crew_pick && styles.cardPick]}>
      <View>
        <ItemPhoto item={item} height={190} />
        <View style={styles.badgeSpot}>
          {owned ? <OwnedBadge /> : null}
          <DealBadge item={item} />
          {item.crew_pick ? <CrewBadge /> : null}
        </View>
      </View>
      <View style={styles.text}>
        {item.subcategory ? <Text style={styles.kicker}>{item.subcategory.toUpperCase()}</Text> : null}
        <Text style={styles.title}>{item.title}</Text>
        {item.crew_pick && item.crew_note ? <Text style={styles.crewNote}>“{item.crew_note}”</Text> : null}
        {item.note ? <Text style={styles.note}>{item.note}</Text> : null}
        <Text style={styles.price}>{price ?? 'See price on Amazon'}</Text>
        {price && item.price_seen ? <Text style={styles.muted}>{priceAsOf(item.price_seen)}</Text> : null}
        {dealLine(item) ? <Text style={styles.muted}>{dealLine(item)}</Text> : null}
        {owned ? null : <CartControl item={item} />}
        <View style={styles.row}>
          <View style={styles.flex}>
            {link ? <Button label="Buy on Amazon" tone="secondary" onPress={() => Linking.openURL(link).catch(() => {})} /> : null}
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Share ${item.title}`} onPress={() => shareItem(item, tag)} style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
            <Ionicons name="share-outline" size={22} color={colors.maroon} />
            <Text style={styles.shareText}>Share</Text>
          </Pressable>
        </View>
        {owned ? (
          <Text style={styles.ownedNote}>In My tools</Text>
        ) : (
          <Pressable accessibilityRole="button" accessibilityLabel={`Mark ${item.title} as owned`} hitSlop={8} style={styles.markOwned}
            onPress={() => addMyTools([{ shop_item_id: item.id, qty: 1 }], 'manual').then(() => showToast('Added to My tools')).catch((e) => showToast(e instanceof Error ? e.message : 'Not saved'))}>
            <Ionicons name="checkmark-done-outline" size={18} color={colors.maroon} />
            <Text style={styles.markOwnedText}>Mark as owned</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

/** Home: tool of the week, with the disclosure under it. Hidden when there is no cloud or no items. */
export function ToolOfTheWeek({ refreshKey }: { refreshKey?: number }) {
  const router = useRouter();
  const [state, setState] = useState<{ item: ShopItem; tag: string | null } | null>(null);
  useEffect(() => {
    loadShop(true)
      .then(({ items, settings }) => {
        const item = toolOfTheWeek(items, settings.featuredId);
        setState(item ? { item, tag: settings.tag } : null);
      })
      .catch(() => setState(null));
  }, [refreshKey]);
  if (!state) return null;
  const { item, tag } = state;
  const link = buyUrl(item.asin, item.url, tag);
  const price = priceText(item.price_usd);
  return (
    <View style={styles.weekWrap}>
      <View style={styles.headRow}>
        <SectionTitle title="Tool of the week" />
        <Pressable accessibilityRole="link" hitSlop={10} onPress={() => router.push('/' as never)} style={styles.seeAll}>
          <Text style={styles.seeAllText}>Store ›</Text>
        </Pressable>
      </View>
      <View style={[styles.card, styles.weekCard]}>
        <ItemPhoto item={item} height={150} />
        <View style={styles.text}>
          <View style={styles.badgeRow}><DealBadge item={item} />{item.crew_pick ? <CrewBadge /> : null}</View>
          <Text style={styles.title} numberOfLines={3}>{item.title}</Text>
          {item.crew_pick && item.crew_note ? <Text style={styles.crewNote}>“{item.crew_note}”</Text> : null}
          {item.note ? <Text style={styles.note} numberOfLines={2}>{item.note}</Text> : null}
          <Text style={styles.price}>{price ?? 'See price on Amazon'}</Text>
        {price && item.price_seen ? <Text style={styles.muted}>{priceAsOf(item.price_seen)}</Text> : null}
          {dealLine(item) ? <Text style={styles.muted}>{dealLine(item)}</Text> : null}
          <View style={styles.row}>
            <View style={styles.flex}>
              {link ? <Button label="Buy on Amazon" onPress={() => Linking.openURL(link).catch(() => {})} /> : null}
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Share ${item.title}`} onPress={() => shareItem(item, tag)} style={({ pressed }) => [styles.share, pressed && styles.pressed]}>
              <Ionicons name="share-outline" size={22} color={colors.maroon} />
              <Text style={styles.shareText}>Share</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </View>
  );
}

const DISMISS_KEY = (screen: string) => `shop_strip_hidden:${screen}`;

/** Small "Tools for this job" strip: 2–3 matching items, dismissible per screen, off when the admin turns it off. */
export function ToolsForJob({ screen, tags }: { screen: string; tags: string[] }) {
  const router = useRouter();
  const [state, setState] = useState<{ items: ShopItem[]; tag: string | null } | null>(null);
  const tagKey = tags.join(',');
  useEffect(() => {
    let alive = true;
    if (!tags.length) return;
    (async () => {
      try {
        if ((await getMeta(DISMISS_KEY(screen))) === '1') return;
        const { items, settings } = await loadShop();
        if (!settings.suggestions) return;
        const picks = suggestionsFor(items, tags, 3);
        if (alive && picks.length >= 2) setState({ items: picks, tag: settings.tag });
      } catch {
        /* no strip when offline or signed out */
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, tagKey]);
  if (!state) return null;
  const dismiss = () => { setState(null); setMeta(DISMISS_KEY(screen), '1').catch(() => {}); };
  return (
    <View style={styles.strip}>
      <View style={styles.stripHead}>
        <Text style={styles.stripTitle}>Tools for this job</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Hide tool suggestions on this screen" hitSlop={12} onPress={dismiss} style={styles.close}>
          <Ionicons name="close" size={20} color={colors.gray} />
        </Pressable>
      </View>
      <View style={styles.stripRow}>
        {state.items.map((item) => {
          const link = buyUrl(item.asin, item.url, state.tag);
          return (
            <Pressable
              key={item.id}
              accessibilityRole="link"
              accessibilityLabel={`${item.title}${item.crew_pick ? ', crew pick' : ''}. Opens Amazon.`}
              onPress={() => (link ? Linking.openURL(link).catch(() => {}) : router.push('/' as never))}
              style={({ pressed }) => [styles.mini, pressed && styles.pressed]}>
              <ItemPhoto item={item} height={56} />
              <Text style={styles.miniTitle} numberOfLines={2}>{item.title}</Text>
              {item.crew_pick ? <Text style={styles.miniPick}>Crew pick</Text> : null}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/** Wraps a screen so the strip sits under it without covering anything. */
export function withToolSuggestions<P extends object>(Screen: ComponentType<P>, screen: string, tags: string[]) {
  function WithSuggestions(props: P) {
    return (
      <View style={styles.fill}>
        <View style={styles.fill}><Screen {...props} /></View>
        <ToolsForJob screen={screen} tags={tags} />
      </View>
    );
  }
  WithSuggestions.displayName = `WithToolSuggestions(${Screen.displayName || Screen.name || 'Screen'})`;
  return WithSuggestions;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pressed: { opacity: 0.8 },
  card: { backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, overflow: 'hidden' },
  cardPick: { borderColor: colors.maroon, borderWidth: 1.5 },
  weekCard: { borderLeftWidth: 5, borderLeftColor: colors.maroon },
  photoWrap: { backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', padding: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  photo: { width: '100%', height: '100%' },
  badgeSpot: { position: 'absolute', top: 10, left: 10, flexDirection: 'row', gap: 6 },
  badgeRow: { flexDirection: 'row', gap: 6 },
  ownedBadge: { alignSelf: 'flex-start', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.white, backgroundColor: colors.charcoal, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  ownedNote: { fontFamily: fonts.medium, fontSize: 14, color: colors.gray },
  markOwned: { flexDirection: 'row', alignItems: 'center', gap: 6, minHeight: 44, alignSelf: 'flex-start' },
  markOwnedText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.maroon },
  dealBadge: { alignSelf: 'flex-start', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.6, color: colors.white, backgroundColor: '#2E7D32', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  muted: { fontFamily: fonts.regular, fontSize: 14, color: colors.gray },
  cartRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  check: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 48, paddingRight: 8 },
  checkText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.ink },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.semibold, fontSize: 22, color: colors.maroon },
  qty: { fontFamily: fonts.semibold, fontSize: 18, minWidth: 24, textAlign: 'center', color: colors.ink },
  crewBadge: { alignSelf: 'flex-start', fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.8, color: colors.white, backgroundColor: colors.maroon, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4, overflow: 'hidden' },
  crewNote: { fontFamily: fonts.medium, fontSize: 15, fontStyle: 'italic', color: colors.maroon },
  text: { padding: 14, gap: 6 },
  kicker: { fontFamily: fonts.semibold, fontSize: 12, letterSpacing: 0.8, color: colors.maroon },
  title: { fontFamily: fonts.semibold, fontSize: 18, lineHeight: 24, color: colors.ink },
  note: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.charcoal },
  price: { fontFamily: fonts.semibold, fontSize: 16, color: colors.maroon },
  share: { minHeight: 52, minWidth: 64, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1.5, borderColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  shareText: { fontFamily: fonts.semibold, fontSize: 12, color: colors.maroon },
  disclosure: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.gray },
  weekWrap: { gap: 10, marginTop: 6 },
  headRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink, paddingTop: 10 },
  seeAll: { minHeight: 48, minWidth: 48, justifyContent: 'center', paddingTop: 10 },
  seeAllText: { fontFamily: fonts.semibold, fontSize: 16, color: colors.maroon },
  strip: { backgroundColor: colors.white, borderTopWidth: 1, borderTopColor: colors.line, paddingHorizontal: 12, paddingTop: 6, paddingBottom: 8, gap: 6 },
  stripHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  stripTitle: { fontFamily: fonts.semibold, fontSize: 13, letterSpacing: 0.4, color: colors.charcoal },
  close: { minWidth: 36, minHeight: 32, alignItems: 'flex-end', justifyContent: 'center' },
  stripRow: { flexDirection: 'row', gap: 8 },
  mini: { flex: 1, borderRadius: 8, borderWidth: 1, borderColor: colors.line, overflow: 'hidden', paddingBottom: 6, gap: 2 },
  miniTitle: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 15, color: colors.ink, paddingHorizontal: 6 },
  miniPick: { fontFamily: fonts.semibold, fontSize: 11, color: colors.maroon, paddingHorizontal: 6 },
});
