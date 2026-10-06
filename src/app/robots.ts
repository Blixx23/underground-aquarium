import type { MetadataRoute } from "next";

/**
 * Anything behind a sign-in, anything that only makes sense to one person,
 * and anything that would burn crawl budget on pages that can't rank.
 */
// Bots that collect pages to train AI models. They get nothing: our content
// is only for training under a written license (see the Terms, "Scraping and
// AI"). None of these affect search ranking. AI *search* bots (OAI-SearchBot,
// ChatGPT-User, Claude-SearchBot, Claude-User, PerplexityBot, Perplexity-User)
// are deliberately not listed: they quote and link our pages in answers.
const AI_TRAINING_BOTS = [
  "GPTBot", // OpenAI
  "ClaudeBot", // Anthropic
  "anthropic-ai", // Anthropic, older name
  "CCBot", // Common Crawl, the dataset many AI companies train on
  "Google-Extended", // Gemini training; not Google Search or AI Overviews
  "Applebot-Extended", // Apple model training; Siri and Spotlight's Applebot stays allowed
  "meta-externalagent", // Meta
  "FacebookBot", // Meta's older training crawler, not link previews (those are facebookexternalhit)
  "Bytespider", // ByteDance / TikTok
  "Amazonbot", // Amazon
  "cohere-ai", // Cohere
  "Diffbot", // sells crawled data
  "omgili", // Webz.io, sells crawled data
  "Timpibot", // Timpi
  "img2dataset", // bulk image downloads for training sets
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: AI_TRAINING_BOTS, disallow: "/" },
      {
      userAgent: "*",
      // Share pictures live under /api/, and X and Facebook won't fetch a
      // picture robots.txt blocks, so these stay open.
      allow: ["/", "/api/share-card", "/api/*/share-image", "/api/stores/*/share-image", "/api/species/*/share-image", "/api/breeding/certificate/"],
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
    ],
    sitemap: "https://www.undergroundaquarium.com/sitemap.xml",
    host: "https://www.undergroundaquarium.com",
  };
}
