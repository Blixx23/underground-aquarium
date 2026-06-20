export type TankItem = { slug: string; qty: number };

// Unique species slugs across a set of tanks (items may be loosely typed).
export function collectSlugs(tanks: { items: unknown }[]): string[] {
  const set = new Set<string>();
  for (const t of tanks) {
    const items = Array.isArray(t.items) ? (t.items as TankItem[]) : [];
    for (const it of items) {
      if (it && typeof it.slug === "string") set.add(it.slug);
    }
  }
  return Array.from(set);
}

// Up to `max` short labels (e.g. "3× Guppy") plus a "+N more" count.
export function tankInhabitants(
  items: unknown,
  names: Map<string, string>,
  max = 3
): { labels: string[]; more: number } {
  const list = Array.isArray(items) ? (items as TankItem[]) : [];
  const labels = list.slice(0, max).map((it) => {
    const name = names.get(it.slug) || "Unknown species";
    return it.qty > 1 ? `${it.qty}× ${name}` : name;
  });
  return { labels, more: Math.max(0, list.length - max) };
}
