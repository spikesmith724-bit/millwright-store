import { useEffect, useState } from 'react';

import { getMeta, setMeta } from '@/db/repo';

export type MyTool = {
  id: string;
  shop_item_id: string | null;
  custom_name: string | null;
  tool_type: string | null;
  qty: number;
  source: 'store' | 'manual';
  added_at: string;
};

/** My tools, saved on this device (Tillson kept these in its cloud per user). */
const KEY = 'my_tools';
let tools: MyTool[] | null = null;
const listeners = new Set<(t: MyTool[]) => void>();
async function publish(next: MyTool[]) {
  tools = next;
  listeners.forEach((l) => l(next));
  await setMeta(KEY, JSON.stringify(next));
}
const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export async function listMyTools(force = false): Promise<MyTool[]> {
  if (tools && !force) return tools;
  try { tools = JSON.parse((await getMeta(KEY)) ?? '[]') as MyTool[]; } catch { tools = []; }
  return tools!;
}

/** Add store items (raises the count when I already have one). */
export async function addMyTools(lines: { shop_item_id: string; qty: number }[], source: 'store' | 'manual' = 'store') {
  if (!lines.length) return;
  const list = [...(await listMyTools())];
  for (const l of lines) {
    const at = list.findIndex((t) => t.shop_item_id === l.shop_item_id);
    if (at >= 0) list[at] = { ...list[at], qty: Math.min(999, list[at].qty + l.qty) };
    else list.unshift({ id: newId(), shop_item_id: l.shop_item_id, custom_name: null, tool_type: null, qty: Math.max(1, l.qty), source, added_at: new Date().toISOString() });
  }
  await publish(list);
}

export async function addCustomTool(name: string, toolType: string | null, qty: number) {
  const clean = name.trim();
  if (!clean) throw new Error('Add a name.');
  const list = await listMyTools();
  await publish([{ id: newId(), shop_item_id: null, custom_name: clean, tool_type: toolType, qty: Math.max(1, Math.min(999, qty)), source: 'manual', added_at: new Date().toISOString() }, ...list]);
}

export async function setMyToolQty(id: string, qty: number) {
  const list = await listMyTools();
  await publish(qty < 1 ? list.filter((t) => t.id !== id) : list.map((t) => (t.id === id ? { ...t, qty: Math.min(999, qty) } : t)));
}

export function useMyTools() {
  const [value, setValue] = useState<MyTool[]>(tools ?? []);
  useEffect(() => {
    listeners.add(setValue);
    listMyTools().then(setValue).catch(() => {});
    return () => { listeners.delete(setValue); };
  }, []);
  return value;
}

export function ownedItemIds(list: MyTool[]) {
  return new Set(list.map((t) => t.shop_item_id).filter(Boolean) as string[]);
}
