/** Tool types, in the order the Tool Store and My tools show them. Anything else goes under Other. */
export const TOOL_TYPES = [
  'Indicators', 'Micrometers & calipers', 'Gauges', 'Levels & straight edges', 'Alignment', 'Torque', 'Temperature & vibration',
  'Layout', 'Wrenches & sockets', 'Hammers', 'Punches, chisels & files', 'Pry bars & pullers', 'Screwdrivers & pliers', 'Shims & lights',
];

export function toolTypeOf(type: string | null | undefined) {
  return type && type.trim() ? type : 'Other';
}

export function groupByType<T>(rows: T[], typeOf: (row: T) => string | null | undefined) {
  const map = new Map<string, T[]>();
  for (const r of rows) {
    const t = toolTypeOf(typeOf(r));
    map.set(t, [...(map.get(t) ?? []), r]);
  }
  const extra = [...map.keys()].filter((t) => !TOOL_TYPES.includes(t) && t !== 'Other');
  return [...TOOL_TYPES, ...extra, 'Other'].filter((t) => map.has(t)).map((t) => ({ type: t, rows: map.get(t)! }));
}
