import Link from "next/link";
import type { Metadata } from "next";
import {
  Trophy,
  Users,
  CalendarDays,
  BookOpen,
  ArrowRight,
  Check,
  ShieldCheck,
  MapPin,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  SOCIETY_NAME,
  SOCIETY_SLUG,
  SOCIETY_HOME_PATH,
} from "@/lib/config";

// The roster and dues figures change, but not by the second.
export const revalidate = 300;

export const metadata: Metadata = {
  title: `${SOCIETY_NAME} — join the national aquarium society`,
  description:
    "One aquarium society, nationwide, open to anyone who keeps fish. Breeder and plant award programs, member events, and a community that takes the hobby seriously.",
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const PERKS = [
  {
    Icon: Trophy,
    title: "Breeder & Plant Awards",
    body: "Full BAP and HAP programs, judged and logged. Spawn it, grow it, submit it, earn the points and the title that comes with them.",
  },
  {
    Icon: Users,
    title: "A national roster",
    body: "Not a regional club with twelve people who can make a Tuesday. Members in every state, all in one room.",
  },
  {
    Icon: CalendarDays,
    title: "Member events",
    body: "Swaps, auctions, talks and meetups — posted to the calendar, open to members first.",
  },
  {
    Icon: BookOpen,
    title: "The whole site",
    body: "Classifieds, Tank Builder, the species library and the forums stay free for everyone. Membership is what funds them.",
  },
];

export default async function SocietyPage() {
  const supabase = await createClient();

  const { data: society } = await supabase
    .from("clubs")
    .select(
      "id, name, description, logo_url, dues_amount_cents, family_dues_amount_cents, lifetime_dues_amount_cents, contact_email"
    )
    .eq("slug", SOCIETY_SLUG)
    .maybeSingle();

  // Roster size, shown only once there's a number worth showing.
  let memberCount = 0;
  if (society) {
    const { count } = await supabase
      .from("club_members")
      .select("id", { count: "exact", head: true })
      .eq("club_id", society.id)
      .eq("status", "active");
    memberCount = count ?? 0;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  let isMember = false;
  if (user && society) {
    const { data: me } = await supabase
      .from("club_members")
      .select("status")
      .eq("club_id", society.id)
      .eq("user_id", user.id)
      .maybeSingle();
    isMember = Boolean(me) && me?.status !== "pending";
  }

  const dues = society?.dues_amount_cents ?? 0;
  const familyDues = society?.family_dues_amount_cents ?? null;
  const lifetimeDues = society?.lifetime_dues_amount_cents ?? null;

  const ctaHref = society ? SOCIETY_HOME_PATH : "/login";
  const ctaLabel = isMember
    ? "Go to the member area"
    : society
    ? "Join the Society"
    : "Create an account";

  return (
    <main className="min-h-screen">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-36 sm:pb-24">
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[440px] w-[760px] max-w-full -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              "radial-gradient(ellipse, rgba(18,100,160,0.22) 0%, transparent 70%)",
          }}
        />

        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 text-center">
          <p className="mb-8 inline-block rounded-full border border-ocean-700/50 px-4 py-1.5 font-mono text-[11px] uppercase tracking-[0.25em] text-ocean-400">
            <MapPin className="mr-1.5 -mt-0.5 inline h-3 w-3" />
            Nationwide · One society · No chapters
          </p>

          <h1 className="glow-text mb-5 font-display text-[clamp(1.85rem,5vw,3.5rem)] leading-[1.12] text-white">
            The Underground
            <br />
            <span className="text-ocean-300">Aquarium Society</span>
          </h1>

          <p className="mx-auto mb-9 max-w-2xl font-body text-base leading-relaxed text-ocean-300/85 sm:text-lg md:text-xl">
            Aquarium societies have been small, local and hard to find for fifty
            years. This one isn&apos;t. One membership, every state, run in the
            open — with real award programs and people who actually breed,
            plant and keep.
          </p>

          <div className="mx-auto flex max-w-md flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link
              href={ctaHref}
              className="group inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl bg-ocean-600 px-6 font-medium text-white transition-colors hover:bg-ocean-500 sm:w-auto"
            >
              {ctaLabel}
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="#membership"
              className="inline-flex h-[52px] w-full items-center justify-center gap-2 rounded-xl border border-ocean-700/60 bg-ocean-900/60 px-6 font-medium text-ocean-200 transition-colors hover:border-ocean-500 hover:text-white sm:w-auto"
            >
              What membership gets you
            </Link>
          </div>

          {memberCount > 0 && (
            <p className="mt-8 text-sm text-ocean-500">
              {memberCount.toLocaleString()} member
              {memberCount === 1 ? "" : "s"} and counting
            </p>
          )}
        </div>
      </section>

      {/* ---------------- Perks ---------------- */}
      <section className="relative bg-ocean-950 py-16 sm:py-24">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-ocean-900/20 to-transparent" />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-8 sm:mb-12">
            <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-ocean-500">
              Membership
            </p>
            <h2 className="font-display text-3xl text-white sm:text-4xl md:text-5xl">
              What you actually{" "}
              <span className="text-ocean-300">get</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {PERKS.map((p) => (
              <div
                key={p.title}
                className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 sm:p-6"
              >
                <div className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ocean-700/50 bg-ocean-800/60 sm:mb-4 sm:h-12 sm:w-12">
                  <p.Icon className="h-5 w-5 text-ocean-300" />
                </div>
                <h3 className="mb-2 font-display text-lg text-white sm:text-xl">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-ocean-400 sm:text-base">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Dues ---------------- */}
      <section
        id="membership"
        className="relative scroll-mt-24 border-t border-ocean-800/40 py-16 sm:py-24"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-ocean-900 via-ocean-950 to-brine-900/30" />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-ocean-500">
            Dues
          </p>
          <h2 className="mb-5 font-display text-3xl text-white sm:text-4xl">
            Everything else here is free.
            <br />
            <span className="text-ocean-300">This is the part that isn&apos;t.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-ocean-300/85">
            The classifieds, the tools and the forums cost nothing and never
            will. Membership dues are what pay for the awards program, the
            events and keeping the lights on — nothing is skimmed off anybody
            else.
          </p>

          {dues > 0 || familyDues || lifetimeDues ? (
            <div className="mx-auto mb-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {dues > 0 && (
                <div className="rounded-2xl border border-ocean-700/60 bg-ocean-900/60 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ocean-500">
                    Individual
                  </p>
                  <p className="mt-2 font-display text-3xl text-white">
                    {money(dues)}
                  </p>
                  <p className="mt-1 text-xs text-ocean-500">per year</p>
                </div>
              )}
              {familyDues ? (
                <div className="rounded-2xl border border-ocean-700/60 bg-ocean-900/60 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-ocean-500">
                    Family
                  </p>
                  <p className="mt-2 font-display text-3xl text-white">
                    {money(familyDues)}
                  </p>
                  <p className="mt-1 text-xs text-ocean-500">
                    per year, one household
                  </p>
                </div>
              ) : null}
              {lifetimeDues ? (
                <div className="rounded-2xl border border-amber-500/40 bg-amber-500/10 p-5">
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300/80">
                    Lifetime
                  </p>
                  <p className="mt-2 font-display text-3xl text-white">
                    {money(lifetimeDues)}
                  </p>
                  <p className="mt-1 text-xs text-amber-200/70">
                    once, never again
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          <ul className="mx-auto mb-10 max-w-md space-y-3 text-left">
            {[
              "Cancel or lapse any time — nothing auto-charges without warning.",
              "Your classifieds, forum account and tools keep working either way.",
              "Dues are handled by Stripe. We never see a card number.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                <span className="text-sm text-ocean-300">{line}</span>
              </li>
            ))}
          </ul>

          <Link
            href={ctaHref}
            className="group inline-flex h-[52px] items-center justify-center gap-2 rounded-xl bg-ocean-600 px-8 font-medium text-white transition-colors hover:bg-ocean-500"
          >
            {ctaLabel}
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ocean-600">
            <ShieldCheck className="h-3.5 w-3.5" />
            {society?.contact_email
              ? `Questions? ${society.contact_email}`
              : "Questions? hello@undergroundaquarium.com"}
          </p>
        </div>
      </section>
    </main>
  );
}
