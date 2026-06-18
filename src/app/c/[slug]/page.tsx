import { notFound } from "next/navigation";
import Link from "next/link";
import {
  Settings,
  Trophy,
  Gavel,
  Users,
  ArrowRight,
  Crown,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import PayDuesButton from "./PayDuesButton";
import DuesSuccessBanner from "./DuesSuccessBanner";

const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export default async function ClubHomePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dues?: string }>;
}) {
  const { slug } = await params;
  const sp = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, name, description, logo_url, city, state, dues_amount_cents, stripe_account_id, payouts_enabled"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  let role: string | null = null;
  let paidThrough: string | null = null;
  if (user) {
    const { data: me } = await supabase
      .from("club_members")
      .select("role, paid_through")
      .eq("club_id", club.id)
      .eq("user_id", user.id)
      .maybeSingle();
    role = me?.role ?? null;
    paidThrough = me?.paid_through ?? null;
  }
  const isMember = role !== null;
  const isOfficer = role === "owner" || role === "admin" || role === "officer";

  const { count } = await supabase
    .from("club_members")
    .select("id", { count: "exact", head: true })
    .eq("club_id", club.id);
  const memberCount = count ?? 0;

  const canCollect = Boolean(club.stripe_account_id) && club.payouts_enabled;
  const today = new Date();
  const paidThroughDate = paidThrough
    ? new Date(paidThrough + "T00:00:00")
    : null;
  const isPaidCurrent = paidThroughDate ? paidThroughDate >= today : false;
  const duesDue =
    isMember && club.dues_amount_cents > 0 && canCollect && !isPaidCurrent;

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        {sp?.dues === "success" && <DuesSuccessBanner />}

        <div className="flex items-center gap-4 mb-2">
          {club.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={club.logo_url}
              alt={club.name}
              className="w-14 h-14 rounded-xl object-cover border border-ocean-800/60"
            />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-ocean-800/60 flex items-center justify-center">
              <Users className="w-7 h-7 text-ocean-400" />
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl text-white leading-tight">
              {club.name}
            </h1>
            {(club.city || club.state) && (
              <p className="text-sm text-ocean-400">
                {[club.city, club.state].filter(Boolean).join(", ")}
              </p>
            )}
          </div>
        </div>

        {club.description && (
          <p className="text-ocean-300 mb-6 mt-2">{club.description}</p>
        )}

        <div className="flex flex-wrap items-center gap-3 mb-8 text-sm text-ocean-400">
          <span className="inline-flex items-center gap-1.5">
            <Users className="w-4 h-4" /> {memberCount} member
            {memberCount === 1 ? "" : "s"}
          </span>
          {club.dues_amount_cents > 0 && (
            <span>· Dues {money(club.dues_amount_cents)}</span>
          )}
          {role && (
            <span className="inline-flex items-center gap-1.5 capitalize">
              · {role === "owner" && <Crown className="w-4 h-4 text-amber-300" />}
              You&apos;re {role === "owner" ? "the owner" : `a ${role}`}
            </span>
          )}
          {isPaidCurrent && paidThroughDate && (
            <span className="text-emerald-300">
              · Paid through {paidThroughDate.toLocaleDateString()}
            </span>
          )}
        </div>

        {duesDue && (
          <div className="rounded-2xl border border-emerald-700/40 bg-emerald-900/10 px-6 py-5 mb-6">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div>
                <p className="text-white font-medium">Membership dues</p>
                <p className="text-sm text-ocean-400">
                  Pay {money(club.dues_amount_cents)} to{" "}
                  {paidThrough ? "renew your membership" : "activate your membership"}.
                </p>
              </div>
              <PayDuesButton
                clubId={club.id}
                label={`Pay ${money(club.dues_amount_cents)} dues`}
              />
            </div>
          </div>
        )}

        {isOfficer && (
          <Link
            href={`/c/${slug}/admin`}
            className="flex items-center justify-between gap-4 rounded-2xl border border-ocean-700/60 bg-ocean-800/40 px-6 py-5 mb-6 hover:bg-ocean-800/60 transition-colors group"
          >
            <span className="flex items-center gap-3">
              <Settings className="w-6 h-6 text-ocean-200" />
              <span>
                <span className="block text-white font-medium">Admin console</span>
                <span className="block text-sm text-ocean-400">
                  Manage members, dues, and club settings
                </span>
              </span>
            </span>
            <ArrowRight className="w-5 h-5 text-ocean-400 group-hover:translate-x-1 transition-transform" />
          </Link>
        )}

        {isMember ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-5 opacity-60">
              <Trophy className="w-6 h-6 text-emerald-300 mb-3" />
              <p className="text-white font-medium">BAP / HAP</p>
              <p className="text-sm text-ocean-400">
                Breeder &amp; plant awards — coming soon.
              </p>
            </div>
            <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-5 opacity-60">
              <Gavel className="w-6 h-6 text-ocean-200 mb-3" />
              <p className="text-white font-medium">Auctions</p>
              <p className="text-sm text-ocean-400">
                Member auctions — coming soon.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-8 text-center">
            <Users className="w-8 h-8 text-ocean-600 mx-auto mb-3" />
            <p className="text-ocean-300">
              You&apos;re viewing {club.name}. Member sign-up is coming soon.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
