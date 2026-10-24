import { CategoryChips } from '@/components/category-chips';
import { Ionicons } from '@expo/vector-icons';
import { ReactNode, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  useWindowDimensions,
  View,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { usePathname, useRouter } from 'expo-router';

import { isTabRoot } from '@/components/nav';
import { SafeAreaView } from 'react-native-safe-area-context';

import { colors, fonts } from '@/theme';

export function wideEnough(width: number) {
  return width >= 980;
}

export function Screen({
  title,
  children,
  right,
  footer,
  onRefresh,
}: {
  title: string;
  children: ReactNode;
  right?: ReactNode;
  footer?: ReactNode;
  onRefresh?: () => void | Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const wide = wideEnough(width);
  const [refreshing, setRefreshing] = useState(false);
  return (
    <SafeAreaView style={[styles.safe, wide ? styles.safeWide : styles.safeNarrow]} edges={['top']}>
      <PageHeader title={title} right={right} light={wide} />
      <KeyboardAvoidingView
        style={[styles.flex, styles.page]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          style={styles.page}
          contentContainerStyle={styles.body}
          keyboardShouldPersistTaps="handled"
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                tintColor={colors.maroon}
                onRefresh={async () => {
                  setRefreshing(true);
                  try { await onRefresh(); } finally { setRefreshing(false); }
                }}
              />
            ) : undefined
          }>
          <View style={styles.column}>
            <CategoryChips position="top" />
            {children}
            <CategoryChips position="bottom" />
          </View>
        </ScrollView>
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/** Big labelled Back button. If there is no screen to go back to (a shared link), it goes to the closest hub. */
export function BackButton({ light }: { light?: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const tint = light ? colors.maroon : colors.white;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Go back"
      hitSlop={8}
      onPress={() => {
        if (router.canGoBack()) router.back();
        else router.replace(fallbackFor(pathname) as never);
      }}
      style={({ pressed }) => [styles.back, light ? styles.backLight : styles.backDark, pressed && styles.backPressed]}>
      <Ionicons name="chevron-back" size={24} color={tint} />
      <Text style={[styles.backText, light && styles.backTextLight]}>Back</Text>
    </Pressable>
  );
}

function fallbackFor(pathname: string) {
  if (pathname.startsWith('/admin')) return pathname === '/admin' ? '/more' : '/admin';
  if (/^\/(dispatch|quotes|register)/.test(pathname)) return '/jobs';
  if (/^\/(messages|board|online)/.test(pathname)) return '/team';
  if (/^\/(inbox|files|settings|about|recently-deleted)/.test(pathname)) return '/more';
  return '/toolbox';
}

export function PageHeader({
  title,
  right,
  light,
}: {
  title: string;
  right?: ReactNode;
  light?: boolean;
}) {
  const pathname = usePathname();
  const showBack = !isTabRoot(pathname);
  return (
    <View style={[styles.header, light && styles.headerLight]}>
      {showBack ? <BackButton light={light} /> : <View style={styles.backSpacer} />}
      <Text style={[styles.headerTitle, light && styles.headerTitleLight]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export function Button({
  label,
  onPress,
  tone = 'primary',
  disabled,
}: {
  label: string;
  onPress: () => void;
  tone?: 'primary' | 'secondary' | 'danger' | 'ghost';
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        tone === 'primary' && styles.buttonPrimary,
        tone === 'secondary' && styles.buttonSecondary,
        tone === 'danger' && styles.buttonDanger,
        tone === 'ghost' && styles.buttonGhost,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text
        style={[
          styles.buttonText,
          tone === 'secondary' && styles.buttonTextDark,
          tone === 'ghost' && styles.buttonTextDark,
          tone === 'danger' && styles.buttonTextDanger,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function Field({
  label,
  hint,
  style,
  ...input
}: { label: string; hint?: string } & TextInputProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.gray} style={[styles.input, style]} {...input} />
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function Area({ label, hint, ...input }: { label: string; hint?: string } & TextInputProps) {
  return (
    <Field label={label} hint={hint} multiline textAlignVertical="top" style={styles.area} {...input} />
  );
}

export function Card({ children, accent }: { children: ReactNode; accent?: boolean }) {
  return <View style={[styles.card, accent && styles.cardAccent]}>{children}</View>;
}

export function Section({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {action}
    </View>
  );
}

export function Banner({ text, tone = 'warn' }: { text: string; tone?: 'warn' | 'error' }) {
  return (
    <View style={[styles.banner, tone === 'error' && styles.bannerError]}>
      <Text style={[styles.bannerText, tone === 'error' && styles.bannerTextError]}>{text}</Text>
    </View>
  );
}

export function Empty({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function Loading({ label = 'Loading' }: { label?: string }) {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color={colors.maroon} />
      <Text style={styles.hint}>{label}</Text>
    </View>
  );
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: 'neutral' | 'maroon' | 'error' }) {
  return (
    <View style={[styles.badge, tone === 'maroon' && styles.badgeMaroon, tone === 'error' && styles.badgeError]}>
      <Text style={[styles.badgeText, (tone === 'maroon' || tone === 'error') && styles.badgeTextLight]}>{label}</Text>
    </View>
  );
}

export function Chips({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={styles.chips}>
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            onPress={() => onChange(option.value)}
            style={[styles.chip, selected && styles.chipOn]}>
            <Text style={[styles.chipText, selected && styles.chipTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Stepper({
  label,
  value,
  onChange,
  step = 1,
  min = 0,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  step?: number;
  min?: number;
}) {
  return (
    <View style={styles.stepper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.stepperRow}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Decrease ${label}`}
          onPress={() => onChange(Math.max(min, Math.round((value - step) * 10) / 10))}
          style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>−</Text>
        </Pressable>
        <Text style={styles.stepValue}>{Number.isInteger(value) ? value : value.toFixed(1)}</Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Increase ${label}`}
          onPress={() => onChange(Math.round((value + step) * 10) / 10)}
          style={styles.stepBtn}>
          <Text style={styles.stepBtnText}>+</Text>
        </Pressable>
      </View>
    </View>
  );
}

export function Meta({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.meta}>
      <Text style={styles.metaLabel}>{label}</Text>
      <Text style={styles.metaValue}>{value}</Text>
    </View>
  );
}

export function HubLink({ title, blurb, onPress }: { title: string; blurb: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${blurb}`} onPress={onPress} style={({ pressed }) => [styles.hub, pressed && styles.pressed]}>
      <View style={styles.hubText}>
        <Text style={styles.hubTitle}>{title}</Text>
        <Text style={styles.hubBlurb}>{blurb}</Text>
      </View>
      <Ionicons name="chevron-forward" size={22} color={colors.gray} />
    </Pressable>
  );
}

export function Figure({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <View style={styles.figure}>
      <Text style={styles.figureLabel}>{label}</Text>
      <Text style={styles.figureValue}>{value}</Text>
      {detail ? <Text style={styles.figureDetail}>{detail}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  safe: { flex: 1, backgroundColor: colors.bg },
  safeNarrow: { backgroundColor: colors.maroon },
  safeWide: { backgroundColor: colors.white },
  page: { flex: 1, backgroundColor: colors.bg },
  header: {
    minHeight: 64,
    backgroundColor: colors.maroon,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingBottom: 8,
  },
  headerLight: {
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  back: {
    minWidth: 92,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 6,
    paddingRight: 12,
    marginRight: 8,
    borderRadius: 24,
  },
  backDark: { backgroundColor: 'rgba(255,255,255,0.16)' },
  backLight: { backgroundColor: '#F5EDED' },
  backPressed: { opacity: 0.7 },
  backSpacer: { width: 16 },
  backText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 18 },
  backTextLight: { color: colors.maroon },
  headerTitle: {
    flex: 1,
    color: colors.white,
    fontFamily: fonts.semibold,
    fontSize: 20,
  },
  headerTitleLight: { color: colors.ink },
  headerRight: { minWidth: 8, alignItems: 'flex-end' },
  body: { padding: 16, paddingBottom: 48 },
  column: { width: '100%', maxWidth: 880, alignSelf: 'center', gap: 12 },
  footer: {
    padding: 12,
    paddingBottom: 20,
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.line,
    gap: 8,
  },
  button: {
    minHeight: 56,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  buttonPrimary: { backgroundColor: colors.maroon },
  buttonSecondary: { backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.maroon },
  buttonDanger: { backgroundColor: colors.errorBg, borderWidth: 1, borderColor: colors.error },
  buttonGhost: { backgroundColor: 'transparent' },
  buttonText: { color: colors.white, fontFamily: fonts.semibold, fontSize: 17 },
  buttonTextDark: { color: colors.maroon },
  buttonTextDanger: { color: colors.error },
  pressed: { opacity: 0.86 },
  disabled: { opacity: 0.45 },
  field: { gap: 6 },
  label: { fontFamily: fonts.medium, fontSize: 15, color: colors.charcoal },
  input: {
    minHeight: 56,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    paddingHorizontal: 14,
    fontFamily: fonts.regular,
    fontSize: 17,
    color: colors.ink,
  },
  area: { minHeight: 120, paddingTop: 14 },
  hint: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray },
  card: {
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: 16,
    gap: 10,
    borderWidth: 1,
    borderColor: '#EFECEC',
    shadowColor: '#151414',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  cardAccent: { borderLeftWidth: 4, borderLeftColor: colors.maroon },
  section: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink },
  banner: {
    backgroundColor: colors.bg,
    borderRadius: 4,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.line,
    borderLeftWidth: 4,
    borderLeftColor: colors.maroon,
  },
  bannerError: { backgroundColor: colors.errorBg, borderColor: colors.error, borderLeftColor: colors.error },
  bannerText: { color: colors.ink, fontFamily: fonts.medium, fontSize: 15, lineHeight: 21 },
  bannerTextError: { color: colors.error },
  empty: { paddingVertical: 28, gap: 6 },
  emptyTitle: { fontFamily: fonts.semibold, fontSize: 20, color: colors.ink },
  emptyBody: { fontFamily: fonts.regular, fontSize: 16, color: colors.gray, lineHeight: 22 },
  loading: { padding: 24, alignItems: 'center', gap: 8 },
  badge: { alignSelf: 'flex-start', backgroundColor: colors.bg, borderRadius: 4, paddingHorizontal: 8, paddingVertical: 4 },
  badgeMaroon: { backgroundColor: colors.maroon },
  badgeError: { backgroundColor: colors.error },
  badgeText: { fontFamily: fonts.medium, fontSize: 13, color: colors.charcoal },
  badgeTextLight: { color: colors.white },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.maroon, borderColor: colors.maroon },
  chipText: { fontFamily: fonts.medium, fontSize: 15, color: colors.ink },
  chipTextOn: { color: colors.white },
  stepper: { gap: 6 },
  stepperRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  stepBtn: {
    width: 56,
    height: 56,
    borderRadius: 4,
    backgroundColor: colors.maroon,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { color: colors.white, fontSize: 28, fontFamily: fonts.medium, lineHeight: 32 },
  stepValue: { minWidth: 64, textAlign: 'center', fontFamily: fonts.semibold, fontSize: 22, color: colors.ink },
  meta: { gap: 2 },
  metaLabel: { fontFamily: fonts.regular, fontSize: 13, color: colors.gray },
  metaValue: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  figure: { gap: 2, paddingVertical: 4 },
  figureLabel: { fontFamily: fonts.medium, fontSize: 14, color: colors.charcoal },
  figureValue: { fontFamily: fonts.bold, fontSize: 36, color: colors.ink, lineHeight: 42 },
  figureDetail: { fontFamily: fonts.regular, fontSize: 15, color: colors.charcoal, lineHeight: 21 },
  hub: {
    minHeight: 76,
    backgroundColor: colors.white,
    borderRadius: 6,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#EFECEC',
    shadowColor: '#151414',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
  hubText: { flex: 1, gap: 4 },
  hubTitle: { fontFamily: fonts.semibold, fontSize: 18, color: colors.ink },
  hubBlurb: { fontFamily: fonts.regular, fontSize: 15, color: colors.gray },
  hubGo: { fontFamily: fonts.semibold, fontSize: 15, color: colors.maroon },
});
