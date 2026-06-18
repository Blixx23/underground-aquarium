import Link from "next/link";
import { Users, Crown, Plus, ArrowRight } from "lucide-react";
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

export default async function ClubsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let rows: ClubRow[] = [];
  if (user) {
    const { data } = await supabase
      .from("club_members")
      .select("role, status, clubs(id, slug, name, logo_url, city, state)")
      .eq("user_id", user.id)
      .order("joined_at", { ascending: true });
    rows = (data ?? []) as unknown as ClubRow[];
  }

  return (
    <main className="min-h-screen pt-28 pb-20 px-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-2">
          <h1 className="font-display text-3xl text-white">Your clubs</h1>
          <Link
            href="/clubs/new"
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

        {!user ? (
          <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 px-6 py-12 text-center">
            <Users className="w-10 h-10 text-ocean-600 mx-auto mb-4" />
            <p className="text-ocean-300 mb-6">
              Sign in to see your clubs, or start one.
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
              href="/clubs/new"
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
