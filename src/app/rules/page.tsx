import type { Metadata } from "next";
import Link from "next/link";
import { Ban, Check, Flag } from "lucide-react";

export const metadata: Metadata = {
  title: "Listing rules",
  description:
    "What you can and can't list on Underground Aquarium classifieds, including protected, endangered and state-restricted species.",
};

const NOT_ALLOWED: { title: string; body: string }[] = [
  {
    title: "Endangered or protected species",
    body: "Anything listed under the U.S. Endangered Species Act, or on CITES Appendix I. Appendix II species (many corals, some fish) only with the paperwork the law requires, and only if you can show it on request.",
  },
  {
    title: "Species that are illegal where you or the buyer live",
    body: "Federally injurious species (for example snakeheads and invasive carp) and anything your state bans or restricts. California, for example, restricts piranhas, snakeheads and every Caulerpa species. Check your state wildlife or agriculture agency if you're unsure.",
  },
  {
    title: "Wild-collected animals or plants from local waters",
    body: "Don't sell what you took from a creek, lake or the ocean unless you hold the licence that allows it.",
  },
  {
    title: "Getting around the rules",
    body: "No restricted species as a \"free gift\" with another item, hidden in a bundle, or described in code words.",
  },
  {
    title: "Sick, dying or mistreated animals",
    body: "No livestock you know is sick, diseased or unfit to ship. Say so plainly if something is being treated.",
  },
  {
    title: "Prescription drugs and banned chemicals",
    body: "Prescription-only medications, and anything illegal to sell to the public.",
  },
  {
    title: "Anything misleading or unrelated",
    body: "Wrong species names, stolen photos, fake prices, and anything that isn't for the aquarium hobby.",
  },
];

const ALLOWED = [
  "Freshwater and saltwater fish, shrimp, snails and other inverts that are legal where you live",
  "Captive-bred or aquacultured coral, frags and colonies (with paperwork where it's required)",
  "Aquatic plants, mosses and algae that aren't restricted in your state",
  "Tanks, stands, filters, lights, equipment, food, decor and DIY builds",
  "Wanted ads and free rehoming",
];

export default function RulesPage() {
  return (
    <main className="min-h-screen px-4 pt-24 pb-20 sm:px-6">
      <div className="mx-auto max-w-2xl">
        <p className="mb-2 text-sm font-medium uppercase tracking-wider text-emerald-400">Classifieds</p>
        <h1 className="mb-3 font-display text-3xl text-white sm:text-4xl">Listing rules</h1>
        <p className="mb-10 text-ocean-300">
          Keep it legal and keep it honest. Listings that break these rules are removed, and repeat
          offenders lose their account.
        </p>

        <h2 className="mb-4 font-display text-2xl text-white">Not allowed</h2>
        <div className="mb-10 space-y-3">
          {NOT_ALLOWED.map((r) => (
            <div key={r.title} className="flex gap-3 rounded-xl border border-coral-500/25 bg-coral-500/[0.05] p-4">
              <Ban className="mt-0.5 h-5 w-5 shrink-0 text-coral-300" />
              <div>
                <p className="font-medium text-white">{r.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-ocean-300">{r.body}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-4 font-display text-2xl text-white">Welcome here</h2>
        <ul className="mb-10 space-y-2">
          {ALLOWED.map((a) => (
            <li key={a} className="flex gap-3 text-ocean-200">
              <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-400" />
              {a}
            </li>
          ))}
        </ul>

        <h2 className="mb-4 font-display text-2xl text-white">Your responsibility</h2>
        <div className="mb-10 space-y-3 leading-relaxed text-ocean-300">
          <p>
            Wildlife law differs by state, and sometimes by county. By posting you confirm you may
            legally keep, sell and transfer what you list, and that you hold any permit it needs. Buyers
            are responsible for the rules where they live.
          </p>
          <p>
            Shipping live animals has its own carrier rules. Check them before you ship.
          </p>
          <p>Never release aquarium animals or plants into the wild. Rehome them instead.</p>
        </div>

        <div className="flex gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
          <Flag className="mt-0.5 h-5 w-5 shrink-0 text-ocean-300" />
          <p className="text-sm leading-relaxed text-ocean-300">
            See something that breaks these rules? Use <span className="text-white">Report</span> on the
            listing and we&apos;ll review it. Don&apos;t want to hear from someone again? Block them from
            their profile. Full details are in our{" "}
            <Link href="/terms" className="text-ocean-100 underline">
              Terms of Service
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
