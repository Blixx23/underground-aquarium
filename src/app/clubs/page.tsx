import Link from "next/link";
import { Users, Crown, Plus, ArrowRight, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

type ClubRow = {
  role: string;
  status: string;
  clubs: {
    id: string;
    slug: string;
    name: string;
    logo_url: string | null;
    city: string | null;
    state: string | null;
  } | null;
};

type InviteRow = {
  token: string;
  role: string;
  club_id: string;
  club_slug: string;
  club_name: string;
  club_logo_url: string | null;
  club_city: string | null;
  club_state: string | null;
};

export default async function ClubsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rows: ClubRow[] = [];
  let invites: InviteRow[] = [];
  if (user) {
    const { data } = await supabase
      .from("club_members")
      .select("role, status, clubs(id, slug, name, logo_url, city, state)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });
    rows = (data ?? []) as unknown as ClubRow[];

    const { data: inv } = await supabase.rpc("my_pending_invites");
    invites = (inv ?? []) as InviteRow[];
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="font-display text-3xl text-white">Your clubs</h1>
          <Link
            href="/clubs/start"
            className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors"
          >
            <Plus className="w-4 h-4" /> Start a club
          </Link>
        </div>
        <p className="text-ocean-400 mb-8 text-sm">
          Clubs you belong to.{" "}
          <Link
            href="/clubs/discover"
            className="text-ocean-300 hover:text-white underline underline-offset-2"
          >
            Discover more clubs →
          </Link>
        </p>

        {user && invites.length > 0 && (
          <div className="mb-8">
            <p className="text-sm font-medium text-white mb-3 flex items-center gap-2">
              <Mail className="w-4 h-4 text-amber-300" /> Club invitations
            </p>
            <div className="space-y-3">
              {invites.map((inv) => (
                <div
                  key={inv.token}
                  className="flex items-center justify-between gap-4 rounded-2xl border border-amber-500/30 bg-amber-500/5 px-5 py-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {inv.club_logo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={inv.club_logo_url}
                        alt={inv.club_name}
                        className="w-11 h-11 rounded-xl object-cover border border-ocean-800/60 shrink-0"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-ocean-800/60 flex items-center justify-center shrink-0">
                        <Users className="w-5 h-5 text-ocean-400" />
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="text-white font-medium truncate">
                        {inv.club_name}
                      </p>
                      <p className="text-xs text-ocean-500 capitalize">
                        {[inv.club_city, inv.club_state]
                          .filter(Boolean)
                          .join(", ")}
                        {inv.club_city || inv.club_state ? " · " : ""}
                        Invited as {inv.role}
                      </p>
                    </div>
                  </div>
                  <Link
                    href={`/join/${inv.token}`}
                    className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-4 py-2 text-sm font-medium text-ocean-950 hover:bg-amber-300 transition-colors shrink-0"
                  >
                    Accept
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {!user ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-12 text-center">
            <Users className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-300 mb-6">
              Sign in to see your clubs, or{" "}
              <Link
                href="/clubs/start"
                className="text-ocean-300 hover:text-white underline underline-offset-2"
              >
                learn about running one
              </Link>
              .
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
            >
              Log in
            </Link>
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-12 text-center">
            <Users className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-300 mb-2">You&apos;re not in any clubs yet.</p>
            <p className="text-ocean-500 text-sm mb-6">
              Start your own, or join one with an invite link.
            </p>
            <Link
              href="/clubs/start"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-ocean-700 text-white hover:bg-ocean-600 transition-colors"
            >
              <Plus className="w-4 h-4" /> Start a club
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {rows.map(
              (r) =>
                r.clubs && (
                  <Link
                    key={r.clubs.id}
                    href={`/c/${r.clubs.slug}`}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-5 py-4 hover:bg-ocean-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {r.clubs.logo_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={r.clubs.logo_url}
                          alt={r.clubs.name}
                          className="w-11 h-11 rounded-xl object-cover border border-ocean-800/60 shrink-0"
                        />
                      ) : (
                        <div className="w-11 h-11 rounded-xl bg-ocean-800/60 flex items-center justify-center shrink-0">
                          <Users className="w-5 h-5 text-ocean-400" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-white font-medium truncate flex items-center gap-1.5">
                          {r.role === "owner" && (
                            <Crown className="w-4 h-4 text-amber-300 shrink-0" />
                          )}
                          {r.clubs.name}
                        </p>
                        <p className="text-xs text-ocean-500 capitalize">
                          {[r.clubs.city, r.clubs.state]
                            .filter(Boolean)
                            .join(", ")}
                          {(r.clubs.city || r.clubs.state) ? " · " : ""}
                          {r.role}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-5 h-5 text-ocean-500 group-hover:translate-x-1 transition-transform shrink-0" />
                  </Link>
                )
            )}
          </div>
        )}
      </div>
    </main>
  );
}
