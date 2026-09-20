import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  Trophy,
  Users,
  CalendarDays,
  Sprout,
  ArrowRight,
  Check,
  ShieldCheck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import {
  SOCIETY_NAME,
  SOCIETY_SLUG,
  SOCIETY_HOME_PATH,
  SOCIETY_CLUB_PATH,
} from "@/lib/config";
import {
  SOC_EYEBROW,
  SOC_ACCENT,
  SOC_CARD,
  SOC_BTN_PRIMARY,
  SOC_BTN_GHOST,
  SOC_PILL,
  SOC_RULE,
  SOC_GLOW,
} from "@/lib/society/theme";
import SocietySeal from "@/components/society/SocietySeal";

// The roster and dues figures change, but not by the second.
export const revalidate = 300;

export const metadata: Metadata = {
  title: `${SOCIETY_NAME} — join the national aquarium society`,
  description:
    "One aquarium society, nationwide, open to anyone who keeps fish. A judged breeder award program, a permanent species registry, and recognition that somebody actually verified.",
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

const PERKS = [
  {
    Icon: Trophy,
    title: "Breeder Award Program",
    body: "Spawn it, raise it, submit it. Judged entries, real points, and titles that mean something because somebody checked.",
  },
  {
    Icon: Sprout,
    title: "The Species Registry",
    body: "The first member to log an approved spawn of a species holds that record permanently. Right now every one of them is unclaimed.",
  },
  {
    Icon: Users,
    title: "A national roster",
    body: "Not twelve people who can make a Tuesday. Members in every state, one room, no chapters to shop between.",
  },
  {
    Icon: CalendarDays,
    title: "A card and a certificate",
    body: "A permanent member number, a trophy case on your public profile, and a signed certificate for every title you earn.",
  },
];

export default async function SocietyPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  const { view } = await searchParams;
  const supabase = await createClient();

  const { data: society } = await supabase
    .from("clubs")
    .select(
      "id, name, description, dues_amount_cents, family_dues_amount_cents, lifetime_dues_amount_cents, contact_email"
    )
    .eq("slug", SOCIETY_SLUG)
    .maybeSingle();

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

  // Members don't need the sales pitch: every Society link (nav, footer,
  // profile strip) takes them straight into the member area. ?view=about
  // still shows this page if a member wants it.
  if (isMember && view !== "about") redirect(SOCIETY_HOME_PATH);

  const dues = society?.dues_amount_cents ?? 0;
  const familyDues = society?.family_dues_amount_cents ?? null;
  const lifetimeDues = society?.lifetime_dues_amount_cents ?? null;
  const hasTiers = dues > 0 || Boolean(familyDues) || Boolean(lifetimeDues);

  // Members go to their area. Everyone else goes to the club page, which is
  // where the join form lives (and which asks signed-out visitors to sign in).
  // Sending an applicant to /society/home would bounce them straight back here.
  const ctaHref = isMember ? SOCIETY_HOME_PATH : SOCIETY_CLUB_PATH;
  const ctaLabel = isMember
    ? "Go to the member area"
    : society
    ? "Apply for membership"
    : "Create an account";

  const tiers = [
    dues > 0 && {
      key: "individual",
      label: "Individual",
      price: money(dues),
      note: "per year",
      featured: false,
    },
    familyDues && {
      key: "family",
      label: "Family",
      price: money(familyDues),
      note: "per year · one household",
      featured: false,
    },
    lifetimeDues && {
      key: "lifetime",
      label: "Lifetime",
      price: money(lifetimeDues),
      note: "once · never renews",
      featured: true,
    },
  ].filter(Boolean) as {
    key: string;
    label: string;
    price: string;
    note: string;
    featured: boolean;
  }[];

  return (
    <main className="min-h-screen">
      {/* ---------------- Hero ---------------- */}
      <section className="relative overflow-hidden pt-28 pb-16 sm:pt-32 sm:pb-24">
        <div
          className="pointer-events-none absolute left-1/2 top-[38%] h-[520px] w-[820px] max-w-full -translate-x-1/2 -translate-y-1/2"
          style={SOC_GLOW}
        />

        <div className="relative z-10 mx-auto w-full max-w-4xl px-6 text-center">
          <SocietySeal
            size={200}
            className="mx-auto mb-7 h-[140px] w-[140px] sm:h-[200px] sm:w-[200px]"
          />

          <p className={`${SOC_EYEBROW} mb-6`}>
            Nationwide · One society · No chapters
          </p>

          <h1 className="glow-text mb-5 font-display text-[clamp(1.9rem,5.2vw,3.6rem)] leading-[1.1] text-white">
            The Underground
            <br />
            <span className={SOC_ACCENT}>Aquarium Society</span>
          </h1>

          <p className="mx-auto mb-9 max-w-2xl font-body text-base leading-relaxed text-amber-100/60 sm:text-lg md:text-xl">
            Aquarium societies have been small, local and hard to find for fifty
            years. This one isn&apos;t. One membership, every state, run in the
            open, with award programs somebody actually judges.
          </p>

          <div className="mx-auto flex max-w-md flex-col items-center gap-3 sm:max-w-none sm:flex-row sm:justify-center">
            <Link href={ctaHref} className={`group w-full sm:w-auto ${SOC_BTN_PRIMARY}`}>
              {ctaLabel}
              <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link href="#dues" className={`w-full sm:w-auto ${SOC_BTN_GHOST}`}>
              What it costs
            </Link>
          </div>

          {memberCount > 0 && (
            <p className="mt-8">
              <span className={SOC_PILL}>
                {memberCount.toLocaleString()} member
                {memberCount === 1 ? "" : "s"}
              </span>
            </p>
          )}
        </div>
      </section>

      <div className="mx-auto max-w-4xl px-6">
        <div className={SOC_RULE} />
      </div>

      {/* ---------------- Perks ---------------- */}
      <section className="relative py-16 sm:py-24">
        <div className="relative mx-auto max-w-5xl px-6">
          <div className="mb-8 text-center sm:mb-12">
            <p className={`${SOC_EYEBROW} mb-4`}>Membership</p>
            <h2 className="font-display text-3xl text-white sm:text-4xl md:text-5xl">
              What you actually <span className={SOC_ACCENT}>get</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            {PERKS.map((p) => (
              <div key={p.title} className={`${SOC_CARD} p-5 sm:p-6`}>
                <div className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10">
                  <p.Icon className="h-5 w-5 text-amber-300" />
                </div>
                <h3 className="mb-2 font-display text-lg text-white sm:text-xl">
                  {p.title}
                </h3>
                <p className="text-sm leading-relaxed text-amber-100/60 sm:text-base">
                  {p.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------------- Dues ---------------- */}
      <section
        id="dues"
        className="relative scroll-mt-24 overflow-hidden py-16 sm:py-24"
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 h-[460px] w-[900px] max-w-full -translate-x-1/2 -translate-y-1/2"
          style={SOC_GLOW}
        />

        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <p className={`${SOC_EYEBROW} mb-4`}>Dues</p>
          <h2 className="mb-5 font-display text-3xl text-white sm:text-4xl">
            Everything else here is free.
            <br />
            <span className={SOC_ACCENT}>This is the part that isn&apos;t.</span>
          </h2>
          <p className="mx-auto mb-10 max-w-xl text-base leading-relaxed text-amber-100/60">
            The classifieds, the tools and the forums cost nothing and never
            will. Dues pay for the award programs, the events, and keeping the
            lights on. Nothing is skimmed off anybody else.
          </p>

          {hasTiers && (
            <div className="mx-auto mb-10 grid max-w-2xl grid-cols-1 gap-3 sm:grid-cols-3">
              {tiers.map((t) => (
                <div
                  key={t.key}
                  className={
                    t.featured
                      ? "rounded-2xl border border-amber-400/60 bg-amber-400/10 p-5 shadow-lg shadow-amber-500/10"
                      : `${SOC_CARD} p-5`
                  }
                >
                  <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300/70">
                    {t.label}
                  </p>
                  <p className="mt-2 font-display text-3xl text-white">
                    {t.price}
                  </p>
                  <p className="mt-1 text-xs text-amber-200/50">{t.note}</p>
                </div>
              ))}
            </div>
          )}

          <ul className="mx-auto mb-10 max-w-md space-y-3 text-left">
            {[
              "Cancel or lapse any time. Nothing auto-charges without warning.",
              "Your classifieds, forum account and tools keep working either way.",
              "Dues are handled by Stripe. We never see a card number.",
            ].map((line) => (
              <li key={line} className="flex items-start gap-3">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                <span className="text-sm text-amber-100/70">{line}</span>
              </li>
            ))}
          </ul>

          <Link href={ctaHref} className={`group px-8 ${SOC_BTN_PRIMARY}`}>
            {ctaLabel}
            <ArrowRight className="h-4 w-4 shrink-0 transition-transform group-hover:translate-x-1" />
          </Link>

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-amber-200/35">
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
