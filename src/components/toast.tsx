import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

type Listener = (message: string) => void;
const listeners = new Set<Listener>();

/** Show a short confirmation at the bottom of the screen, for example "Saved". */
export function showToast(message: string) {
  listeners.forEach((listener) => listener(message));
}

export function ToastHost() {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState<string | null>(null);
  const opacity = useRef(new Animated.Value(0)).current;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const listener: Listener = (next) => {
      setMessage(next);
      if (timer.current) clearTimeout(timer.current);
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
      timer.current = setTimeout(() => {
        Animated.timing(opacity, { toValue: 0, duration: 250, useNativeDriver: true }).start(() => setMessage(null));
      }, 2200);
    };
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
      if (timer.current) clearTimeout(timer.current);
    };
  }, [opacity]);

  if (!message) return null;
  return (
    <View pointerEvents="none" style={[styles.wrap, { bottom: Math.max(insets.bottom, 12) + 84 }]}>
      <Animated.View style={[styles.toast, { opacity }]} accessibilityLiveRegion="polite" accessibilityRole="alert">
        <Ionicons name="checkmark-circle" size={22} color={colors.white} />
        <Text style={styles.text}>{message}</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 1000 },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.ink,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 28,
    maxWidth: 420,
  },
  text: { color: colors.white, fontFamily: fonts.semibold, fontSize: 16 },
});
