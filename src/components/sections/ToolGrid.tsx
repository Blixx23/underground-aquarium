import Link from "next/link";
import {
  Fish,
  Wrench,
  FlaskConical,
  BookOpen,
  MessagesSquare,
  CalendarDays,
  Store,
  Library,
  GraduationCap,
  ArrowRight,
  Newspaper,
  Trophy,
} from "lucide-react";

type Tool = {
  href: string;
  label: string;
  desc: string;
  Icon: typeof Fish;
  /** Headline tools get a full-width tile. */
  wide?: boolean;
  /** Lifts one tile out of the grid without taking it out of the palette. */
  highlight?: boolean;
};

const TOOLS: Tool[] = [
  {
    href: "/marketplace",
    label: "Classifieds",
    desc: "Fish, coral, plants, tanks and gear from keepers in your metro area. Free to post, free to browse.",
    Icon: Fish,
    wide: true,
  },
  {
    href: "/forums",
    label: "Forums",
    desc: "Ask anything. Get answers from people who've killed the same fish you're about to — usually within the hour.",
    Icon: MessagesSquare,
    wide: true,
    highlight: true,
  },
  {
    href: "/feed",
    label: "The Feed",
    desc: "Spawns, new tanks, fresh listings and what everyone's working on, as it happens.",
    Icon: Newspaper,
  },
  {
    href: "/tank-builder",
    label: "Tank Builder",
    desc: "Catch aggression, bioload and size problems before you buy the fish, not after.",
    Icon: Wrench,
  },
  {
    href: "/water-check",
    label: "Water Check",
    desc: "Log your parameters and get a straight answer about what's wrong.",
    Icon: FlaskConical,
  },
  {
    href: "/species",
    label: "Species Library",
    desc: "Honest care profiles: real adult size, real temperament, real tank minimums.",
    Icon: BookOpen,
  },
  {
    href: "/events",
    label: "Events",
    desc: "Swaps, auctions, meetups and expos happening near you.",
    Icon: CalendarDays,
  },
  {
    href: "/stores",
    label: "Fish Stores",
    desc: "Independent shops worth the drive, with reviews from actual hobbyists.",
    Icon: Store,
  },
  {
    href: "/glossary",
    label: "Glossary",
    desc: "Every term the hobby throws at you, explained without jargon.",
    Icon: Library,
  },
  {
    href: "/courses",
    label: "Courses",
    desc: "Learn the fundamentals properly, from cycling to breeding.",
    Icon: GraduationCap,
  },
  {
    href: "/trophies",
    label: "Trophies",
    desc: "140 of them, earned for everything you do here. They show on your profile.",
    Icon: Trophy,
  },
];

export default function ToolGrid() {
  return (
    <section className="relative py-16 sm:py-24 bg-ocean-950">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ocean-900/20 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="mb-8 sm:mb-12">
          <p className="text-xs font-mono tracking-[0.25em] text-ocean-500 uppercase mb-4">
            Everything here is free
          </p>
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl text-white">
            Pick your <span className="text-ocean-300">weapon</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`group relative flex flex-col rounded-2xl border p-4 sm:p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-2xl ${
                t.highlight
                  ? "border-sky-500/40 bg-gradient-to-br from-sky-500/[0.10] to-transparent hover:border-sky-400/70 hover:shadow-sky-950/60"
                  : "border-ocean-800/60 bg-ocean-900/40 hover:border-ocean-500/70 hover:bg-ocean-800/40 hover:shadow-ocean-950/60"
              } ${
                t.wide
                  ? "col-span-2 lg:col-span-3 sm:flex-row sm:items-center sm:gap-5"
                  : ""
              }`}
            >
              <div
                className={`inline-flex w-10 h-10 sm:w-12 sm:h-12 shrink-0 items-center justify-center rounded-xl border transition-colors ${
                  t.highlight
                    ? "bg-sky-500/10 border-sky-500/40 group-hover:border-sky-400/70"
                    : "bg-ocean-800/60 border-ocean-700/50 group-hover:border-ocean-500/60"
                } ${t.wide ? "mb-3 sm:mb-0" : "mb-3 sm:mb-4"}`}
              >
                <t.Icon
                  className={`w-5 h-5 transition-colors ${
                    t.highlight
                      ? "text-sky-300"
                      : "text-ocean-300 group-hover:text-ocean-200"
                  }`}
                />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-base sm:text-xl text-white mb-1.5 sm:mb-2 group-hover:text-ocean-100 transition-colors">
                  {t.label}
                </h3>
                <p
                  className={`text-sm sm:text-base leading-snug sm:leading-relaxed line-clamp-3 sm:line-clamp-none ${
                    t.highlight ? "text-sky-100/60" : "text-ocean-400"
                  }`}
                >
                  {t.desc}
                </p>
              </div>

              <ArrowRight
                className={`hidden sm:block w-4 h-4 group-hover:translate-x-1 transition-all ${
                  t.highlight
                    ? "text-sky-500/70 group-hover:text-sky-300"
                    : "text-ocean-600 group-hover:text-ocean-300"
                } ${t.wide ? "mt-4 sm:mt-0 sm:ml-4" : "mt-4"}`}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
