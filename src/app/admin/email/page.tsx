import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { readHealth, verdict, type EmailHealth } from "@/lib/email/health";
import EmailControls from "./EmailControls";
import RowActions from "./RowActions";
import SuppressionList from "./SuppressionList";

export const metadata: Metadata = { title: "Admin · Email" };
export const dynamic = "force-dynamic";

type Tab = "waiting" | "sent" | "failed" | "all";

const TABS: { key: Tab; label: string }[] = [
  { key: "waiting", label: "Waiting" },
  { key: "failed", label: "Failed" },
  { key: "sent", label: "Sent" },
  { key: "all", label: "Everything" },
];

const REASON: Record<string, string> = {
  address: "bad address",
  rate: "sending too fast",
  provider: "Resend problem",
  other: "something else",
};

const EVENT: Record<string, { label: string; tone: string }> = {
  delivered: { label: "Delivered", tone: "text-emerald-300" },
  opened: { label: "Opened", tone: "text-sky-300" },
  clicked: { label: "Clicked", tone: "text-sky-300" },
  bounced: { label: "Bounced", tone: "text-red-300" },
  complained: { label: "Marked as spam", tone: "text-red-300" },
  delivery_delayed: { label: "Delayed", tone: "text-amber-300" },
};

function when(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const mins = Math.round((Date.now() - d.getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 60 * 24) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleDateString();
}

function Stat({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string | number;
  hint?: string;
  tone?: "plain" | "good" | "bad" | "warn";
}) {
  const colour =
    tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-red-300" : tone === "warn" ? "text-amber-300" : "text-white";
  return (
    <div className="rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wider text-ocean-500">{label}</p>
      <p className={`mt-1 font-display text-2xl leading-none ${colour}`}>{value}</p>
      {hint && <p className="mt-1 text-[11px] text-ocean-500">{hint}</p>}
    </div>
  );
}

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const tab = (TABS.find((t) => t.key === sp.tab)?.key ?? "waiting") as Tab;
  const q = (sp.q ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const health = await readHealth();

  // The rows for whichever tab is open.
  let rowQuery = supabaseAdmin
    .from("email_queue")
    .select("id, kind, bulk, to_email, subject, status, attempts, last_error, fail_reason, scheduled_at, sent_at, created_at, direct")
    .order("created_at", { ascending: false })
    .limit(100);
  if (tab === "waiting") rowQuery = rowQuery.eq("status", "pending");
  if (tab === "sent") rowQuery = rowQuery.eq("status", "sent");
  if (tab === "failed") rowQuery = rowQuery.eq("status", "failed");
  if (q) rowQuery = rowQuery.ilike("to_email", `%${q.toLowerCase()}%`);

  const [{ data: rowData }, { data: eventData }, { data: suppData }] = await Promise.all([
    rowQuery,
    supabaseAdmin
      .from("email_events")
      .select("id, to_email, type, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(25),
    supabaseAdmin
      .from("email_suppressions")
      .select("email, reason, detail, created_at")
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  type Row = {
    id: string; kind: string; bulk: boolean; to_email: string; subject: string;
    status: string; attempts: number; last_error: string | null; fail_reason: string | null;
    scheduled_at: string; sent_at: string | null; created_at: string; direct: boolean;
  };
  const rows = (rowData ?? []) as Row[];
  const events = (eventData ?? []) as { id: string; to_email: string | null; type: string; detail: string | null; created_at: string }[];
  const suppressions = (suppData ?? []) as { email: string; reason: string; detail: string | null; created_at: string }[];

  if (!health.ok) {
    return (
      <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
        <div className="mx-auto max-w-4xl">
          <h1 className="font-display text-2xl text-white sm:text-3xl">Email</h1>
          <p className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 p-5 text-sm text-red-200">
            The health check couldn&apos;t run: {health.error}
            <br />
            That usually means the email tables haven&apos;t been created in this database yet.
          </p>
        </div>
      </main>
    );
  }

  const h: EmailHealth = health.health;
  const v = verdict(h);
  const delivered = h.delivered_7d + h.bounced_7d;
  const bouncePct = delivered > 0 ? (h.bounced_7d / delivered) * 100 : 0;
  const openPct = h.delivered_7d > 0 ? (h.opened_7d / h.delivered_7d) * 100 : 0;

  const bannerClass =
    v.tone === "bad"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : v.tone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : v.tone === "idle"
          ? "border-ocean-700/60 bg-ocean-800/40 text-ocean-100"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center gap-3">
          <Mail className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Email</h1>
        </div>
        <p className="mb-5 text-sm text-ocean-400">
          Every email the site sends passes through here first, including receipts and alerts. Nothing is sent
          anywhere else.
        </p>

        <p className={`mb-6 rounded-2xl border px-4 py-3 text-sm ${bannerClass}`}>{v.line}</p>

        {/* The numbers */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <Stat
            label="Sending"
            value={h.paused ? "Off" : "On"}
            tone={h.paused ? "warn" : "good"}
            hint={h.bulk_paused ? "bulk paused too" : "bulk allowed"}
          />
          <Stat label="Waiting" value={h.pending} hint={h.stuck > 0 ? `${h.stuck} over 30 min` : "queue is moving"} tone={h.stuck > 0 && !h.paused ? "bad" : "plain"} />
          <Stat label="Sent 24h" value={h.sent_24h} hint={h.ever_sent ? undefined : "nothing has ever sent"} tone={h.ever_sent ? "plain" : "warn"} />
          <Stat label="Failed" value={h.failed_open} hint={`${h.failed_24h} in 24h`} tone={h.failed_open > 0 ? "warn" : "plain"} />
          <Stat label="Delivered 7d" value={h.delivered_7d} hint="confirmed by Resend" />
          <Stat
            label="Bounced 7d"
            value={delivered > 0 ? `${bouncePct.toFixed(1)}%` : "—"}
            hint={`${h.bounced_7d} of ${delivered} · keep under 5%`}
            tone={bouncePct >= 5 ? "bad" : bouncePct >= 2 ? "warn" : "plain"}
          />
          <Stat
            label="Spam 7d"
            value={h.complained_7d}
            hint="keep at zero"
            tone={h.complained_7d > 0 ? "warn" : "plain"}
          />
          <Stat label="Opened 7d" value={h.delivered_7d > 0 ? `${openPct.toFixed(0)}%` : "—"} hint={`${h.opened_7d} opens`} />
          <Stat label="Bulk today" value={`${h.bulk_sent_today}/${h.daily_bulk_cap}`} hint="daily cap" />
          <Stat label="Do not email" value={h.suppressed} hint="bounced, complained, unsubscribed" />
        </div>

        <div className="mb-6">
          <EmailControls
            paused={h.paused}
            bulkPaused={h.bulk_paused}
            dailyBulkCap={h.daily_bulk_cap}
            myEmail={user?.email ?? ""}
          />
        </div>

        {/* The ledger */}
        <section className="mb-6 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
          <h2 className="mb-1 font-medium text-white">Every message</h2>
          <p className="mb-4 text-sm text-ocean-400">
            One row per email, whether it went out, is waiting, or gave up. The newest 100 are shown.
          </p>

          <div className="mb-4 flex flex-wrap items-center gap-2">
            {TABS.map((t) => (
              <Link
                key={t.key}
                href={`/admin/email?tab=${t.key}${q ? `&q=${encodeURIComponent(q)}` : ""}`}
                className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${
                  tab === t.key
                    ? "border-amber-400/60 bg-amber-500/15 text-white"
                    : "border-ocean-800/70 bg-ocean-950/40 text-ocean-300 hover:text-white"
                }`}
              >
                {t.label}
              </Link>
            ))}
            <form action="/admin/email" className="ml-auto flex gap-2">
              <input type="hidden" name="tab" value={tab} />
              <input
                name="q"
                defaultValue={q}
                placeholder="find an address"
                className="w-44 rounded-lg border border-ocean-800 bg-ocean-950 px-3 py-1.5 text-sm text-white placeholder:text-ocean-600"
              />
              <button type="submit" className="rounded-lg border border-ocean-700 px-3 py-1.5 text-sm text-ocean-200 hover:text-white">
                Search
              </button>
            </form>
          </div>

          {rows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ocean-800/60 p-8 text-center text-sm text-ocean-500">
              {q ? `Nothing for "${q}".` : "Nothing here."}
            </p>
          ) : (
            <ul className="divide-y divide-ocean-800/50">
              {rows.map((r) => (
                <li key={r.id} className="flex items-start justify-between gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-sm font-medium text-white">{r.subject}</span>
                      {r.bulk && (
                        <span className="rounded-full border border-ocean-700 px-1.5 text-[10px] uppercase tracking-wider text-ocean-400">
                          bulk
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-ocean-400">
                      {r.to_email} · {r.kind}
                    </span>
                    <span className="mt-0.5 block text-xs text-ocean-500">
                      {r.status === "sent" && `Sent ${when(r.sent_at)}`}
                      {r.status === "pending" &&
                        (new Date(r.scheduled_at) > new Date()
                          ? `Waiting until ${new Date(r.scheduled_at).toLocaleString()}`
                          : `Waiting · queued ${when(r.created_at)}`)}
                      {r.status === "failed" &&
                        `Gave up after ${r.attempts} ${r.attempts === 1 ? "try" : "tries"} · ${
                          REASON[r.fail_reason ?? "other"] ?? r.fail_reason
                        }`}
                    </span>
                    {r.status === "failed" && r.last_error && (
                      <span className="mt-1 block truncate text-xs text-red-300/80">{r.last_error}</span>
                    )}
                  </span>
                  <span className="shrink-0 pt-0.5">
                    <RowActions id={r.id} status={r.status} />
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* What happened after we handed it over */}
        <section className="mb-6 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
          <h2 className="mb-1 font-medium text-white">What mailboxes did with it</h2>
          <p className="mb-4 text-sm text-ocean-400">
            Sent by us isn&apos;t the same as landed with them. Resend tells us the rest, and it shows up here.
          </p>
          {events.length === 0 ? (
            <p className="rounded-xl border border-dashed border-ocean-800/60 p-6 text-center text-sm text-ocean-500">
              Nothing yet. This fills in once the Resend webhook is pointed at the site.
            </p>
          ) : (
            <ul className="divide-y divide-ocean-800/50">
              {events.map((e) => {
                const meta = EVENT[e.type] ?? { label: e.type, tone: "text-ocean-300" };
                return (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2">
                    <span className="min-w-0">
                      <span className={`text-sm ${meta.tone}`}>{meta.label}</span>
                      <span className="ml-2 text-xs text-ocean-400">{e.to_email}</span>
                      {e.detail && <span className="block truncate text-[11px] text-ocean-500">{e.detail}</span>}
                    </span>
                    <span className="shrink-0 text-xs text-ocean-500">{when(e.created_at)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <SuppressionList rows={suppressions} total={h.suppressed} />

        <p className="mt-6 text-xs text-ocean-600">
          Checked {new Date(h.checked_at).toLocaleString()}. The worker runs every two minutes and the health
          check writes to you every six hours, but only when something is actually wrong.
        </p>
      </div>
    </main>
  );
}
