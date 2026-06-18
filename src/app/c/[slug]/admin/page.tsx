import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ShieldAlert, CreditCard, Settings } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import MemberManager from "./MemberManager";
import ClubPayoutButton from "./ClubPayoutButton";
import ClubSettings from "./ClubSettings";
import DeleteClubButton from "./DeleteClubButton";

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
      "id, name, slug, description, city, state, logo_url, is_public, stripe_account_id, dues_amount_cents, payouts_enabled"
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

  const payoutStatus: "none" | "incomplete" | "active" = !club.stripe_account_id
    ? "none"
    : club.payouts_enabled
    ? "active"
    : "incomplete";

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

        <h2 className="font-display text-xl text-white mb-1">Members</h2>
        <p className="text-ocean-400 mb-4 text-sm">
          Add members, set their role and status, or remove them. The owner row
          is locked.
        </p>

        <MemberManager
          clubId={club.id}
          viewerRole={role as string}
          initialMembers={enriched}
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
