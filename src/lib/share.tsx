import * as Linking from 'expo-linking';
import { Platform, Share } from 'react-native';

import { Button } from '@/components/ui';

/** Web link on the live site, or millwrightstore://<path> in the app. */
export function deepLink(path: string) {
  if (Platform.OS === 'web' && typeof window !== 'undefined') return `${window.location.origin}/millwright-store${path}`;
  return Linking.createURL(path.replace(/^\//, ''), { scheme: 'millwrightstore' });
}

export async function sharePage(title: string, path: string) {
  await Share.share({ message: `${title}\n\n${deepLink(path)}` }).catch(() => {});
}

export function ShareButton({ title, path }: { title: string; path: string }) {
  return <Button label="Share" tone="secondary" onPress={() => sharePage(title, path)} />;
}
