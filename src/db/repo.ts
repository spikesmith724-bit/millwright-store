import AsyncStorage from '@react-native-async-storage/async-storage';

/** Small key/value store on this device (localStorage on web). Replaces Tillson's SQLite meta table. */
export async function getMeta(key: string): Promise<string | null> {
  return AsyncStorage.getItem(`millwright-store:${key}`);
}
export async function setMeta(key: string, value: string): Promise<void> {
  await AsyncStorage.setItem(`millwright-store:${key}`, value);
}
