import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private / transactional pages crawlers shouldn't index.
      // Adjust this list to match your real routes.
      disallow: ["/api/", "/orders", "/sell/sales", "/checkout/"],
    },
    sitemap: "https://www.undergroundaquarium.com/sitemap.xml",
  };
}