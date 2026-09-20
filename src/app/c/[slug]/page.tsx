import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Clock, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { SOCIETY_SLUG, SOCIETY_HOME_PATH, SOCIETY_PATH } from "@/lib/config";
import { SOC_EYEBROW, SOC_CARD, SOC_BTN_PRIMARY, SOC_BTN_GHOST } from "@/lib/society/theme";
import SocietySeal from "@/components/society/SocietySeal";
import MemberCard from "@/components/society/MemberCard";
import PayDuesButton from "./PayDuesButton";
import DuesSuccessBanner from "./DuesSuccessBanner";
import LeaveClubButton from "./LeaveClubButton";
import JoinClubForm from "./JoinClubForm";
import MemberSelfEdit from "./MemberSelfEdit";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Join the Society",
  description:
    "Apply to join the Underground Aquarium Society: judged breeder awards, a permanent species registry, signed certificates and Society trophies.",
};

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

/**
 * Joining and paying for the Society.
 *
 * This used to be a generic club page. There is one Society now, so it does
 * one job: get someone from "interested" to "paid member", then hand them to
 * the member area. Members only land here to pay dues or manage their
 * membership (?manage=1); otherwise they're sent straight to the member area.
 */
export default async function SocietyJoinPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dues?: string; manage?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  if (slug !== SOCIETY_SLUG) redirect(SOCIETY_PATH);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, name, description, dues_amount_cents, lifetime_dues_amount_cents, stripe_account_id, payouts_enabled, contact_email"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  const here = `/c/${slug}`;

  // Who's asking.
  let me: {
    role: string | null;
    status: string | null;
    paid_through: string | null;
    display_name: string | null;
    email: string | null;
    tier: string | null;
  } | null = null;
  let membershipError: string | null = null;
  if (user) {
    const { data, error } = await supabase
      .from("club_members")
      .select("role, status, paid_through, display_name, email, tier")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    me = data;
    membershipError = error?.message ?? null;
  }

  const isApplicant = me?.status === "pending";
  const isMember = Boolean(me?.role) && !isApplicant;
  const today = new Date();
  const paidThroughDate = me?.paid_through ? new Date(me.paid_through + "T00:00:00") : null;
  const isPaidCurrent = paidThroughDate ? paidThroughDate >= today : false;
  const isLifetime = me?.tier === "lifetime";
  const canCollect = Boolean(club.stripe_account_id) && club.payouts_enabled;
  const myDuesCents = isLifetime ? club.lifetime_dues_amount_cents ?? 0 : club.dues_amount_cents;
  const duesDue =
    isMember && me?.role !== "owner" && canCollect && myDuesCents > 0 && !isPaidCurrent;

  // A member in good standing has nothing to do here unless they asked to
  // manage their membership or just came back from paying.
  if (isMember && !duesDue && sp.manage !== "1" && sp.dues !== "success") {
    redirect(SOCIETY_HOME_PATH);
  }

  // Public headcount (the roster itself is private).
  const { data: countData } = await supabase.rpc("society_member_count");
  const memberCount = Number(countData ?? 0);

  let myNumber: number | null = null;
  let myJoinedAt: string | null = null;
  let myTitle: string | null = null;
  if (user && isMember) {
    const { data: card } = await supabase.rpc("society_public_card", { p_user: user.id });
    const c = (Array.isArray(card) ? card[0] : card) as {
      member_number?: number | null;
      joined_at?: string | null;
      title?: string | null;
    } | null;
    myNumber = c?.member_number ?? null;
    myJoinedAt = c?.joined_at ?? null;
    myTitle = c?.title ?? null;
  }

  const tiers = [
    club.dues_amount_cents > 0 && { label: "Individual", price: money(club.dues_amount_cents), note: "per year" },
    (club.lifetime_dues_amount_cents ?? 0) > 0 && {
      label: "Lifetime",
      price: money(club.lifetime_dues_amount_cents as number),
      note: "once · never renews",
    },
  ].filter(Boolean) as { label: string; price: string; note: string }[];

  return (
    <main className="min-h-screen px-4 pb-24 pt-28 sm:px-6">
      <div className="mx-auto max-w-2xl">
        {sp.dues === "success" && <DuesSuccessBanner />}

        <div className="mb-8 text-center">
          <SocietySeal size={96} className="mx-auto mb-5 h-24 w-24" />
          <p className={`${SOC_EYEBROW} mb-2`}>
            {isMember ? "Your membership" : "Membership"}
          </p>
          <h1 className="font-display text-3xl text-white sm:text-4xl">{club.name}</h1>
          {!isMember && club.description && (
            <p className="mx-auto mt-3 max-w-lg text-amber-100/65">{club.description}</p>
          )}
          {memberCount > 0 && !isMember && (
            <p className="mt-3 font-mono text-[11px] uppercase tracking-[0.2em] text-amber-500/60">
              {memberCount.toLocaleString()} member{memberCount === 1 ? "" : "s"} and counting
            </p>
          )}
        </div>

        {/* ---------- Members: pay dues, manage, leave ---------- */}
        {isMember && (
          <>
            <MemberCard
              className="mb-6"
              name={me?.display_name || "Member"}
              memberNumber={myNumber}
              joinedAt={myJoinedAt}
              title={myTitle}
              tier={me?.tier ?? null}
              paidThrough={me?.paid_through ?? null}
            />

            {duesDue && (
              <div className="mb-6 rounded-2xl border border-amber-500/40 bg-amber-500/[0.08] px-6 py-5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-white">
                      {isLifetime ? "Lifetime membership" : paidThroughDate ? "Renew your membership" : "Activate your membership"}
                    </p>
                    <p className="text-sm text-amber-100/60">
                      {isLifetime
                        ? `${money(myDuesCents)} once. No renewals, ever.`
                        : `${money(myDuesCents)} for a year. Your member area, trophies and records unlock again the moment it clears.`}
                    </p>
                  </div>
                  <PayDuesButton
                    clubId={club.id}
                    label={isLifetime ? `Pay ${money(myDuesCents)}` : `Pay ${money(myDuesCents)} dues`}
                  />
                </div>
              </div>
            )}

            <Link
              href={SOCIETY_HOME_PATH}
              className={`${SOC_CARD} mb-6 flex items-center justify-between gap-4 px-6 py-5 transition-colors hover:border-amber-400/50`}
            >
              <span>
                <span className="block font-medium text-white">Go to the member area</span>
                <span className="block text-sm text-amber-100/55">
                  Breeder program, spawn logs, certificates and your Society trophies.
                </span>
              </span>
              <ArrowRight className="h-5 w-5 text-amber-400" />
            </Link>

            <MemberSelfEdit clubId={club.id} initialName={me?.display_name ?? null} initialEmail={me?.email ?? null} />

            {me?.role !== "owner" && (
              <div className="mt-10 border-t border-ocean-900/60 pt-6">
                <LeaveClubButton clubId={club.id} clubName={club.name} label="Leave the Society" />
              </div>
            )}
          </>
        )}

        {/* ---------- Applicants ---------- */}
        {isApplicant && (
          <div className={`${SOC_CARD} px-6 py-8 text-center`}>
            <Clock className="mx-auto mb-3 h-8 w-8 text-amber-300/80" />
            <p className="mb-1 font-medium text-white">Application received</p>
            <p className="mb-4 text-sm text-amber-100/60">
              We&apos;re reviewing it now. You&apos;ll get a notification the moment you&apos;re approved, and
              then you can pay dues and step into the member area.
            </p>
            <LeaveClubButton clubId={club.id} clubName={club.name} label="Withdraw application" />
          </div>
        )}

        {membershipError && (
          <div className="rounded-2xl border border-coral-500/40 bg-coral-500/10 px-6 py-8 text-center">
            <p className="font-medium text-white">Couldn&apos;t load your membership</p>
            <p className="mx-auto mt-2 max-w-md text-sm text-ocean-300">
              Something went wrong reading the roster. Nothing about your membership has changed. Try again
              in a minute.
            </p>
          </div>
        )}

        {/* ---------- Everyone else: the pitch and the form ---------- */}
        {!isMember && !isApplicant && !membershipError && (
          <>
            {tiers.length > 0 && (
              <div className={`mb-6 grid gap-3 ${tiers.length > 1 ? "sm:grid-cols-2" : ""}`}>
                {tiers.map((t) => (
                  <div key={t.label} className={`${SOC_CARD} p-5 text-center`}>
                    <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-amber-400/80">{t.label}</p>
                    <p className="mt-2 font-display text-3xl text-white">{t.price}</p>
                    <p className="text-sm text-amber-100/55">{t.note}</p>
                  </div>
                ))}
              </div>
            )}

            <ul className="mb-8 grid gap-2 text-sm text-amber-100/70 sm:grid-cols-2">
              {[
                "Judged Breeder Award Program",
                "A permanent member number",
                "Signed, verifiable certificates",
                "Society trophies on your profile",
                "The Species Registry",
                "Your classifieds and tools stay free",
              ].map((b) => (
                <li key={b} className="flex items-center gap-2">
                  <Check className="h-4 w-4 shrink-0 text-amber-400" />
                  {b}
                </li>
              ))}
            </ul>

            {user ? (
              <div className={`${SOC_CARD} px-6 py-8 text-center`}>
                <p className="mb-4 text-amber-100/70">
                  Apply below. Once you&apos;re approved you pay dues and you&apos;re in.
                </p>
                <JoinClubForm
                  clubId={club.id}
                  clubName={club.name}
                  defaultName={(user.user_metadata?.username as string) || ""}
                  dues={club.dues_amount_cents}
                  lifetimeDues={club.lifetime_dues_amount_cents}
                  society
                />
              </div>
            ) : (
              <div className={`${SOC_CARD} px-6 py-8 text-center`}>
                <p className="mb-5 text-amber-100/70">
                  You&apos;ll need a free Underground Aquarium account to apply.
                </p>
                <div className="flex flex-col justify-center gap-3 sm:flex-row">
                  <Link href={`/register?next=${encodeURIComponent(here)}`} className={`${SOC_BTN_PRIMARY} px-8`}>
                    Create an account
                  </Link>
                  <Link href={`/login?next=${encodeURIComponent(here)}`} className={`${SOC_BTN_GHOST} px-8`}>
                    Log in
                  </Link>
                </div>
              </div>
            )}

            {club.contact_email && (
              <p className="mt-8 text-center text-sm text-ocean-500">
                Questions?{" "}
                <a href={`mailto:${club.contact_email}`} className="text-amber-300/80 hover:text-amber-300">
                  {club.contact_email}
                </a>
              </p>
            )}
          </>
        )}
      </div>
    </main>
  );
}
