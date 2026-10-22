import { StyleSheet, Text } from 'react-native';

import { colors, fonts } from '@/theme';

export function SectionTitle({ title }: { title: string }) {
  return <Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>;
}

export function Intro({ text }: { text: string }) {
  return <Text style={styles.intro}>{text}</Text>;
}

const styles = StyleSheet.create({
  sectionTitle: { fontFamily: fonts.semibold, fontSize: 14, letterSpacing: 0.8, textTransform: 'uppercase', color: colors.maroon, marginTop: 12, marginBottom: 2 },
  intro: { fontFamily: fonts.regular, fontSize: 16, color: colors.charcoal, lineHeight: 22 },
});
