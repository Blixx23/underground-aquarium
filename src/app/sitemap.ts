import type { MetadataRoute } from "next";
import { supabasePublic } from "@/lib/supabase/public";

const baseUrl = "https://www.undergroundaquarium.com";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = ["", "/marketplace", "/sell", "/vendor-guide", "/glossary", "/blog"];

  const { data: terms } = await supabasePublic
    .from("glossary_terms")
    .select("slug");

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

  return [...staticEntries, ...termEntries];
}