import type { Metadata } from "next";
import Link from "next/link";
import { Activity, UserPlus, Users, MailCheck, MailWarning } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import DayBars from "@/components/stats/DayBars";

export const metadata: Metadata = { title: "Admin · Site stats" };
export const dynamic = "force-dynamic";

type Member = {
  id: string;
  email: string | null;
  created_at: string;
  confirmed: boolean;
  last_sign_in_at: string | null;
};

const DAY = 86_400_000;

/** Pacific calendar day, so "today" means your today. */
function pacificDay(iso: string | Date): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Los_Angeles" }).format(new Date(iso));
}

function ago(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  const d = Math.floor(s / 86400);
  if (d < 14) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

async function allMembers(): Promise<Member[]> {
  const out: Member[] = [];
  for (let page = 1; page <= 50; page++) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) break;
    const users = data?.users ?? [];
    for (const u of users) {
      out.push({
        id: u.id,
        email: u.email ?? null,
        created_at: u.created_at,
        confirmed: Boolean(u.email_confirmed_at),
        last_sign_in_at: u.last_sign_in_at ?? null,
      });
    }
    if (users.length < 1000) break;
  }
  return out;
}

function Tile({ label, value, sub, Icon }: { label: string; value: string; sub?: string; Icon: typeof Users }) {
  return (
    <div className="rounded-2xl border border-ocean-800/60 bg-ocean-950/40 p-4">
      <p className="flex items-center gap-1.5 text-xs uppercase tracking-wider text-ocean-400">
        <Icon className="h-3.5 w-3.5" /> {label}
      </p>
      <p className="mt-1 font-display text-3xl text-white">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-ocean-500">{sub}</p>}
    </div>
  );
}

/**
 * The whole site at a glance, starting with the people: who's joining,
 * how fast, and who the newest members are.
 */
export default async function SiteStatsPage() {
  const members = await allMembers();
  const now = Date.now();
  const today = pacificDay(new Date());

  const within = (days: number) => members.filter((m) => now - new Date(m.created_at).getTime() < days * DAY).length;
  const joinedToday = members.filter((m) => pacificDay(m.created_at) === today).length;
  const week = within(7);
  const prevWeek = within(14) - week;
  const month = within(30);
  const unconfirmed = members.filter((m) => !m.confirmed && now - new Date(m.created_at).getTime() < 30 * DAY).length;
  const active7 = members.filter((m) => m.last_sign_in_at && now - new Date(m.last_sign_in_at).getTime() < 7 * DAY).length;

  // Sign-ups per day for the last 30 days (Pacific).
  const counts = new Map<string, number>();
  for (const m of members) counts.set(pacificDay(m.created_at), (counts.get(pacificDay(m.created_at)) ?? 0) + 1);
  const points = Array.from({ length: 30 }, (_, i) => {
    const day = pacificDay(new Date(now - (29 - i) * DAY));
    return { day, value: counts.get(day) ?? 0 };
  });

  // The newest members, with their profile names.
  const newest = [...members].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 25);
  const { data: profs } = newest.length
    ? await supabaseAdmin.from("profiles").select("id, username, full_name").in("id", newest.map((m) => m.id))
    : { data: [] };
  const byId = new Map(((profs ?? []) as { id: string; username: string | null; full_name: string | null }[]).map((p) => [p.id, p]));

  const trend =
    prevWeek > 0
      ? `${week >= prevWeek ? "▲" : "▼"} ${Math.abs(Math.round(((week - prevWeek) / prevWeek) * 100))}% vs the week before`
      : week > 0
        ? "up from none the week before"
        : "none the week before either";

  return (
    <main>
      <div>
        <h1 className="mb-1 flex items-center gap-3 font-display text-3xl text-white">
          <Activity className="h-7 w-7 text-amber-300" /> Site stats
        </h1>
        <p className="mb-6 text-sm text-ocean-400">Who&apos;s joining Underground Aquarium. Days are Pacific time.</p>

        <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Tile label="Today" value={joinedToday.toLocaleString()} sub="new sign-ups" Icon={UserPlus} />
          <Tile label="Last 7 days" value={week.toLocaleString()} sub={trend} Icon={UserPlus} />
          <Tile label="Last 30 days" value={month.toLocaleString()} sub={`${unconfirmed} haven't confirmed their email`} Icon={UserPlus} />
          <Tile label="All members" value={members.length.toLocaleString()} sub={`${active7.toLocaleString()} signed in this week`} Icon={Users} />
        </div>

        <section className="mb-8 rounded-2xl border border-ocean-800/60 bg-ocean-950/40 p-4">
          <h2 className="mb-3 text-sm font-medium text-white">New sign-ups, last 30 days</h2>
          <DayBars points={points} unit="sign-ups" />
        </section>

        <section>
          <h2 className="mb-3 text-sm font-medium text-white">Newest members</h2>
          {newest.length === 0 ? (
            <p className="text-sm text-ocean-400">No members yet.</p>
          ) : (
            <ul className="divide-y divide-ocean-800/60 overflow-hidden rounded-2xl border border-ocean-800/60 bg-ocean-950/40">
              {newest.map((m) => {
                const p = byId.get(m.id);
                const name = p?.full_name || (p?.username ? `@${p.username}` : "No profile yet");
                return (
                  <li key={m.id} className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-white">
                        {p?.username ? (
                          <Link href={`/u/${p.username}`} className="underline decoration-ocean-600 hover:decoration-white">
                            {name}
                          </Link>
                        ) : (
                          name
                        )}
                        {p?.username && p.full_name && <span className="ml-2 text-xs text-ocean-500">@{p.username}</span>}
                      </p>
                      {m.email && (
                        <a href={`mailto:${m.email}`} className="block truncate text-xs text-ocean-400 hover:text-white">
                          {m.email}
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs">
                      <span
                        className={`inline-flex items-center gap-1 ${m.confirmed ? "text-emerald-300" : "text-amber-300"}`}
                        title={m.confirmed ? "Email confirmed" : "Hasn't clicked the confirmation email yet"}
                      >
                        {m.confirmed ? <MailCheck className="h-3.5 w-3.5" /> : <MailWarning className="h-3.5 w-3.5" />}
                        {m.confirmed ? "Confirmed" : "Not confirmed"}
                      </span>
                      <span className="text-ocean-400">Joined {ago(m.created_at)}</span>
                    </div>
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
