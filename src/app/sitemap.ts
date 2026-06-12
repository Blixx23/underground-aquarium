import type { MetadataRoute } from "next";

const baseUrl = "https://www.undergroundaquarium.com";

export default function sitemap(): MetadataRoute.Sitemap {
  // Add a route here as each page goes live. Don't list empty/placeholder
  // pages — thin pages can hurt more than help.
  const routes = [
    "",            // homepage
    "/marketplace",
    "/sell",
    "/vendor-guide",
    "/blog",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));
}