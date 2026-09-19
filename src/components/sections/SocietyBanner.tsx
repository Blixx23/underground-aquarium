import Link from "next/link";
import { ArrowRight, Trophy, Sprout, CalendarDays } from "lucide-react";
import { SOCIETY_PATH, SOCIETY_CLUB_PATH } from "@/lib/config";
import SocietySeal from "@/components/society/SocietySeal";

/**
 * The Society's pitch on the homepage.
 *
 * Deliberately not a tile in the grid. The grid is the free half of the
 * site and it's all one blue material; this band is near-black with a
 * brass edge, so it reads as a different thing on a different footing —
 * which is the whole point, because it's the one thing you pay for.
 */
export default function SocietyBanner({
  memberCount,
  duesCents,
}: {
  memberCount: number;
  /** Lowest tier, for the "from $X" line. Zero hides it. */
  duesCents: number;
}) {
  const dues = duesCents > 0 ? `$${(duesCents / 100).toFixed(0)}` : null;

  return (
    <section className="relative overflow-hidden">
      {/* Brass hairlines top and bottom, so the band is framed rather than floating. */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/45 to-transparent" />

      {/* Near-black plate. Darker than the page, so gold has something to sit on. */}
      <div className="relative bg-[#04060a]">
        <div
          className="pointer-events-none absolute right-0 top-1/2 h-[560px] w-[760px] max-w-full -translate-y-1/2 translate-x-1/4"
          style={{
            background:
              "radial-gradient(ellipse, rgba(217,160,60,0.16) 0%, transparent 70%)",
          }}
        />
        {/* Faint brass rule pattern — the texture of a certificate border. */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(135deg, rgba(252,211,77,0.9) 0px, rgba(252,211,77,0.9) 1px, transparent 1px, transparent 9px)",
          }}
        />

        <div className="relative mx-auto max-w-7xl px-6 py-16 sm:py-24">
          <div className="flex flex-col items-center gap-10 lg:flex-row lg:items-center lg:gap-16">
            {/* ---- Seal ---- */}
            <div className="relative shrink-0">
              <div
                className="pointer-events-none absolute inset-0 -z-10 blur-2xl"
                style={{
                  background:
                    "radial-gradient(circle, rgba(252,211,77,0.22) 0%, transparent 65%)",
                }}
              />
              <SocietySeal
                size={240}
                className="h-[180px] w-[180px] sm:h-[220px] sm:w-[220px] lg:h-[240px] lg:w-[240px]"
              />
            </div>

            {/* ---- Pitch ---- */}
            <div className="min-w-0 flex-1 text-center lg:text-left">
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.3em] text-amber-400/80">
                Members only · Est. 2026
              </p>

              <h2 className="font-display text-[clamp(1.7rem,4.2vw,3.1rem)] leading-[1.12] text-white">
                Anyone can keep fish.
                <br />
                <span className="bg-gradient-to-r from-amber-200 via-amber-400 to-amber-600 bg-clip-text text-transparent">
                  Members get it in writing.
                </span>
              </h2>

              <p className="mx-auto mt-5 max-w-2xl font-body text-base leading-relaxed text-amber-100/60 sm:text-lg lg:mx-0">
                The Underground Aquarium Society is one national body, no
                chapters, open to anyone who takes this seriously. Spawns get
                judged. Titles get earned. Your name goes on the roster.
              </p>

              {/* Three proofs, kept to a line each. */}
              <ul className="mt-7 flex flex-wrap justify-center gap-x-6 gap-y-3 lg:justify-start">
                {[
                  { Icon: Trophy, label: "Breeder Award Program" },
                  { Icon: Sprout, label: "Horticultural Award Program" },
                  { Icon: CalendarDays, label: "Members-first events" },
                ].map(({ Icon, label }) => (
                  <li
                    key={label}
                    className="flex items-center gap-2 text-sm text-amber-100/75"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-amber-400" />
                    {label}
                  </li>
                ))}
              </ul>

              <div className="mt-9 flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
                <Link
                  href={SOCIETY_CLUB_PATH}
                  className="group inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-amber-300 to-amber-500 px-8 font-semibold tracking-wide text-[#04060a] shadow-lg shadow-amber-500/20 transition-all duration-300 hover:from-amber-200 hover:to-amber-400 hover:shadow-xl hover:shadow-amber-400/30 sm:w-auto"
                >
                  Apply for membership
                  <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
                </Link>
                <Link
                  href={SOCIETY_PATH}
                  className="inline-flex h-[54px] w-full items-center justify-center gap-2 rounded-xl border border-amber-500/35 px-8 font-medium text-amber-200 transition-colors hover:border-amber-400/70 hover:text-amber-100 sm:w-auto"
                >
                  What you get
                </Link>
              </div>

              <p className="mt-5 font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/50">
                {dues && `Dues from ${dues}/yr`}
                {dues && memberCount > 0 && " · "}
                {memberCount > 0 &&
                  `${memberCount.toLocaleString()} member${
                    memberCount === 1 ? "" : "s"
                  }`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/45 to-transparent" />
    </section>
  );
}
