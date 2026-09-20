import type { Metadata } from "next";
import Link from "next/link";
import { Tag, Store, BookOpen, Newspaper, Wrench, Trophy, MessagesSquare } from "lucide-react";
import SocietySeal from "@/components/society/SocietySeal";
import { SOCIETY_PATH } from "@/lib/config";

export const metadata: Metadata = {
  title: "About",
  description:
    "Underground Aquarium is free classifieds, a care library, forums and a feed for aquarium hobbyists, a directory of real local fish stores, and home of the Underground Aquarium Society.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen pt-24 pb-20 px-6">
      <div className="max-w-2xl mx-auto">
        <p className="text-emerald-400 text-sm font-medium uppercase tracking-wider mb-2">
          About
        </p>
        <h1 className="font-display text-3xl sm:text-4xl text-white mb-6">
          Built by hobbyists, for hobbyists
        </h1>

        <div className="space-y-5 text-ocean-200 leading-relaxed">
          <p>
            Underground Aquarium started with a simple frustration: the
            information hobbyists actually need is scattered across forums,
            outdated care sheets, and word of mouth — and the best local fish
            stores are nearly impossible to find unless someone tips you off.
          </p>
          <p>
            So we set out to pull it all into one place. Free classifieds to buy
            and sell with other keepers, a care library you can trust, forums
            and a feed to share what you&apos;re keeping, tools to plan a tank
            before you spend a dime, and a directory that points you to real
            independent shops worth driving to.
          </p>
        </div>

        <h2 className="font-display text-2xl text-emerald-400 mt-12 mb-5">
          What you can do here
        </h2>

        <div className="space-y-3">
          <Link
            href="/marketplace"
            className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
          >
            <Tag className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-white font-medium">Classifieds</span>
              <span className="block text-ocean-300 text-sm">
                Buy and sell fish, plants and gear with other hobbyists, by state
                or nationwide. Free to post.
              </span>
            </span>
          </Link>

          <Link
            href="/species"
            className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
          >
            <BookOpen className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-white font-medium">
                Care library
              </span>
              <span className="block text-ocean-300 text-sm">
                Honest care profiles for hundreds of species, plus a glossary of
                the terms every keeper runs into.
              </span>
            </span>
          </Link>

          <Link
            href="/tank-builder"
            className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
          >
            <Wrench className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-white font-medium">Tank Builder</span>
              <span className="block text-ocean-300 text-sm">
                Plan a stocking list and catch compatibility problems before you
                buy.
              </span>
            </span>
          </Link>

          <Link
            href="/feed"
            className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
          >
            <Newspaper className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-white font-medium">The Feed</span>
              <span className="block text-ocean-300 text-sm">
                Post photos, share your tanks and follow what other keepers are
                building.
              </span>
            </span>
          </Link>

          <Link
            href="/forums"
            className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
          >
            <MessagesSquare className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-white font-medium">Forums</span>
              <span className="block text-ocean-300 text-sm">
                Ask questions, trade notes and get help from people who have
                kept it before.
              </span>
            </span>
          </Link>

          <Link
            href="/trophies"
            className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
          >
            <Trophy className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-white font-medium">Trophies</span>
              <span className="block text-ocean-300 text-sm">
                Earn trophies for posting, helping, sharing tanks and bringing
                friends. They show on your public profile.
              </span>
            </span>
          </Link>

          <Link
            href="/stores"
            className="flex items-start gap-3 rounded-xl bg-white/5 border border-white/10 p-4 hover:border-emerald-500/40 hover:bg-white/10 transition-colors"
          >
            <Store className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
            <span>
              <span className="block text-white font-medium">
                Local fish store finder
              </span>
              <span className="block text-ocean-300 text-sm">
                Find real independent shops near you, sorted by distance, with
                reviews and updates straight from the owners.
              </span>
            </span>
          </Link>
        </div>

        <h2 className="font-display text-2xl text-amber-300 mt-12 mb-5">
          The Underground Aquarium Society
        </h2>
        <Link
          href={SOCIETY_PATH}
          className="flex items-start gap-4 rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/[0.10] to-transparent p-5 transition-colors hover:border-amber-400/60"
        >
          <SocietySeal size={56} className="h-14 w-14 shrink-0" />
          <span className="text-amber-100/75 leading-relaxed">
            Our membership club for serious keepers. Members log spawns, have
            them peer reviewed and judged in the Breeder Award Program, earn
            signed certificates anyone can check on the{" "}
            <span className="text-amber-200">Certificate Registry</span>, and
            collect Society trophies. Everything else on the site stays free.
          </span>
        </Link>

        <h2 className="font-display text-2xl text-emerald-400 mt-12 mb-5">
          Rooting for local shops
        </h2>
        <div className="space-y-5 text-ocean-200 leading-relaxed">
          <p>
            Independent fish stores are the backbone of this hobby — they keep
            healthy stock, share hard-won advice, and build the local community
            that big-box chains can&apos;t. Our store directory is free for
            shops to claim, update, and respond to reviews, because the more
            people who walk through their doors, the better off the whole hobby
            is.
          </p>
          <p>
            We&apos;re just getting started, and we&apos;re building this in the
            open with the community. If you have feedback or run a shop that
            should be listed, we want to hear from you.
          </p>
        </div>
      </div>
    </main>
  );
}