/** @type {import('next').NextConfig} */
const nextConfig = {
  // Old WordPress addresses Google still crawls. Species links (/fish/...)
  // are matched to the right species in src/app/fish/[slug]/route.ts.
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
