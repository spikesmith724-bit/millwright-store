import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { showToast } from '@/components/toast';
import { Banner, Button, Card, Screen } from '@/components/ui';
import { priceText } from '@/lib/amazon';
import { amazonCartUrl, cartTotal } from '@/lib/cart';
import { loadShop, type ShopItem } from '@/shop/api';
import { clearCart, setCartQty, useCart } from '@/shop/cart-store';
import { colors, fonts } from '@/theme';

export default function CartScreen() {
  const cart = useCart();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [tag, setTag] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  useFocusEffect(useCallback(() => {
    loadShop().then(({ items: rows, settings }) => { setItems(rows); setTag(settings.tag); }).catch((e) => setError(String(e.message)));
  }, []));
  const byAsin = useMemo(() => new Map(items.filter((i) => i.asin).map((i) => [i.asin!, i])), [items]);
  const { total, missing } = cartTotal(cart, new Map(cart.map((l) => [l.asin, byAsin.get(l.asin)?.price_usd ?? null])));
  const url = amazonCartUrl(cart, tag);
  const count = cart.reduce((n, l) => n + l.qty, 0);

  return (
    <Screen title="Cart">
      {error ? <Banner tone="error" text={error} /> : null}
      {cart.length === 0 ? <Card><Text style={styles.body}>Your cart is empty. Add tools from the store.</Text></Card> : null}
      {cart.map((line) => {
        const item = byAsin.get(line.asin);
        return (
          <View key={line.asin} style={styles.line}>
            {item?.image_url ? <Image source={{ uri: item.image_url }} contentFit="contain" style={styles.thumb} /> : <View style={styles.thumb} />}
            <View style={styles.flex}>
              <Text style={styles.title} numberOfLines={3}>{item?.title ?? line.asin}</Text>
              {item?.price_usd ? <Text style={styles.muted}>{priceText(item.price_usd)} each</Text> : null}
              <View style={styles.qtyRow}>
                <QtyButton label="−" a11y="One fewer" onPress={() => setCartQty(line.asin, line.qty - 1)} />
                <Text style={styles.qty} accessibilityLabel={`Quantity ${line.qty}`}>{line.qty}</Text>
                <QtyButton label="+" a11y="One more" onPress={() => setCartQty(line.asin, line.qty + 1)} />
                <Pressable accessibilityRole="button" onPress={() => setCartQty(line.asin, 0)} hitSlop={8} style={styles.remove}>
                  <Text style={styles.removeText}>Remove</Text>
                </Pressable>
              </View>
            </View>
          </View>
        );
      })}
      {cart.length ? (
        <Card>
          <Text style={styles.total}>{count} item{count === 1 ? '' : 's'} · about ${Math.round(total).toLocaleString('en-US')} on Amazon</Text>
          {missing ? <Text style={styles.muted}>{missing} item{missing === 1 ? ' has' : 's have'} no saved price; Amazon shows the current total.</Text> : null}
          {url ? <Button label="Send to Amazon cart" onPress={async () => { Linking.openURL(url).catch(() => {}); }} /> : null}
          <Text style={styles.muted}>Opens Amazon with everything added to your cart. You check out on Amazon. Use “Mark as owned” on a tool to put it in My tools.</Text>
          <Button label="Empty cart" tone="ghost" onPress={() => clearCart().then(() => showToast('Cart emptied'))} />
        </Card>
      ) : null}
    </Screen>
  );
}

function QtyButton({ label, a11y, onPress }: { label: string; a11y: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={({ pressed }) => [styles.qtyButton, pressed && styles.pressed]}>
      <Text style={styles.qtyButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 4 },
  line: { flexDirection: 'row', gap: 12, backgroundColor: colors.white, borderRadius: 12, borderWidth: 1, borderColor: colors.line, padding: 12 },
  thumb: { width: 72, height: 72, borderRadius: 8, backgroundColor: colors.white },
  title: { fontFamily: fonts.semibold, fontSize: 16, lineHeight: 21, color: colors.ink },
  body: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21, color: colors.charcoal },
  muted: { fontFamily: fonts.regular, fontSize: 14, lineHeight: 19, color: colors.gray },
  total: { fontFamily: fonts.semibold, fontSize: 18, color: colors.maroon },
  disclosure: { fontFamily: fonts.medium, fontSize: 12, lineHeight: 17, color: colors.gray },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 },
  qtyButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1.5, borderColor: colors.maroon, alignItems: 'center', justifyContent: 'center' },
  qtyButtonText: { fontFamily: fonts.semibold, fontSize: 22, color: colors.maroon },
  qty: { fontFamily: fonts.semibold, fontSize: 18, minWidth: 24, textAlign: 'center', color: colors.ink },
  remove: { marginLeft: 'auto', minHeight: 44, justifyContent: 'center' },
  removeText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.maroon },
  pressed: { opacity: 0.7 },
});
