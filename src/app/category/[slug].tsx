import { useLocalSearchParams } from 'expo-router';

import { StoreBrowser } from '@/components/store-browser';
import { Banner, Screen } from '@/components/ui';
import { SECTIONS, sectionBySlug } from '@/lib/sections';

export function generateStaticParams() {
  return SECTIONS.map((s) => ({ slug: s.slug }));
}

export default function CategoryScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const section = sectionBySlug(slug);
  if (!section) return <Screen title="Not found"><Banner tone="error" text="That store section does not exist." /></Screen>;
  return <StoreBrowser key={section.slug} section={section.slug} />;
}
