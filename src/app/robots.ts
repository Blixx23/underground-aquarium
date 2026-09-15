import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private pages crawlers shouldn't index.
      disallow: ["/api/", "/messages", "/my/", "/account", "/profile"],
    },
    sitemap: "https://www.undergroundaquarium.com/sitemap.xml",
  };
}
