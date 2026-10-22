/** True when every word of the query appears in the text (case-insensitive). */
export function matchesSearch(text: string, query: string) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const hay = text.toLowerCase();
  return words.every((w) => hay.includes(w));
}

export type Units = 'metric' | 'sae' | 'both' | null;

/** Whether a tool is metric, SAE/inch, both, or neither, from its title and note. */
export function unitsOf(text: string): Units {
  const t = text.toLowerCase();
  const metric = /\bmetric\b|\bmm\b|\d\s?mm\b/.test(t);
  const sae = /\bsae\b|\binch\b|\d"|\d\/\d+"|\bstandard\b/.test(t);
  if (metric && sae) return 'both';
  return metric ? 'metric' : sae ? 'sae' : null;
}

/** True when a tool fits the unit filter. Tools with no units (hammers, levels) always fit. */
export function fitsUnits(units: Units, want: 'any' | 'metric' | 'sae') {
  return want === 'any' || units === null || units === 'both' || units === want;
}
