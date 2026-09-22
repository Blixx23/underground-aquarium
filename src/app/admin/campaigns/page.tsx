import type { Metadata } from "next";
import Link from "next/link";
import { Megaphone, ArrowRight } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readHealth } from "@/lib/email/health";

export const metadata: Metadata = { title: "Admin · Campaigns" };
export const dynamic = "force-dynamic";

type Campaign = { key: string; name: string; description: string | null; audience: string; active: boolean };
type Stats = { active: number; done: number; stopped: number; stopped_claimed: number; emails_sent: number; due_now: number; eligible: number };

const AUDIENCE: Record<string, string> = {
  unclaimed_shops: "Every shop in the directory nobody has claimed",
};

export default async function CampaignsPage() {
  const { data } = await supabaseAdmin
    .from("email_campaigns")
    .select("key, name, description, audience, active")
    .order("name", { ascending: true });
  const campaigns = (data ?? []) as Campaign[];

  const stats = new Map<string, Stats>();
  for (const c of campaigns) {
    const { data: s } = await supabaseAdmin.rpc("campaign_stats", { p_key: c.key });
    if (s) stats.set(c.key, s as unknown as Stats);
  }

  const health = await readHealth();
  const paused = health.ok ? health.health.paused || health.health.bulk_paused : true;

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Campaigns</h1>
        </div>
        <p className="mb-6 text-sm text-ocean-400">
          A campaign is a sequence of emails with a rule about who gets it. Everything it sends goes through the
          same queue as the rest of the site, so the pause switch and the daily cap still apply.
        </p>

        {paused && (
          <p className="mb-6 rounded-2xl border border-ocean-700/60 bg-ocean-800/40 px-4 py-3 text-sm text-ocean-200">
            Bulk email is paused right now, so nothing here will actually go out. Campaigns can still be turned on
            and edited. <Link href="/admin/email" className="text-amber-300 underline">Open the email panel</Link> when
            you&apos;re ready.
          </p>
        )}

        {campaigns.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-ocean-800/60 p-10 text-center text-ocean-400">
            No campaigns yet.
          </p>
        ) : (
          <ul className="space-y-3">
            {campaigns.map((c) => {
              const s = stats.get(c.key);
              return (
                <li key={c.key}>
                  <Link
                    href={`/admin/campaigns/${c.key}`}
                    className="group flex items-start gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 transition-colors hover:bg-ocean-800/50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-medium text-white">{c.name}</span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                            c.active
                              ? "bg-emerald-500/15 text-emerald-300"
                              : "bg-ocean-800 text-ocean-400"
                          }`}
                        >
                          {c.active ? "On" : "Off"}
                        </span>
                      </span>
                      <span className="mt-1 block text-sm text-ocean-400">{c.description}</span>
                      <span className="mt-2 block text-xs text-ocean-500">
                        {AUDIENCE[c.audience] ?? c.audience}
                      </span>
                      {s && (
                        <span className="mt-2 block text-xs text-ocean-400">
                          {s.active} in the sequence · {s.emails_sent} emails sent · {s.stopped_claimed} claimed
                          their shop · {s.eligible} shops eligible
                        </span>
                      )}
                    </span>
                    <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ocean-600 transition-transform group-hover:translate-x-1" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
