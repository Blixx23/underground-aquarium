import Link from "next/link";
import {
  Fish,
  Wrench,
  FlaskConical,
  BookOpen,
  MessagesSquare,
  Users,
  CalendarDays,
  Store,
  Library,
  GraduationCap,
  ArrowRight,
} from "lucide-react";

type Tool = {
  href: string;
  label: string;
  desc: string;
  Icon: typeof Fish;
  /** The two headline tools get a wider tile. */
  wide?: boolean;
};

const TOOLS: Tool[] = [
  {
    href: "/marketplace",
    label: "Classifieds",
    desc: "Fish, coral, plants, tanks and gear from keepers in your own metro area. Free to post, free to browse, no cut taken.",
    Icon: Fish,
    wide: true,
  },
  {
    href: "/tank-builder",
    label: "Tank Builder",
    desc: "Plan a stocking list and catch aggression, bioload and size problems before you buy the fish, not after.",
    Icon: Wrench,
    wide: true,
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
    href: "/forums",
    label: "Forums",
    desc: "Ask anything. Get answers from people who've killed the same fish you're about to.",
    Icon: MessagesSquare,
  },
  {
    href: "/clubs",
    label: "Clubs",
    desc: "Find your local aquarium society, or start one and run it here.",
    Icon: Users,
  },
  {
    href: "/events",
    label: "Events",
    desc: "Swaps, auctions, club nights and expos happening near you.",
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
];

export default function ToolGrid() {
  return (
    <section className="relative py-24 bg-ocean-950">
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ocean-900/20 to-transparent pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-6">
        <div className="mb-12">
          <p className="text-xs font-mono tracking-[0.25em] text-ocean-500 uppercase mb-4">
            Everything here is free
          </p>
          <h2 className="font-display text-4xl md:text-5xl text-white">
            Pick your <span className="text-ocean-300">weapon</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className={`group relative flex flex-col rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-6 transition-all duration-300 hover:-translate-y-1 hover:border-ocean-500/70 hover:bg-ocean-800/40 hover:shadow-2xl hover:shadow-ocean-950/60 ${
                t.wide ? "lg:col-span-3 lg:flex-row lg:items-center lg:gap-6" : ""
              }`}
            >
              <div
                className={`inline-flex w-12 h-12 shrink-0 items-center justify-center rounded-xl bg-ocean-800/60 border border-ocean-700/50 group-hover:border-ocean-500/60 transition-colors ${
                  t.wide ? "mb-4 lg:mb-0" : "mb-4"
                }`}
              >
                <t.Icon className="w-5 h-5 text-ocean-300 group-hover:text-ocean-200 transition-colors" />
              </div>

              <div className="min-w-0 flex-1">
                <h3 className="font-display text-xl text-white mb-2 group-hover:text-ocean-100 transition-colors">
                  {t.label}
                </h3>
                <p className="text-ocean-400 leading-relaxed">{t.desc}</p>
              </div>

              <ArrowRight
                className={`w-4 h-4 text-ocean-600 group-hover:text-ocean-300 group-hover:translate-x-1 transition-all ${
                  t.wide ? "mt-4 lg:mt-0 lg:ml-4" : "mt-4"
                }`}
              />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
