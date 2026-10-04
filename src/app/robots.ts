import type { MetadataRoute } from "next";

/**
 * Anything behind a sign-in, anything that only makes sense to one person,
 * and anything that would burn crawl budget on pages that can't rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      // Share pictures live under /api/, and X and Facebook won't fetch a
      // picture robots.txt blocks, so these stay open.
      allow: ["/", "/api/share-card", "/api/*/share-image", "/api/stores/*/share-image", "/api/species/*/share-image"],
      disallow: [
        "/api/",
        "/admin",
        "/auth/",
        "/account",
        "/profile",
        "/my/",
        "/messages",
        "/notifications",
        "/trophies",
        "/join/",
        "/login",
        "/register",
        "/forgot-password",
        "/society/", // members' area; /society itself stays crawlable
        "/c/*/admin",
        "/c/*/awards",
        "/c/*/events",
        "/forums/search",
        "/forums/*/new$", // the "new post" form only; "$" so threads whose slug starts with "new" stay crawlable
        "/forums/new$",
        "/listing/*/edit$",
        "/listings/",
        "/events/submit",
        "/*?*edit=", // edit views of otherwise public pages
      ],
    },
    sitemap: "https://www.undergroundaquarium.com/sitemap.xml",
    host: "https://www.undergroundaquarium.com",
  };
}
