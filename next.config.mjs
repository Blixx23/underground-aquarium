/** @type {import('next').NextConfig} */
const nextConfig = {
  // Video conversion runs the ffmpeg binary from ffmpeg-static. Keep the
  // package out of the bundle and ship the binary with the two routes
  // that use it.
  serverExternalPackages: ["ffmpeg-static"],
  // Search engine and link-preview bots get the whole page in one piece,
  // <head> included, instead of streamed. Googlebot isn't on Next's default
  // list; adding it means titles, canonicals and robots tags are always in
  // the <head> where every crawler expects them.
  htmlLimitedBots:
    /Googlebot|Google-InspectionTool|Storebot-Google|GoogleOther|Mediapartners-Google|AdsBot-Google|bingbot|BingPreview|Slurp|DuckDuckBot|Baiduspider|YandexBot|Applebot|facebookexternalhit|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|redditbot|ia_archiver|GPTBot|ClaudeBot|PerplexityBot/i,
  outputFileTracingIncludes: {
    "/api/species-videos/process": ["./node_modules/ffmpeg-static/ffmpeg"],
    "/api/admin/species-videos": ["./node_modules/ffmpeg-static/ffmpeg"],
    // Help Center markdown, read from disk by these routes.
    "/help": ["./content/help/**"],
    "/help/[slug]": ["./content/help/**"],
    "/help/search-index.json": ["./content/help/**"],
    "/sitemap.xml": ["./content/help/**"],
  },
  // Old WordPress addresses Google still crawls. Species links (/fish/...)
  // are matched in src/app/fish/[slug]/route.ts, events in
  // src/app/event/[slug]/route.ts, and old top-level posts in src/app/[legacy].
  async redirects() {
    return [
      { source: "/fish-species", destination: "/species", permanent: true },
      { source: "/fish", destination: "/species", permanent: true },
      { source: "/browse-stores", destination: "/stores", permanent: true },
      { source: "/category/events", destination: "/events", permanent: true },
      { source: "/category/:path*", destination: "/forums", permanent: true },
      { source: "/events/category/:path*", destination: "/events", permanent: true },
      { source: "/event-submission", destination: "/events/submit", permanent: true },
      { source: "/bristlenose-pleco-vs-common-pleco", destination: "/species/bristlenose-pleco", permanent: true },
      { source: "/we-just-launched-our-events-feature:rest(.*)", destination: "/events", permanent: true },
      { source: "/blog", destination: "/forums", permanent: true },
      { source: "/blog/:path*", destination: "/forums", permanent: true },
      // The old forum hub and the old events calendar.
      { source: "/community", destination: "/forums", permanent: true },
      { source: "/community/:path*", destination: "/forums", permanent: true },
      { source: "/event", destination: "/events", permanent: true },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};
export default nextConfig;
