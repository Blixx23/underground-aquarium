import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  ShieldAlert,
  CreditCard,
  Settings,
  Trophy,
  ClipboardCheck,
  ListChecks,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe/server";
import MemberManager from "./MemberManager";
import ClubPayoutButton from "./ClubPayoutButton";
import ClubSettings from "./ClubSettings";
import DeleteClubButton from "./DeleteClubButton";
import ClubRequests from "./ClubRequests";

export default async function ClubAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: club } = await supabase
    .from("clubs")
    .select(
      "id, name, slug, description, city, state, logo_url, is_public, approved, contact_name, contact_email, contact_phone, public_url, meeting_info, nonprofit_info, stripe_account_id, dues_amount_cents, payouts_enabled"
    )
    .eq("slug", slug)
    .maybeSingle();
  if (!club) notFound();

  const { data: me } = await supabase
    .from("club_members")
    .select("role")
    .eq("club_id", club.id)
    .eq("user_id", user.id)
    .maybeSingle();
  const role = me?.role ?? null;
  const isOfficer = role === "owner" || role === "admin" || role === "officer";

  if (!isOfficer) {
    return (
      <main className="min-h-screen pt-28 pb-20 px-6">
        <div className="max-w-md mx-auto text-center py-20">
          <ShieldAlert className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-white mb-2">
            Officers only
          </h1>
          <p className="text-ocean-400 mb-6">
            You don&apos;t have permission to manage this club.
          </p>
          <Link
            href={`/c/${slug}`}
            className="inline-flex items-center gap-2 text-ocean-300 hover:text-ocean-100 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {club.name}
          </Link>
        </div>
      </main>
    );
  }

  const { data: members } = await supabase
    .from("club_members")
    .select(
      "id, user_id, role, status, tier, display_name, email, paid_through, joined_at"
    )
    .eq("club_id", club.id)
    .order("joined_at", { ascending: true });

  // Look up usernames for members who have an account, so they show a real
  // name instead of the generic fallback.
  const memberList = members ?? [];
  const userIds = memberList
    .map((m) => m.user_id)
    .filter((x): x is string => Boolean(x));
  let nameById: Record<string, string> = {};
  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, username")
      .in("id", userIds);
    nameById = Object.fromEntries(
      (profiles ?? []).map((p) => [p.id as string, p.username as string])
    );
  }
  const enriched = memberList.map((m) => ({
    ...m,
    account_name: m.user_id ? nameById[m.user_id] ?? null : null,
  }));
  // Pull the officer-only application details for ALL members — used both in
  // the requests card and in the roster, so officers can reach approved members.
  const dById: Record<
    string,
    {
      phone: string | null;
      experience: string | null;
      interests: string | null;
      note: string | null;
    }
  > = {};
  if (enriched.length > 0) {
    const { data: details } = await supabase
      .from("club_member_details")
      .select("member_id, phone, experience, interests, note")
      .in(
        "member_id",
        enriched.map((m) => m.id)
      );
    for (const d of details ?? []) {
      dById[d.member_id as string] = {
        phone: d.phone ?? null,
        experience: d.experience ?? null,
        interests: d.interests ?? null,
        note: d.note ?? null,
      };
    }
  }
  const withDetails = enriched.map((m) => ({
    ...m,
    phone: dById[m.id]?.phone ?? null,
    experience: dById[m.id]?.experience ?? null,
    interests: dById[m.id]?.interests ?? null,
    note: dById[m.id]?.note ?? null,
  }));
  const pendingDetailed = withDetails.filter((m) => m.status === "pending");
  const roster = withDetails.filter((m) => m.status !== "pending");

  // Which roster members have paid online at least once. For them, the renewal
  // date is system-managed and locked from manual editing. We match by member
  // id OR by the same user in this club, in case a payment row lacks member_id.
  const { data: paidRows } = await supabaseAdmin
    .from("dues_payments")
    .select("member_id, user_id")
    .eq("club_id", club.id);
  const paidMemberIds = new Set<string>();
  const paidUserIds = new Set<string>();
  for (const r of paidRows ?? []) {
    if (r.member_id) paidMemberIds.add(r.member_id as string);
    if (r.user_id) paidUserIds.add(r.user_id as string);
  }
  const rosterWithPaid = roster.map((m) => ({
    ...m,
    paid_online:
      paidMemberIds.has(m.id) ||
      (m.user_id ? paidUserIds.has(m.user_id) : false),
  }));

  // Reflect the club's live Stripe status (same approach as the seller payouts
  // page): if onboarding looks done, flip "Connected" without depending on a
  // connected-account webhook. Uses the same condition as the webhook.
  let payoutsEnabled = Boolean(club.payouts_enabled);
  if (club.stripe_account_id && !payoutsEnabled) {
    try {
      const account = await stripe.accounts.retrieve(club.stripe_account_id);
      if (account.details_submitted && account.payouts_enabled) {
        payoutsEnabled = true;
        await supabaseAdmin
          .from("clubs")
          .update({ payouts_enabled: true })
          .eq("id", club.id);
      }
    } catch (e) {
      console.error("Club Stripe status check failed:", e);
    }
  }

  const payoutStatus: "none" | "incomplete" | "active" = !club.stripe_account_id
    ? "none"
    : payoutsEnabled
    ? "active"
    : "incomplete";

  const { count: pendingAwards } = await supabase
    .from("club_award_submissions")
    .select("id", { count: "exact", head: true })
    .eq("club_id", club.id)
    .eq("status", "pending");

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-4xl mx-auto">
        <Link
          href={`/c/${slug}`}
          className="inline-flex items-center gap-1.5 text-sm text-ocean-400 hover:text-ocean-200 transition-colors mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> {club.name}
        </Link>
        <h1 className="font-display text-3xl text-white mb-6">Club admin</h1>

        {(role === "owner" || role === "admin") && (
          <div className="mb-8">
            <h2 className="text-white font-medium mb-3 flex items-center gap-2">
              <Settings className="w-5 h-5 text-ocean-300" /> Club settings
            </h2>
            <ClubSettings
              club={{
                id: club.id,
                name: club.name,
                description: club.description,
                city: club.city,
                state: club.state,
                logo_url: club.logo_url,
                is_public: club.is_public,
                approved: club.approved,
                contact_name: club.contact_name,
                contact_email: club.contact_email,
                contact_phone: club.contact_phone,
                public_url: club.public_url,
                meeting_info: club.meeting_info,
                nonprofit_info: club.nonprofit_info,
                dues_amount_cents: club.dues_amount_cents,
              }}
            />
          </div>
        )}

        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 mb-8">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-white font-medium mb-1 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-ocean-300" /> Dues &amp; payouts
              </h2>
              <p className="text-sm text-ocean-400">
                {club.dues_amount_cents > 0
                  ? `Members pay $${(club.dues_amount_cents / 100).toFixed(2)} to join.`
                  : "Dues are free for this club."}
              </p>
              {payoutStatus === "active" && (
                <p className="text-sm text-emerald-300 mt-2">
                  Connected — your club can collect dues.
                </p>
              )}
              {payoutStatus === "incomplete" && (
                <p className="text-sm text-amber-300 mt-2">
                  Setup started but not finished — pick up where you left off.
                </p>
              )}
              {payoutStatus === "none" && (
                <p className="text-sm text-ocean-400 mt-2">
                  Connect a bank account to start collecting dues.
                </p>
              )}
            </div>
            <ClubPayoutButton
              clubId={club.id}
              label={
                payoutStatus === "active"
                  ? "Update payout details"
                  : payoutStatus === "incomplete"
                  ? "Finish setup"
                  : "Set up dues collection"
              }
            />
          </div>
        </div>

        {/* Awards management */}
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 mb-8">
          <h2 className="text-white font-medium mb-1 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-300" /> Awards (BAP / HAP)
          </h2>
          <p className="text-sm text-ocean-400 mb-4">
            Review members&apos; submissions and manage the species point list.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/c/${slug}/awards/review`}
              className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
            >
              <ClipboardCheck className="w-4 h-4" /> Review submissions
              {pendingAwards && pendingAwards > 0 ? (
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-semibold text-ocean-950">
                  {pendingAwards}
                </span>
              ) : null}
            </Link>
            <Link
              href={`/c/${slug}/awards/list`}
              className="inline-flex items-center gap-2 rounded-full border border-ocean-700/60 px-4 py-1.5 text-sm font-medium text-ocean-200 hover:bg-ocean-800/60 transition-colors"
            >
              <ListChecks className="w-4 h-4" /> Point list
            </Link>
          </div>
        </div>

        {pendingDetailed.length > 0 && (
          <ClubRequests requests={pendingDetailed} />
        )}

        <h2 className="font-display text-xl text-white mb-1">Members</h2>
        <p className="text-ocean-400 mb-4 text-sm">
          Add members, set their role and status, or remove them. The owner row
          is locked. You can set a renewal date for members who paid offline —
          it locks once they pay online.
        </p>

        <MemberManager
          clubId={club.id}
          viewerRole={role as string}
          initialMembers={rosterWithPaid}
        />

        {role === "owner" && (
          <div className="mt-10">
            <DeleteClubButton clubId={club.id} clubName={club.name} />
          </div>
        )}
      </div>
    </main>
  );
}
