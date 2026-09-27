import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase/public";
import { SOCIETY_PATH } from "@/lib/config";
import { cityPath, getPlaceStores, groupCities, milesBetween } from "@/lib/stores/places";
import { TANK_SIZES } from "@/lib/tankBuilder/sizes";
import { cityWorthIndexing, storeIsStub } from "@/lib/stores/thin";
import { plainText, threadIndexable } from "@/lib/forum/indexable";
import { postIndexable } from "@/lib/feedSeo";
import type { FeedItem } from "@/lib/feed";

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

// No date when we don't know one: a sitemap that says every page changed
// today teaches Google to ignore its dates.
const entry = (path: string, priority: number, changeFrequency: Freq, lastModified?: Date): Entry => ({
  url: `${baseUrl}${path}`,
  ...(lastModified ? { lastModified } : {}),
  changeFrequency,
  priority,
});

/** Every indexable feed post, newest first, through the same feed the site shows. */
async function feedPosts(): Promise<FeedItem[]> {
  const out: FeedItem[] = [];
  let before: string | null = null;
  for (let page = 0; page < 60; page++) {
    const { data, error }: { data: unknown; error: unknown } = await supabasePublic.rpc("get_feed", {
      p_scope: "everyone",
      p_user: null,
      p_before: before,
      p_limit: 50,
    });
    const items: FeedItem[] = (data as FeedItem[] | null) ?? [];
    if (error || items.length === 0) break;
    for (const i of items) {
      if (i.kind === "post" && postIndexable({ body: i.body, images: i.images, comment_count: i.comment_count })) {
        out.push(i);
      }
    }
    const last: string = items[items.length - 1].created_at;
    if (!last || last === before || items.length < 50) break;
    before = last;
  }
  return out;
}

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
    // species has created_at but no updated_at; asking for a missing column
    // errors the whole query and silently drops every species page.
    all<{ slug: string; created_at?: string }>((a, b) =>
      supabasePublic.from("species").select("slug, created_at").range(a, b)
    ),
    all<{
      id: string;
      slug: string;
      updated_at?: string;
      address: string | null;
      phone: string | null;
      description: string | null;
      claimed_by: string | null;
    }>((a, b) =>
      supabasePublic
        .from("fish_stores")
        .select("id, slug, updated_at, address, phone, description, claimed_by")
        .eq("status", "published")
        .range(a, b)
    ),
    all<{ slug: string; starts_at: string | null; ends_at: string | null }>((a, b) =>
      supabasePublic.from("events").select("slug, starts_at, ends_at").eq("status", "published").range(a, b)
    ),
    all<{ state_code: string; slug: string }>((a, b) =>
      supabasePublic.from("market_regions").select("state_code, slug").range(a, b)
    ),
    all<{ slug: string; updated_at?: string; state_code: string; region_slug: string; user_id: string }>((a, b) =>
      supabasePublic
        .from("listings")
        .select("slug, updated_at, state_code, region_slug, user_id")
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
      id: string;
      slug: string;
      category_id: string;
      author_id: string | null;
      is_seeded: boolean;
      reply_count: number;
      last_activity_at?: string;
    }>((a, b) =>
      supabasePublic
        .from("forum_threads")
        .select("id, slug, category_id, author_id, is_seeded, reply_count, last_activity_at")
        .is("hidden_at", null)
        .range(a, b)
    ),
    all<{ species_slug: string }>((a, b) =>
      supabasePublic.from("public_breeding_guides").select("species_slug").range(a, b)
    ),
    all<{ id: string; updated_at?: string; user_id: string }>((a, b) =>
      supabasePublic.from("tanks").select("id, updated_at, user_id").eq("is_public", true).range(a, b)
    ),
    all<{ id: string; username: string | null; bio: string | null }>((a, b) =>
      supabasePublic.from("profiles").select("id, username, bio").not("username", "is", null).range(a, b)
    ),
    all<{ slug: string }>((a, b) => supabasePublic.from("clubs").select("slug").range(a, b)),
  ]);

  const [opPosts, reviewed, placeStores, posts] = await Promise.all([
    all<{ thread_id: string; body: string | null }>((a, b) =>
      supabasePublic.from("forum_posts").select("thread_id, body").eq("is_op", true).range(a, b)
    ),
    all<{ store_id: string }>((a, b) => supabasePublic.from("store_reviews").select("store_id").range(a, b)),
    getPlaceStores(),
    feedPosts(),
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
    ["/tank-builder", 0.8, "monthly"],
    // One guide per common tank size ("29 gallon tank stocking ideas").
    ...TANK_SIZES.map((t): [string, number, Freq] => [`/tank-builder/${t.slug}`, 0.7, "monthly"]),
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
  // Bare stubs (name and town only) are noindexed on the page; leave them out here too.
  const reviewCount = new Map<string, number>();
  for (const r of reviewed) reviewCount.set(r.store_id, (reviewCount.get(r.store_id) ?? 0) + 1);
  for (const s of stores) {
    if (storeIsStub({ ...s, reviews: reviewCount.get(s.id) ?? 0 })) continue;
    out.push(entry(`/stores/${s.slug}`, 0.7, "monthly", when(s.updated_at)));
  }

  // City and state pages: what people actually search ("aquarium store sacramento").
  out.push(entry("/aquarium-stores", 0.9, "weekly"));
  const cities = groupCities(placeStores);
  const placeStates = new Set<string>();
  for (const c of cities.values()) {
    placeStates.add(c.state);
    if (cityWorthIndexing(c, placeStores, milesBetween)) out.push(entry(cityPath(c.state, c.name), 0.8, "weekly"));
  }
  for (const st of placeStates) out.push(entry(`/aquarium-stores/${st.toLowerCase()}`, 0.8, "weekly"));

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
  for (const s of species) out.push(entry(`/species/${s.slug}`, 0.7, "monthly", when(s.created_at)));
  for (const t of terms) out.push(entry(`/glossary/${t.slug}`, 0.5, "monthly"));
  for (const c of courses) out.push(entry(`/courses/${c.slug}`, 0.7, "monthly"));
  // Upcoming and running events only; past ones drop out of the calendar.
  const yesterday = Date.now() - 24 * 60 * 60 * 1000;
  for (const e of events) {
    const end = e.ends_at ?? e.starts_at;
    if (end && new Date(end).getTime() < yesterday) continue;
    out.push(entry(`/events/${e.slug}`, 0.6, "weekly"));
  }

  // Breeding videos: each has its own watch page, listed with Google's
  // video details so it can show in video results.
  const { data: vids } = await supabasePublic
    .from("species_videos")
    .select("id, stage, caption, poster_url, video_url, duration_s, reviewed_at, species(slug, common_name)")
    .eq("status", "approved")
    .range(0, 4999);
  for (const v of (vids ?? []) as unknown as {
    id: string;
    stage: string;
    caption: string | null;
    poster_url: string | null;
    video_url: string | null;
    duration_s: number | null;
    reviewed_at: string | null;
    species: { slug: string; common_name: string } | null;
  }[]) {
    if (!v.species || !v.poster_url || !v.video_url) continue;
    const title = `${v.species.common_name} ${v.stage} video`;
    out.push({
      ...entry(`/species/${v.species.slug}/video/${v.id}`, 0.6, "monthly", when(v.reviewed_at)),
      videos: [
        {
          title,
          thumbnail_loc: v.poster_url,
          description: v.caption || `${v.species.common_name} ${v.stage} filmed in a member's home aquarium.`,
          content_loc: v.video_url,
          duration: v.duration_s ? Math.max(1, Math.round(Number(v.duration_s))) : undefined,
          publication_date: v.reviewed_at ?? undefined,
          family_friendly: "yes",
        },
      ],
    });
  }

  // One guide page per species, however many logs feed it.
  const guideSlugs = new Set<string>();
  for (const g of breedingGuides) {
    if (g.species_slug) guideSlugs.add(g.species_slug);
  }
  for (const slug of guideSlugs) out.push(entry(`/breeding/${slug}`, 0.7, "monthly"));

  // ---- Forums: mirror the pages' own indexing rules -------------------
  const catSlugById = new Map(forumCats.map((c) => [c.id, c.slug]));
  const opLength = new Map<string, number>();
  for (const p of opPosts) opLength.set(p.thread_id, plainText(p.body).length);
  const indexable = forumThreads.filter((t) =>
    threadIndexable({ is_seeded: t.is_seeded, reply_count: t.reply_count, opLength: opLength.get(t.id) ?? 0 })
  );
  const countByCat = new Map<string, number>();
  for (const t of forumThreads) countByCat.set(t.category_id, (countByCat.get(t.category_id) ?? 0) + 1);

  for (const c of forumCats) {
    if ((countByCat.get(c.id) ?? 0) >= 3) out.push(entry(`/forums/${c.slug}`, 0.6, "daily"));
  }
  for (const t of indexable) {
    const cat = catSlugById.get(t.category_id);
    if (cat) out.push(entry(`/forums/${cat}/${t.slug}`, 0.6, "weekly", when(t.last_activity_at)));
  }

  // The Society's own join page, which is a sales page and should rank.
  for (const c of clubs) out.push(entry(`/c/${c.slug}`, 0.7, "weekly"));

  // ---- Feed posts with something to say ------------------------------
  for (const p of posts) out.push(entry(`/feed/${p.id}`, 0.5, "monthly", when(p.created_at)));

  // ---- Members' own pages -------------------------------------------
  for (const t of tanks) out.push(entry(`/tanks/${t.id}`, 0.5, "monthly", when(t.updated_at)));
  // Only profiles with something on them, the same rule the profile page uses.
  const active = new Set<string>();
  for (const t of tanks) active.add(t.user_id);
  for (const l of listings) active.add(l.user_id);
  for (const t of forumThreads) if (t.author_id) active.add(t.author_id);
  for (const p of profiles) {
    if (!p.username) continue;
    if (active.has(p.id) || (p.bio ?? "").trim().length >= 40) out.push(entry(`/u/${p.username}`, 0.4, "weekly"));
  }

  // One URL each, whatever happened above.
  const seen = new Set<string>();
  return out.filter((e) => (seen.has(e.url) ? false : (seen.add(e.url), true)));
}
