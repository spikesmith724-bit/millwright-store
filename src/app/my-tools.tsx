import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CartButton } from '@/components/cart-button';
import { SectionTitle } from '@/components/hub';
import { showToast } from '@/components/toast';
import { Banner, Button, Card, Chips, Field, Screen } from '@/components/ui';
import { priceText } from '@/lib/amazon';
import { missingEssentials } from '@/lib/shop-promo';
import { TOOL_TYPES, groupByType } from '@/lib/tool-types';
import { loadShop, type ShopItem } from '@/shop/api';
import { addToCart } from '@/shop/cart-store';
import { addCustomTool, listMyTools, ownedItemIds, setMyToolQty, useMyTools, type MyTool } from '@/shop/my-tools';
import { colors, fonts } from '@/theme';

export default function MyToolsScreen() {
  const router = useRouter();
  const mine = useMyTools();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('Other');
  const [qty, setQty] = useState('1');
  const [showMissing, setShowMissing] = useState(false);

  const load = useCallback(async () => {
    try {
      const [{ items: rows }] = await Promise.all([loadShop(), listMyTools(true)]);
      setItems(rows);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load My tools.');
    }
  }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
  const groups = groupByType(mine, (t) => (t.shop_item_id ? byId.get(t.shop_item_id)?.subcategory : null) ?? t.tool_type);
  const missing = missingEssentials(items, ownedItemIds(mine));
  const count = mine.reduce((n, t) => n + t.qty, 0);

  async function saveCustom() {
    try {
      await addCustomTool(name, type === 'Other' ? null : type, Number(qty) || 1);
      setName(''); setQty('1'); setAdding(false);
      showToast('Tool added');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Not saved.');
    }
  }
  const change = (t: MyTool, next: number) => setMyToolQty(t.id, next).catch((e) => setError(String(e.message)));

  return (
    <Screen title="My tools" onRefresh={load}>
      <Text style={styles.intro}>Your own tool list. Mark store tools as owned or add your own. Saved on this device only.</Text>
      {error ? <Banner tone="error" text={error} /> : null}
      <Text style={styles.count}>{mine.length ? `${count} tool${count === 1 ? '' : 's'}` : 'No tools yet'}</Text>

      {missing.length ? (
        <Card accent>
          <Pressable accessibilityRole="button" onPress={() => setShowMissing((v) => !v)} style={styles.missingHead}>
            <Text style={styles.cardTitle}>Missing essentials ({missing.length})</Text>
            <Ionicons name={showMissing ? 'chevron-up' : 'chevron-down'} size={22} color={colors.maroon} />
          </Pressable>
          <Button label={`Add all ${missing.length} to cart`} onPress={() => addToCart(missing.map((i) => ({ asin: i.asin!, qty: i.asin === 'B09FRBS84N' ? 2 : 1 })), 'max').then(() => showToast('Missing essentials added to cart'))} />
          {showMissing ? missing.map((i) => (
            <View key={i.id} style={styles.missingRow}>
              <Text style={styles.missingName} numberOfLines={2}>{i.title}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Add ${i.title} to cart`} hitSlop={8} onPress={() => addToCart([{ asin: i.asin!, qty: 1 }], 'max').then(() => showToast('Added to cart'))} style={styles.smallAdd}>
                <Ionicons name="cart-outline" size={20} color={colors.maroon} />
              </Pressable>
            </View>
          )) : null}
          <CartButton />
        </Card>
      ) : items.length ? <Banner text="You have every essential tool." /> : null}

      {adding ? (
        <Card>
          <Text style={styles.cardTitle}>Add a tool</Text>
          <Field label="Tool" value={name} onChangeText={setName} hint="Anything not in the store, like a homemade bracket" />
          <Field label="How many" value={qty} onChangeText={(v) => setQty(v.replace(/\D/g, ''))} keyboardType="number-pad" />
          <Chips options={[...TOOL_TYPES, 'Other'].map((t) => ({ value: t, label: t }))} value={type} onChange={setType} />
          <Button label="Save tool" onPress={saveCustom} />
          <Button label="Cancel" tone="ghost" onPress={() => setAdding(false)} />
        </Card>
      ) : (
        <View style={styles.row}>
          <View style={styles.flex}><Button label="Add a tool" tone="secondary" onPress={() => setAdding(true)} /></View>
          <View style={styles.flex}><Button label="Store" tone="secondary" onPress={() => router.push('/' as never)} /></View>
        </View>
      )}

      {groups.map((g) => (
        <View key={g.type} style={styles.group}>
          <SectionTitle title={g.type} />
          {g.rows.map((t) => {
            const item = t.shop_item_id ? byId.get(t.shop_item_id) : undefined;
            return (
              <View key={t.id} style={styles.toolRow}>
                {item?.image_url ? <Image source={{ uri: item.image_url }} contentFit="contain" style={styles.thumb} /> : <View style={[styles.thumb, styles.thumbEmpty]}><Ionicons name="construct-outline" size={24} color={colors.gray} /></View>}
                <View style={styles.flex}>
                  <Text style={styles.toolName} numberOfLines={3}>{item?.title ?? t.custom_name ?? 'Tool'}</Text>
                  <Text style={styles.muted}>{t.source === 'store' ? 'From the store' : item ? 'Marked as owned' : 'Added by you'}{item?.price_usd ? ` · ${priceText(item.price_usd)}` : ''}</Text>
                  <View style={styles.stepper}>
                    <Pressable accessibilityRole="button" accessibilityLabel={t.qty === 1 ? 'Remove' : 'One fewer'} onPress={() => change(t, t.qty - 1)} style={styles.step}>
                      <Ionicons name={t.qty === 1 ? 'trash-outline' : 'remove'} size={20} color={colors.maroon} />
                    </Pressable>
                    <Text style={styles.qty} accessibilityLabel={`Quantity ${t.qty}`}>{t.qty}</Text>
                    <Pressable accessibilityRole="button" accessibilityLabel="One more" onPress={() => change(t, t.qty + 1)} style={styles.step}>
                      <Ionicons name="add" size={20} color={colors.maroon} />
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  row: { flexDirection: 'row', gap: 10 },
  intro: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.charcoal },
  count: { fontFamily: fonts.semibold, fontSize: 16, color: colors.charcoal },
  cardTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  missingHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44 },
  missingRow: { flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 44 },
  missingName: { flex: 1, fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  smallAdd: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  group: { gap: 8 },
  toolRow: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12 },
  thumb: { width: 64, height: 64, borderRadius: 8 },
  thumbEmpty: { backgroundColor: colors.bg, alignItems: 'center', justifyContent: 'center' },
  toolName: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  muted: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 4 },
  step: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  qty: { fontFamily: fonts.semibold, fontSize: 18, minWidth: 24, textAlign: 'center', color: colors.ink },
});
