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
    "/clubs",
    "/clubs/discover",
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

  const { data: clubs } = await supabasePublic
    .from("clubs")
    .select("slug")
    .eq("is_public", true);

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

  return [
    ...staticEntries,
    ...termEntries,
    ...speciesEntries,
    ...storeEntries,
    ...clubEntries,
  ];
}
