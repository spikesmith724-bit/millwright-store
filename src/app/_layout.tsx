import { useFonts } from 'expo-font';
import { Stack, usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';

import { ToastHost } from '@/components/toast';
import { wideEnough } from '@/components/ui';
import { SECTIONS } from '@/lib/sections';
import { brand, colors, fonts } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({ Inter_300Light, Inter_400Regular, Inter_500Medium, Inter_600SemiBold, Inter_700Bold });
  const { width } = useWindowDimensions();
  const wide = wideEnough(width);
  useEffect(() => { if (fontsLoaded) SplashScreen.hideAsync().catch(() => {}); }, [fontsLoaded]);
  if (!fontsLoaded) return null;
  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <StatusBar style={wide ? 'dark' : 'light'} />
        <View style={[styles.flex, wide && styles.row]}>
          {wide ? <Sidebar /> : null}
          <View style={styles.flex}>
            <Stack screenOptions={{ headerShown: false, gestureEnabled: true, fullScreenGestureEnabled: true, contentStyle: { backgroundColor: colors.bg } }} />
          </View>
        </View>
        <ToastHost />
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const links = [{ href: '/', label: 'All tools' }, ...SECTIONS.map((s) => ({ href: `/category/${s.slug}`, label: s.label })), { href: '/shop/cart', label: 'Cart' }, { href: '/my-tools', label: 'My tools' }];
  return (
    <View style={styles.side}>
      <Text style={styles.sideBrand}>{brand.name}</Text>
      <Text style={styles.sideSlogan}>{brand.slogan}</Text>
      <ScrollView contentContainerStyle={styles.sideList}>
        {links.map((item) => (
          <Pressable key={item.href} accessibilityRole="button" onPress={() => router.navigate(item.href as never)} style={[styles.sideItem, pathname === item.href && styles.sideItemOn]}>
            <Text style={styles.sideText}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  row: { flexDirection: 'row' },
  side: { width: 268, backgroundColor: colors.maroon },
  sideBrand: { color: colors.white, fontFamily: fonts.bold, fontSize: 22, paddingHorizontal: 16, paddingTop: 20 },
  sideSlogan: { color: 'rgba(255,255,255,0.8)', fontFamily: fonts.regular, fontSize: 13, paddingHorizontal: 16, marginBottom: 8, marginTop: 4 },
  sideList: { paddingBottom: 24 },
  sideItem: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16 },
  sideItemOn: { backgroundColor: 'rgba(255,255,255,0.14)' },
  sideText: { color: colors.white, fontFamily: fonts.medium, fontSize: 16 },
});
