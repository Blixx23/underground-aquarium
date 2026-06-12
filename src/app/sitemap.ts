import type { MetadataRoute } from "next";

const baseUrl = "https://www.undergroundaquarium.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "",            // homepage
    "/marketplace",
    "/sell",
    "/vendor-guide",
    "/glossary",
    "/blog",
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: route === "" ? 1 : 0.7,
  }));
}