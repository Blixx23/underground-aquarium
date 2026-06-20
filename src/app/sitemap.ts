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
    "/clubs",
    "/clubs/start",
    "/clubs/discover",
    "/breeding",
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

  // Public breeding guides — one page per species that has approved, shared reports.
  const { data: guides } = await supabasePublic
    .from("public_breeding_guides")
    .select("species_slug");

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

  const guideSlugs = Array.from(
    new Set((guides ?? []).map((g) => g.species_slug as string))
  );
  const breedingEntries = guideSlugs.map((slug) => ({
    url: `${baseUrl}/breeding/${slug}`,
    lastModified: new Date(),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));

  return [
    ...staticEntries,
    ...termEntries,
    ...speciesEntries,
    ...storeEntries,
    ...clubEntries,
    ...eventEntries,
    ...productEntries,
    ...breedingEntries,
  ];
}
