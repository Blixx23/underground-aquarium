import type { MetadataRoute } from "next";

/**
 * Anything behind a sign-in, anything that only makes sense to one person,
 * and anything that would burn crawl budget on pages that can't rank.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
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
        "/forums/*/new",
        "/listing/*/edit",
        "/listings/",
        "/events/submit",
        "/*?*edit=", // edit views of otherwise public pages
      ],
    },
    sitemap: "https://www.undergroundaquarium.com/sitemap.xml",
    host: "https://www.undergroundaquarium.com",
  };
}
