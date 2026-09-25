/**
 * A build fits in a short, readable link: /tank-builder?g=29&f=neon-tetra:10,panda-cory:6
 * so anyone can share a stocking plan without an account, and size pages
 * can link straight into a ready-made build.
 */
export type BuildParams = { gallons: number | null; items: { slug: string; qty: number }[] };

export function buildQuery(gallons: number | null, items: { slug: string; qty: number }[]): string {
  const parts: string[] = [];
  if (gallons && gallons > 0) parts.push(`g=${Math.round(gallons * 10) / 10}`);
  if (items.length) parts.push(`f=${items.map((i) => `${i.slug}:${i.qty}`).join(",")}`);
  return parts.length ? `?${parts.join("&")}` : "";
}

export function buildPath(gallons: number | null, items: { slug: string; qty: number }[]): string {
  return `/tank-builder${buildQuery(gallons, items)}`;
}

export function parseBuild(search: string): BuildParams | null {
  const q = new URLSearchParams(search);
  const g = q.get("g");
  const f = q.get("f");
  if (!g && !f) return null;
  const gallons = g ? parseFloat(g) : NaN;
  const items: { slug: string; qty: number }[] = [];
  for (const part of (f ?? "").split(",")) {
    const [slug, n] = part.split(":");
    if (!slug || !/^[a-z0-9-]+$/i.test(slug)) continue;
    const qty = Math.min(999, Math.max(1, parseInt(n ?? "1", 10) || 1));
    if (!items.some((i) => i.slug === slug)) items.push({ slug, qty });
  }
  return { gallons: Number.isFinite(gallons) && gallons > 0 ? gallons : null, items: items.slice(0, 40) };
}
