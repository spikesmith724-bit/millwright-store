import { usePathname, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { SECTIONS, sectionBySlug, type SectionSlug } from '@/lib/sections';
import { colors, fonts } from '@/theme';

/** Which chip is active for a route: '/' -> All (null), '/category/x' -> x, anything else -> none (undefined). */
export function activeChipFor(pathname: string): SectionSlug | null | undefined {
  const p = pathname.replace(/\/+$/, '').replace(/^\/millwright-store/, '') || '/';
  if (p === '/' || p === '/index') return null;
  const m = /^\/category\/([^/]+)$/.exec(p);
  return m ? sectionBySlug(m[1])?.slug : undefined;
}

/** Store category chip bar, shown at the top and bottom of every screen (rendered by Screen). */
export function CategoryChips({ position = 'top' }: { position?: 'top' | 'bottom' }) {
  const router = useRouter();
  const active = activeChipFor(usePathname());
  const tabs = [{ slug: null as SectionSlug | null, label: 'All' }, ...SECTIONS.map((s) => ({ slug: s.slug as SectionSlug | null, label: s.label }))];
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs} accessibilityRole="tablist" accessibilityLabel={`Store categories (${position})`} testID={`category-chips-${position}`}>
      {tabs.map((t) => {
        const on = t.slug === active;
        return (
          <Pressable key={t.label} accessibilityRole="tab" accessibilityState={{ selected: on }} onPress={() => router.navigate((t.slug ? `/category/${t.slug}` : '/') as never)} style={[styles.tab, on && styles.tabOn]}>
            <Text style={[styles.tabText, on && styles.tabTextOn]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  tabs: { gap: 8, paddingRight: 8 },
  tab: { minHeight: 40, paddingHorizontal: 14, borderRadius: 20, borderWidth: 1, borderColor: colors.line, backgroundColor: colors.white, justifyContent: 'center' },
  tabOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  tabText: { fontFamily: fonts.semibold, fontSize: 14, color: colors.charcoal },
  tabTextOn: { color: colors.white },
});
