import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase/public";
import { SOCIETY_PATH } from "@/lib/config";
import { placeSlug, STATE_NAMES } from "@/lib/stores/places";

const baseUrl = "https://www.undergroundaquarium.com";

export const revalidate = 3600;

type Entry = MetadataRoute.Sitemap[number];
type Freq = NonNullable<Entry["changeFrequency"]>;

/**
 * Supabase hands back at most 1000 rows per request, so anything that can
 * outgrow that — shops, listings, species — has to be paged through or the
 * sitemap quietly stops at a thousand. The caller builds its own query and
 * we just keep asking for the next slice.
 */
type Page = PromiseLike<{ data: unknown[] | null; error: unknown }>;

async function all<T>(query: (from: number, to: number) => Page): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await query(from, from + 999);
    if (error || !data) break;
    out.push(...(data as unknown as T[]));
    if (data.length < 1000) break;
  }
  return out;
}

/** A real date beats a made-up one: Google learns to distrust "everything changed today". */
function when(value: unknown): Date | undefined {
  if (typeof value !== "string") return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const entry = (path: string, priority: number, changeFrequency: Freq, lastModified?: Date): Entry => ({
  url: `${baseUrl}${path}`,
  lastModified: lastModified ?? new Date(),
  changeFrequency,
  priority,
});

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [
    terms,
    species,
    stores,
    events,
    regions,
    listings,
    courses,
    forumCats,
    forumThreads,
    breedingGuides,
    tanks,
    profiles,
    clubs,
  ] = await Promise.all([
    all<{ slug: string }>((a, b) => supabasePublic.from("glossary_terms").select("slug").range(a, b)),
    all<{ slug: string; updated_at?: string }>((a, b) =>
      supabasePublic.from("species").select("slug, updated_at").range(a, b)
    ),
    all<{ slug: string; updated_at?: string; city: string | null; state: string | null }>((a, b) =>
      supabasePublic
        .from("fish_stores")
        .select("slug, updated_at, city, state")
        .eq("status", "published")
        .range(a, b)
    ),
    all<{ slug: string }>((a, b) =>
      supabasePublic.from("events").select("slug").eq("status", "published").range(a, b)
    ),
    all<{ state_code: string; slug: string }>((a, b) =>
      supabasePublic.from("market_regions").select("state_code, slug").range(a, b)
    ),
    all<{ slug: string; updated_at?: string; state_code: string; region_slug: string }>((a, b) =>
      supabasePublic
        .from("listings")
        .select("slug, updated_at, state_code, region_slug")
        .eq("status", "active")
        .gt("expires_at", new Date().toISOString())
        .range(a, b)
    ),
    all<{ slug: string }>((a, b) =>
      supabasePublic.from("courses").select("slug").eq("is_published", true).range(a, b)
    ),
    all<{ id: string; slug: string }>((a, b) =>
      supabasePublic.from("forum_categories").select("id, slug").eq("is_public", true).range(a, b)
    ),
    all<{
      slug: string;
      category_id: string;
      is_seeded: boolean;
      reply_count: number;
      last_post_at?: string;
    }>((a, b) =>
      supabasePublic
        .from("forum_threads")
        .select("slug, category_id, is_seeded, reply_count, last_post_at")
        .range(a, b)
    ),
    all<{ species_slug: string }>((a, b) =>
      supabasePublic.from("public_breeding_guides").select("species_slug").range(a, b)
    ),
    all<{ id: string; updated_at?: string }>((a, b) =>
      supabasePublic.from("tanks").select("id, updated_at").eq("is_public", true).range(a, b)
    ),
    all<{ username: string | null }>((a, b) =>
      supabasePublic.from("profiles").select("username").not("username", "is", null).range(a, b)
    ),
    all<{ slug: string }>((a, b) => supabasePublic.from("clubs").select("slug").range(a, b)),
  ]);

  // ---- Hand-written pages -------------------------------------------
  const hubs: [string, number, Freq][] = [
    ["", 1, "daily"],
    ["/marketplace", 0.9, "daily"],
    ["/where-to-sell-aquarium-fish", 0.8, "monthly"],
    ["/stores", 0.9, "daily"],
    ["/species", 0.8, "weekly"],
    ["/breeding", 0.8, "weekly"],
    ["/forums", 0.8, "daily"],
    ["/feed", 0.7, "daily"],
    ["/courses", 0.7, "weekly"],
    ["/events", 0.7, "weekly"],
    [SOCIETY_PATH, 0.7, "weekly"],
    ["/glossary", 0.6, "weekly"],
    ["/tank-builder", 0.6, "monthly"],
    ["/water-check", 0.6, "monthly"],
    ["/post", 0.6, "monthly"],
    ["/about", 0.5, "monthly"],
    ["/rules", 0.5, "monthly"],
    ["/verify", 0.4, "monthly"],
    ["/privacy", 0.2, "yearly"],
    ["/terms", 0.2, "yearly"],
  ];

  const out: Entry[] = hubs.map(([p, pr, f]) => entry(p, pr, f));

  // ---- The shop directory: its biggest body of pages ----------------
  for (const s of stores) out.push(entry(`/stores/${s.slug}`, 0.7, "monthly", when(s.updated_at)));

  // City and state pages: what people actually search ("aquarium store sacramento").
  out.push(entry("/aquarium-stores", 0.9, "weekly"));
  const placeStates = new Set<string>();
  const placeCities = new Set<string>();
  for (const s of stores) {
    const st = s.state?.toUpperCase();
    if (!st || !STATE_NAMES[st]) continue;
    placeStates.add(st);
    const c = s.city?.trim() ? placeSlug(s.city) : "";
    if (c) placeCities.add(`${st.toLowerCase()}/${c}`);
  }
  for (const st of placeStates) out.push(entry(`/aquarium-stores/${st.toLowerCase()}`, 0.8, "weekly"));
  for (const c of placeCities) out.push(entry(`/aquarium-stores/${c}`, 0.8, "weekly"));

  // ---- Classifieds --------------------------------------------------
  // Only areas with live ads: empty ones are noindexed thin pages, and
  // listing them here would just teach Google to ignore the sitemap.
  const liveAreas = new Map<string, Date | undefined>();
  const liveStates = new Map<string, Date | undefined>();
  for (const l of listings) {
    const d = when(l.updated_at);
    const area = `${l.state_code.toLowerCase()}/${l.region_slug}`;
    const st = l.state_code.toLowerCase();
    if (!liveAreas.has(area) || (d && (!liveAreas.get(area) || d > liveAreas.get(area)!))) liveAreas.set(area, d);
    if (!liveStates.has(st) || (d && (!liveStates.get(st) || d > liveStates.get(st)!))) liveStates.set(st, d);
  }
  const knownAreas = new Set(regions.map((r) => `${r.state_code.toLowerCase()}/${r.slug}`));
  for (const [st, d] of liveStates) out.push(entry(`/marketplace/${st}`, 0.8, "daily", d));
  for (const [area, d] of liveAreas) {
    if (knownAreas.has(area)) out.push(entry(`/marketplace/${area}`, 0.8, "daily", d));
  }
  for (const l of listings) out.push(entry(`/listing/${l.slug}`, 0.7, "daily", when(l.updated_at)));

  // ---- Reference ----------------------------------------------------
  for (const s of species) out.push(entry(`/species/${s.slug}`, 0.7, "monthly", when(s.updated_at)));
  for (const t of terms) out.push(entry(`/glossary/${t.slug}`, 0.5, "monthly"));
  for (const c of courses) out.push(entry(`/courses/${c.slug}`, 0.7, "monthly"));
  for (const e of events) out.push(entry(`/events/${e.slug}`, 0.6, "weekly"));

  // One guide page per species, however many logs feed it.
  const guideSlugs = new Set<string>();
  for (const g of breedingGuides) {
    if (g.species_slug) guideSlugs.add(g.species_slug);
  }
  for (const slug of guideSlugs) out.push(entry(`/breeding/${slug}`, 0.7, "monthly"));

  // ---- Forums: mirror the pages' own indexing rules -------------------
  const catSlugById = new Map(forumCats.map((c) => [c.id, c.slug]));
  const indexable = forumThreads.filter((t) => t.is_seeded || (t.reply_count ?? 0) >= 1);
  const countByCat = new Map<string, number>();
  for (const t of indexable) countByCat.set(t.category_id, (countByCat.get(t.category_id) ?? 0) + 1);

  for (const c of forumCats) {
    if ((countByCat.get(c.id) ?? 0) >= 3) out.push(entry(`/forums/${c.slug}`, 0.6, "daily"));
  }
  for (const t of indexable) {
    const cat = catSlugById.get(t.category_id);
    if (cat) out.push(entry(`/forums/${cat}/${t.slug}`, 0.6, "weekly", when(t.last_post_at)));
  }

  // The Society's own join page, which is a sales page and should rank.
  for (const c of clubs) out.push(entry(`/c/${c.slug}`, 0.7, "weekly"));

  // ---- Members' own pages -------------------------------------------
  for (const t of tanks) out.push(entry(`/tanks/${t.id}`, 0.5, "monthly", when(t.updated_at)));
  for (const p of profiles) {
    if (p.username) out.push(entry(`/u/${p.username}`, 0.4, "weekly"));
  }

  // One URL each, whatever happened above.
  const seen = new Set<string>();
  return out.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
