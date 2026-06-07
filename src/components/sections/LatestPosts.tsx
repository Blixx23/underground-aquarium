import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";

const posts = [
  {
    slug: "how-to-cycle-your-aquarium-without-losing-fish",
    category: "Fish Care",
    title: "How to Cycle Your Aquarium (Without Losing Fish)",
    excerpt: "The nitrogen cycle is the single most important concept in fishkeeping. Here's how to master it before adding your first fish.",
    date: "Jul 28, 2025",
    readTime: "8 min",
  },
  {
    slug: "understanding-nitrites-key-to-a-healthy-aquarium",
    category: "Fish Care",
    title: "Understanding Nitrites: Why Even Low Levels Are Dangerous",
    excerpt: "Nitrites are produced during the nitrogen cycle and are toxic to fish at any detectable level. Here's what you need to know.",
    date: "Jul 27, 2025",
    readTime: "5 min",
  },
  {
    slug: "submersible-vs-inline-aquarium-heaters",
    category: "Equipment",
    title: "Submersible vs Inline Aquarium Heaters: Which Should You Use?",
    excerpt: "Temperature stability can make or break your tank. We break down both heater types so you can choose with confidence.",
    date: "Jul 9, 2025",
    readTime: "6 min",
  },
];

const catColors: Record<string, string> = {
  "Fish Care": "text-ocean-300 bg-ocean-800/60 border-ocean-700/40",
  "Equipment": "text-brine-300 bg-brine-900/60 border-brine-700/40",
  "Beginners": "text-coral-300 bg-coral-500/10 border-coral-500/20",
};

export default function LatestPosts() {
  return (
    <section className="relative py-32 bg-ocean-950">
      <div className="max-w-7xl mx-auto px-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 mb-16">
          <div>
            <p className="text-xs font-mono tracking-[0.25em] text-ocean-500 uppercase mb-4">
              From the Blog
            </p>
            <h2 className="font-display text-4xl md:text-5xl text-white">
              Learn the{" "}
              <span className="text-ocean-300">Deep Stuff</span>
            </h2>
          </div>
          <Link
            href="/blog"
            className="group flex items-center gap-2 text-sm text-ocean-400 hover:text-ocean-200 transition-colors"
          >
            All Articles
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* Posts */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {posts.map((post, i) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}`}
              className="group block card-deep rounded-2xl overflow-hidden hover:-translate-y-1 transition-all duration-300 hover:shadow-2xl hover:shadow-ocean-900/60 border border-ocean-800/40 hover:border-ocean-600/40"
            >
              {/* Category stripe */}
              <div className="h-1 w-full bg-gradient-to-r from-ocean-600 to-brine-600" />

              <div className="p-7">
                <div className="flex items-center justify-between mb-5">
                  <span className={`text-xs font-mono px-3 py-1 rounded-full border ${catColors[post.category] || "text-ocean-300 bg-ocean-800/60 border-ocean-700/40"}`}>
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1.5 text-ocean-600 text-xs font-mono">
                    <Clock className="w-3 h-3" />
                    {post.readTime}
                  </div>
                </div>

                <h3 className="font-display text-lg text-white mb-3 group-hover:text-ocean-200 transition-colors leading-snug">
                  {post.title}
                </h3>
                <p className="text-sm text-ocean-500 leading-relaxed mb-5">
                  {post.excerpt}
                </p>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-ocean-600 font-mono">{post.date}</span>
                  <span className="text-xs text-ocean-400 group-hover:text-ocean-200 flex items-center gap-1 transition-colors">
                    Read <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
