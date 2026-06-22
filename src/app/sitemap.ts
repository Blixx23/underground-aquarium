import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase/public";

const baseUrl = "https://www.undergroundaquarium.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/marketplace",
    "/sell",
    "/vendor-guide",
    "/glossary",
    "/species",
    "/tank-builder",
    "/water-check",
    "/stores",
    "/blog",
    "/events",
    "/community",
    "/about",
    "/courses",
    "/clubs",
    "/clubs/start",
    "/clubs/discover",
    "/forums",
  ];

  const { data: terms } = await supabasePublic
    .from("glossary_terms")
    .select("slug");

  const { data: species } = await supabasePublic
    .from("species")
    .select("slug");

  const { data: stores } = await supabasePublic
    .from("fish_stores")
    .select("slug")
    .eq("status", "published");

  // Only approved, public clubs — reads the same view the Discover page uses.
  const { data: clubs } = await supabasePublic
    .from("public_club_directory")
    .select("slug");

  // Published events. Past events still have live, indexable pages, so we
  // include everything published rather than only upcoming ones.
  const { data: events } = await supabasePublic
    .from("events")
    .select("slug")
    .eq("status", "published");

  // Active marketplace listings. Mirror the product page's own filters
  // (active, and not a live animal) so we never list a URL that would 404.
  const { data: products } = await supabasePublic
    .from("products")
    .select("slug")
    .eq("is_active", true)
    .not("is_live_animal", "is", true);

  // Published courses — each has a public landing page.
  const { data: courses } = await supabasePublic
    .from("courses")
    .select("slug")
    .eq("is_published", true);

  // Forum categories + threads. Mirror the pages' own index rules so the
  // sitemap only lists URLs we allow to be indexed: a thread is indexable if
  // it's seeded or has at least one reply; a category page is indexable once
  // it holds 3+ such threads. (RLS already hides hidden threads.)
  const { data: forumCats } = await supabasePublic
    .from("forum_categories")
    .select("id, slug")
    .eq("is_public", true);

  const { data: forumThreads } = await supabasePublic
    .from("forum_threads")
    .select("slug, category_id, is_seeded, reply_count");

  const catSlugById = new Map<string, string>();
  for (const c of forumCats ?? []) {
    catSlugById.set(c.id as string, c.slug as string);
  }

  const indexableThreads = (forumThreads ?? []).filter(
    (t) => t.is_seeded || (t.reply_count as number) >= 1
  );

  const indexableCountByCat = new Map<string, number>();
  for (const t of indexableThreads) {
    const k = t.category_id as string;
    indexableCountByCat.set(k, (indexableCountByCat.get(k) ?? 0) + 1);
  }

  const staticEntries = staticRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));

  const termEntries = (terms ?? []).map((t) => ({
    url: `${baseUrl}/glossary/${t.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  const speciesEntries = (species ?? []).map((s) => ({
    url: `${baseUrl}/species/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const storeEntries = (stores ?? []).map((s) => ({
    url: `${baseUrl}/stores/${s.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  const clubEntries = (clubs ?? []).map((c) => ({
    url: `${baseUrl}/c/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const eventEntries = (events ?? []).map((e) => ({
    url: `${baseUrl}/events/${e.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const productEntries = (products ?? []).map((p) => ({
    url: `${baseUrl}/marketplace/${p.slug}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  const courseEntries = (courses ?? []).map((c) => ({
    url: `${baseUrl}/courses/${c.slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.7,
  }));

  const forumCategoryEntries = (forumCats ?? [])
    .filter((c) => (indexableCountByCat.get(c.id as string) ?? 0) >= 3)
    .map((c) => ({
      url: `${baseUrl}/forums/${c.slug}`,
      lastModified: new Date(),
      changeFrequency: "daily" as const,
      priority: 0.6,
    }));

  const forumThreadEntries = indexableThreads
    .map((t) => {
      const catSlug = catSlugById.get(t.category_id as string);
      if (!catSlug) return null;
      return {
        url: `${baseUrl}/forums/${catSlug}/${t.slug}`,
        lastModified: new Date(),
        changeFrequency: "weekly" as const,
        priority: 0.6,
      };
    })
    .filter((e): e is NonNullable<typeof e> => e !== null);

  return [
    ...staticEntries,
    ...termEntries,
    ...speciesEntries,
    ...storeEntries,
    ...clubEntries,
    ...eventEntries,
    ...productEntries,
    ...courseEntries,
    ...forumCategoryEntries,
    ...forumThreadEntries,
  ];
}
