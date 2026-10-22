import { useEffect, useState } from 'react';

import { getMeta, setMeta } from '@/db/repo';
import { mergeCart, parseCart, setQty, type CartLine } from '@/lib/cart';

/** The Tool Store cart, saved on this phone . */
let cart: CartLine[] = [];
let loadedFor: string | null = null;
const listeners = new Set<(c: CartLine[]) => void>();

async function userKey() {
  return 'shop_cart';
}

async function ensure() {
  const key = await userKey();
  if (loadedFor !== key) {
    cart = parseCart(await getMeta(key));
    loadedFor = key;
    listeners.forEach((l) => l(cart));
  }
  return key;
}

async function save(next: CartLine[]) {
  const key = await ensure();
  cart = next;
  listeners.forEach((l) => l(cart));
  await setMeta(key, JSON.stringify(cart));
}

export async function getCart() {
  await ensure();
  return cart;
}
export async function addToCart(lines: CartLine[], mode: 'max' | 'sum' = 'sum') {
  await ensure();
  await save(mergeCart(cart, lines, mode));
}
export async function setCartQty(asin: string, qty: number) {
  await ensure();
  await save(setQty(cart, asin, qty));
}
export async function clearCart() {
  await save([]);
}

export function useCart() {
  const [value, setValue] = useState<CartLine[]>(cart);
  useEffect(() => {
    listeners.add(setValue);
    ensure().then(() => setValue(cart)).catch(() => {});
    return () => { listeners.delete(setValue); };
  }, []);
  return value;
}
