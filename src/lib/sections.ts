/** Store sections shown as tabs on the home screen, each with its own route at /category/<slug>. Pure, no React. */
export type SectionSlug = 'hand' | 'precision' | 'bolting' | 'rigging' | 'power' | 'ppe' | 'lubrication' | 'storage' | 'machinist' | 'shims' | 'layout';

export const SECTIONS: { slug: SectionSlug; label: string; blurb: string }[] = [
  { slug: 'hand', label: 'Hand Tools', blurb: 'Wrenches, sockets, pliers, hammers, pry bars, pullers and lights.' },
  { slug: 'precision', label: 'Precision Tools', blurb: 'Dial indicators, micrometers, calipers, levels, feeler gauges, temperature and vibration.' },
  { slug: 'bolting', label: 'Bolting & Torque', blurb: 'Torque wrenches, multipliers, hydraulic wrenches, flange spreaders and wedges.' },
  { slug: 'rigging', label: 'Rigging', blurb: 'Hoists, shackles, slings, skates and jacks.' },
  { slug: 'power', label: 'Power Tools', blurb: 'Impacts, drills, grinders, band saws and mag drills.' },
  { slug: 'machinist', label: 'Machinist Tools', blurb: 'End mills, taps and dies, drill bits, edge finders, blocks and surface plates.' },
  { slug: 'shims', label: 'Shims & Alignment', blurb: 'Shim stock, slotted shim kits and shaft alignment.' },
  { slug: 'layout', label: 'Layout & Marking', blurb: 'Squares, rules, scribers, punches, chalk lines and markers.' },
  { slug: 'lubrication', label: 'Lubrication', blurb: 'Grease guns, grease, penetrating oil, anti-seize and threadlocker.' },
  { slug: 'ppe', label: 'Safety / PPE', blurb: 'Glasses, gloves, hearing protection, hard hats and respirators.' },
  { slug: 'storage', label: 'Tool Storage & Bags', blurb: 'Tool bags, backpacks, boxes and organizers.' },
];

export function sectionBySlug(slug: string | null | undefined) {
  return SECTIONS.find((s) => s.slug === slug) ?? null;
}

/** Where a Tillson item (category + subcategory) lands in this store. */
export function sectionForTillson(category: string, subcategory: string | null, title: string): SectionSlug {
  const t = title.toLowerCase();
  if (subcategory === 'Torque' || /flange (spreader|wedge)|banana wedge/.test(t)) return 'bolting';
  if (subcategory === 'Rigging & lifting') return 'rigging';
  if (/shim|laser shaft alignment/.test(t)) return 'shims';
  if (subcategory === 'Layout' || /combination (square|set)|steel rule|scriber|center punch/.test(t)) return 'layout';
  if (category === 'precision') return 'precision';
  if (category === 'power') return 'power';
  if (category === 'ppe') return 'ppe';
  if (category === 'rigging') return 'rigging';
  return 'hand';
}
