import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Megaphone } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { getCampaign, type Step } from "@/lib/campaigns/planner";
import { PLACEHOLDERS, varsForStore } from "@/lib/campaigns/render";
import { readHealth } from "@/lib/email/health";
import CampaignControls from "./CampaignControls";
import StepEditor from "./StepEditor";
import StopEnrollment from "./StopEnrollment";

export const metadata: Metadata = { title: "Admin · Campaign" };
export const dynamic = "force-dynamic";

type Stats = { active: number; done: number; stopped: number; stopped_claimed: number; emails_sent: number; due_now: number; eligible: number };

const AUDIENCE: Record<string, string> = {
  unclaimed_shops:
    "Every shop in the directory with an email address that nobody has claimed. Shops are added automatically as they land in the directory, and drop out the moment they claim their page, unsubscribe or bounce.",
};

const STOP: Record<string, string> = {
  claimed: "claimed their page",
  unsubscribed: "unsubscribed",
  removed: "asked to be removed",
  manual: "stopped by you",
};

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ocean-500">{label}</p>
      <p className="mt-1 font-display text-2xl leading-none text-white">{value}</p>
    </div>
  );
}

export default async function CampaignPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params;
  const campaign = await getCampaign(key);
  if (!campaign) notFound();

  const [{ data: stepData }, { data: statData }, { data: enrolData }, health] = await Promise.all([
    supabaseAdmin
      .from("email_campaign_steps")
      .select("id, campaign_id, step, delay_days, subject, body, cta_label, cta_url, active")
      .eq("campaign_id", campaign.id)
      .order("step", { ascending: true }),
    supabaseAdmin.rpc("campaign_stats", { p_key: key }),
    supabaseAdmin
      .from("email_campaign_enrollments")
      .select("id, email, status, stop_reason, next_step, next_send_at, sent_count, store_id")
      .eq("campaign_id", campaign.id)
      .order("last_sent_at", { ascending: false, nullsFirst: false })
      .limit(25),
    readHealth(),
  ]);

  const steps = (stepData ?? []) as Step[];
  const stats = (statData ?? null) as Stats | null;
  const enrollments = (enrolData ?? []) as {
    id: string; email: string; status: string; stop_reason: string | null;
    next_step: number; next_send_at: string; sent_count: number; store_id: string | null;
  }[];

  // Preview against a real shop, so nothing here is invented.
  const { data: previewRow } = await supabaseAdmin
    .from("fish_stores")
    .select("id, slug, name, city, state")
    .is("claimed_by", null)
    .not("slug", "is", null)
    .order("name", { ascending: true })
    .limit(1)
    .maybeSingle();
  const preview = previewRow as { id: string; slug: string; name: string; city: string | null; state: string | null } | null;
  const vars = preview ? (varsForStore(preview) as unknown as Record<string, string>) : {};

  const storeIds = [...new Set(enrollments.map((e) => e.store_id).filter(Boolean))] as string[];
  const { data: storeRows } = storeIds.length
    ? await supabaseAdmin.from("fish_stores").select("id, name, slug").in("id", storeIds)
    : { data: [] };
  const storeById = new Map(((storeRows ?? []) as { id: string; name: string; slug: string }[]).map((s) => [s.id, s]));

  const bulkPaused = health.ok ? health.health.paused || health.health.bulk_paused : true;
  const cap = health.ok ? health.health.daily_bulk_cap : 0;
  const lastStepNumber = steps.length ? Math.max(...steps.map((s) => s.step)) : 0;

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <Link href="/admin/campaigns" className="mb-6 inline-flex items-center gap-2 text-sm text-ocean-400 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Campaigns
        </Link>

        <div className="mb-2 flex items-center gap-3">
          <Megaphone className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">{campaign.name}</h1>
          <span
            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
              campaign.active ? "bg-emerald-500/15 text-emerald-300" : "bg-ocean-800 text-ocean-400"
            }`}
          >
            {campaign.active ? "On" : "Off"}
          </span>
        </div>
        <p className="mb-5 text-sm text-ocean-400">{AUDIENCE[campaign.audience] ?? campaign.description}</p>

        {bulkPaused && (
          <p className="mb-5 rounded-2xl border border-ocean-700/60 bg-ocean-800/40 px-4 py-3 text-sm text-ocean-200">
            Bulk email is paused, so this queues but never leaves. That is the safe way to test it: turn the campaign
            on, press Run it now, and read what lands in the queue on the{" "}
            <Link href="/admin/email" className="text-amber-300 underline">email panel</Link>.
          </p>
        )}

        {stats && (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            <Stat label="In the sequence" value={stats.active} />
            <Stat label="Due now" value={stats.due_now} />
            <Stat label="Emails sent" value={stats.emails_sent} />
            <Stat label="Finished" value={stats.done} />
            <Stat label="Claimed their shop" value={stats.stopped_claimed} />
            <Stat label="Dropped out" value={stats.stopped} />
            <Stat label="Shops eligible" value={stats.eligible} />
            <Stat label="Sends per day" value={cap} />
          </div>
        )}

        <div className="mb-8">
          <CampaignControls campaignKey={campaign.key} active={campaign.active} />
        </div>

        {/* The sequence */}
        <h2 className="mb-1 font-medium text-white">The emails</h2>
        <p className="mb-4 text-sm text-ocean-400">
          Edits save straight to the database and take effect on the next run. Nobody is ever sent the same step
          twice, so fixing a typo now will not re-send an email that already went out.
        </p>

        <div className="mb-4 rounded-xl border border-ocean-800/60 bg-ocean-950/40 p-4">
          <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ocean-500">
            Things you can drop into the subject or the body
          </p>
          <ul className="space-y-1">
            {PLACEHOLDERS.map((p) => (
              <li key={p.token} className="text-xs text-ocean-400">
                <code className="rounded bg-ocean-900 px-1.5 py-0.5 font-mono text-ocean-200">{p.token}</code> ={" "}
                {p.means}
              </li>
            ))}
          </ul>
        </div>

        {preview ? (
          <ul className="space-y-4">
            {steps.map((s) => (
              <StepEditor
                key={s.id}
                data={{
                  id: s.id,
                  step: s.step,
                  delay_days: s.delay_days,
                  subject: s.subject,
                  body: s.body,
                  cta_label: s.cta_label,
                  cta_url: s.cta_url,
                  active: s.active,
                }}
                vars={vars}
                shopName={preview.name}
                isLast={s.step === lastStepNumber}
              />
            ))}
          </ul>
        ) : (
          <p className="rounded-2xl border border-dashed border-ocean-800/60 p-8 text-center text-sm text-ocean-500">
            There are no unclaimed shops to preview against yet.
          </p>
        )}

        {/* Who is in it */}
        <section className="mt-8 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
          <h2 className="mb-1 font-medium text-white">Who is in it</h2>
          <p className="mb-4 text-sm text-ocean-400">The 25 most recently contacted.</p>
          {enrollments.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ocean-800/60 p-6 text-center text-sm text-ocean-500">
              Nobody yet. Press Run it now to add shops.
            </p>
          ) : (
            <ul className="divide-y divide-ocean-800/50">
              {enrollments.map((e) => {
                const store = e.store_id ? storeById.get(e.store_id) : undefined;
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate text-sm text-white">
                        {store ? (
                          <Link href={`/stores/${store.slug}`} className="hover:underline">
                            {store.name}
                          </Link>
                        ) : (
                          e.email
                        )}
                      </span>
                      <span className="block truncate text-xs text-ocean-500">
                        {e.email} · {e.sent_count} sent ·{" "}
                        {e.status === "active"
                          ? `email ${e.next_step} on ${new Date(e.next_send_at).toLocaleDateString()}`
                          : e.status === "done"
                            ? "finished the sequence"
                            : STOP[e.stop_reason ?? ""] ?? "stopped"}
                      </span>
                    </span>
                    {e.status === "active" && <StopEnrollment id={e.id} />}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
