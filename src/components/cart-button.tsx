import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useCart } from '@/shop/cart-store';
import { colors, fonts } from '@/theme';

/** "Cart (n)" button that opens the cart screen. */
export function CartButton() {
  const router = useRouter();
  const count = useCart().reduce((n, l) => n + l.qty, 0);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Cart, ${count} item${count === 1 ? '' : 's'}`} onPress={() => router.push('/shop/cart' as never)} style={({ pressed }) => [styles.button, pressed && styles.pressed]}>
      <Ionicons name="cart-outline" size={22} color={colors.white} />
      <Text style={styles.text}>Cart{count ? ` (${count})` : ''}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 52, borderRadius: 12, backgroundColor: colors.charcoal, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  text: { fontFamily: fonts.semibold, fontSize: 16, color: colors.white },
  pressed: { opacity: 0.85 },
});
