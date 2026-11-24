import type { Metadata } from "next";
import Link from "next/link";
import { Trophy, ExternalLink } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import {
  awardedQuarters,
  awardsFor,
  getLiveStandings,
  quarterLabel,
  quarterRange,
  tierOf,
  type TopShopRow,
  type AwardRow,
} from "@/lib/stores/topShops";
import RewardToggle from "./RewardToggle";

export const metadata: Metadata = { title: "Admin · Top Stores" };
export const dynamic = "force-dynamic";

type Shop = {
  id: string;
  name: string;
  slug: string;
  address: string | null;
  city: string | null;
  state: string | null;
  phone: string | null;
  claimed_by: string | null;
};

const TIER_TONE: Record<number, string> = {
  25: "bg-amber-400/15 text-amber-200 border-amber-300/40",
  50: "bg-slate-200/10 text-slate-100 border-slate-200/30",
  100: "bg-orange-500/10 text-orange-200 border-orange-300/30",
};

/**
 * Top Stores for the admin: this quarter's live standings with exact ranks
 * and the parts of each score, and every finished quarter's winners with
 * how to reach them and a checklist for sending their reward. The admin
 * layout gates the page to admins.
 */
export default async function AdminTopShopsPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const [live, quarters] = await Promise.all([getLiveStandings(), awardedQuarters()]);
  const view = q && quarters.includes(q) ? q : "live";
  const rows: (TopShopRow | AwardRow)[] = view === "live" ? live.rows : await awardsFor(view);

  const ids = rows.map((r) => r.store_id);
  const { data: shopData } = ids.length
    ? await supabaseAdmin.from("fish_stores").select("id, name, slug, address, city, state, phone, claimed_by").in("id", ids)
    : { data: [] };
  const shops = new Map(((shopData ?? []) as Shop[]).map((s) => [s.id, s]));

  // Who to send a reward to: the owner's sign-in email if claimed, else the shop's contact email.
  const emails = new Map<string, string>();
  if (view !== "live" && ids.length) {
    const { data: contacts } = await supabaseAdmin.from("store_contacts").select("store_id, email").in("store_id", ids);
    for (const c of (contacts ?? []) as { store_id: string; email: string | null }[]) if (c.email) emails.set(c.store_id, c.email);
    await Promise.all(
      [...shops.values()]
        .filter((s) => s.claimed_by)
        .map(async (s) => {
          const { data: u } = await supabaseAdmin.auth.admin.getUserById(s.claimed_by as string);
          if (u?.user?.email) emails.set(s.id, u.user.email);
        })
    );
  }

  const lockDate = new Date(quarterRange(live.quarter).to + "T12:00:00Z").toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const tabs = [{ key: "live", label: `${quarterLabel(live.quarter)} so far` }, ...quarters.map((x) => ({ key: x, label: quarterLabel(x) }))];

  return (
    <main>
      <h1 className="mb-1 flex items-center gap-3 font-display text-3xl text-white">
        <Trophy className="h-7 w-7 text-amber-300" /> Top Stores
      </h1>
      <p className="mb-6 max-w-3xl text-sm text-ocean-400">
        Ranked each quarter on reviews (35%), Directions, Call and Website taps (30%), page views (15%), followers (10%) and
        owner posts and review replies (10%). A shop needs some real activity to qualify. The public sees tiers only: Top 25,
        Top 50 and Top 100. This quarter locks in on {lockDate}; then the winners get their badge and show up here with a
        reward checklist.
      </p>
      {view !== "live" && rows.length > 0 && "provisional" in rows[0] && (rows[0] as AwardRow).provisional && (
        <p className="mb-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-100">
          These are launch badges, issued from mid-quarter standings so shops wear them now. They are replaced by the final
          results when this quarter locks in, so hold off on sending rewards until then.
        </p>
      )}

      <div className="mb-4 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={t.key === "live" ? "/admin/top-shops" : `/admin/top-shops?q=${t.key}`}
            className={`rounded-full border px-3.5 py-1.5 text-sm ${
              view === t.key ? "border-amber-400/60 bg-amber-500/15 text-white" : "border-ocean-800/70 bg-ocean-900/40 text-ocean-300 hover:text-white"
            }`}
          >
            {t.label}
          </Link>
        ))}
        <Link href="/top-stores" className="ml-auto inline-flex items-center gap-1.5 text-sm text-ocean-300 hover:text-white">
          Public leaderboard <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      <p className="mb-3 text-xs text-ocean-500">
        {rows.length} shop{rows.length === 1 ? "" : "s"} qualified
        {rows.length < 100 ? `, so ${100 - rows.length} Top 100 spot${100 - rows.length === 1 ? " is" : "s are"} still open` : ""}.
      </p>

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-ocean-800/60 bg-ocean-950/40 px-4 py-6 text-center text-sm text-ocean-400">
          No shop has qualified yet.
        </p>
      ) : (
        <ul className="divide-y divide-ocean-800/60 overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-950/40">
          {rows.map((r) => {
            const s = shops.get(r.store_id);
            const tier = tierOf(r.rank);
            const award = "quarter" in r ? (r as AwardRow) : null;
            return (
              <li key={r.store_id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
                <span className="w-10 shrink-0 font-display text-xl text-white">#{r.rank}</span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    {s ? (
                      <Link href={`/stores/${s.slug}`} className="font-medium text-white hover:underline">
                        {s.name}
                      </Link>
                    ) : (
                      <span className="text-ocean-400">Shop removed</span>
                    )}
                    {tier && (
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase ${TIER_TONE[tier]}`}>
                        Top {tier}
                      </span>
                    )}
                    <span className="text-xs text-ocean-500">score {r.score}</span>
                  </p>
                  <p className="mt-0.5 text-xs text-ocean-400">
                    {r.reviews} review{r.reviews === 1 ? "" : "s"}
                    {r.rating ? ` (${r.rating.toFixed(1)}★)` : ""} · {r.actions} taps · {r.views} views · {r.followers} followers ·{" "}
                    {r.owner_activity} owner posts/replies
                  </p>
                  {award && s && (
                    <p className="mt-1 text-xs text-ocean-300">
                      {[s.address, s.city, s.state].filter(Boolean).join(", ") || "No address on file"}
                      {s.phone ? ` · ${s.phone}` : ""}
                      {emails.get(s.id) ? (
                        <>
                          {" · "}
                          <a href={`mailto:${emails.get(s.id)}`} className="text-ocean-200 underline hover:text-white">
                            {emails.get(s.id)}
                          </a>
                        </>
                      ) : null}
                      {s.claimed_by ? " · owner managed" : " · unclaimed"}
                    </p>
                  )}
                </div>
                {award && (
                  <RewardToggle quarter={award.quarter} storeId={award.store_id} sentAt={award.reward_sent_at} note={award.reward_note} />
                )}
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
