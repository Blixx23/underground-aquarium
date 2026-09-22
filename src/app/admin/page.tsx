import type { Metadata } from "next";
import Link from "next/link";
import {
  ShieldCheck, Users, ArrowRight, GraduationCap, Fish, Flag, Droplets,
  BookOpen, Store, Wrench, Mail, Megaphone, MessageSquare,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SOCIETY_NAME, SOCIETY_CLUB_PATH } from "@/lib/config";
import { adminPending } from "@/lib/admin/pending";
import { readHealth, verdict } from "@/lib/email/health";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

type Card = { href: string; label: string; description: string; Icon: LucideIcon; countable?: boolean };

const CARDS: Card[] = [
  { href: "/admin/email", label: "Email", description: "Queue, delivery and health for everything we send", Icon: Mail, countable: true },
  { href: "/admin/campaigns", label: "Campaigns", description: "Email sequences and the shops walking through them", Icon: Megaphone },
  { href: `${SOCIETY_CLUB_PATH}/admin`, label: "Society", description: `Roster, dues, officers and applications for ${SOCIETY_NAME}`, Icon: Users, countable: true },
  { href: "/admin/stores", label: "Store claims", description: "Shop owners asking to manage their listing", Icon: Store, countable: true },
  { href: "/admin/store-fixes", label: "Shop fixes", description: "Wrong hours, moved or closed shops, flagged by shoppers", Icon: Wrench, countable: true },
  { href: "/admin/reports", label: "Reports", description: "Posts and members flagged by the community", Icon: Flag, countable: true },
  { href: "/admin/species", label: "Species", description: "Fish and animals the community suggested", Icon: Fish, countable: true },
  { href: "/admin/glossary", label: "Glossary", description: "Terms waiting to be approved", Icon: BookOpen, countable: true },
  { href: "/admin/courses", label: "Courses", description: "Lessons, quizzes and drafts still to publish", Icon: GraduationCap, countable: true },
  { href: "/admin/feedback", label: "Feedback", description: "What members have written in about", Icon: MessageSquare, countable: true },
  { href: "/admin/bubbles", label: "Bubbles", description: "Award or deduct member bubbles", Icon: Droplets },
];

export default async function AdminHubPage() {
  const [pending, health] = await Promise.all([adminPending(), readHealth()]);

  const waiting = CARDS.filter((c) => c.countable).reduce((sum, c) => sum + (pending[c.href] ?? 0), 0);

  const v = health.ok ? verdict(health.health) : null;
  const emailLine = health.ok ? v!.line : `The email health check couldn't run: ${health.error}`;
  const emailTone = health.ok ? v!.tone : "bad";
  const emailClass =
    emailTone === "bad"
      ? "border-red-500/30 bg-red-500/10 text-red-100"
      : emailTone === "warn"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-100"
        : emailTone === "idle"
          ? "border-ocean-700/60 bg-ocean-800/40 text-ocean-200"
          : "border-emerald-500/30 bg-emerald-500/10 text-emerald-100";

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-4xl">
        <div className="mb-2 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Dashboard</h1>
        </div>
        <p className="mb-6 text-ocean-400">
          {waiting > 0
            ? `${waiting} thing${waiting === 1 ? "" : "s"} waiting on you.`
            : "Everything's caught up."}
        </p>

        {/* Email gets its own line at the top, because silence from an email
            system is indistinguishable from it working. */}
        <Link
          href="/admin/email"
          className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 text-sm transition-colors hover:brightness-110 ${emailClass}`}
        >
          <Mail className="mt-0.5 h-4 w-4 shrink-0" />
          <span className="min-w-0 flex-1">{emailLine}</span>
          <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 opacity-60" />
        </Link>

        <div className="grid gap-3 sm:grid-cols-2">
          {CARDS.map((c) => {
            const n = pending[c.href] ?? 0;
            return (
              <Link
                key={c.href}
                href={c.href}
                className="group flex items-start gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 transition-colors hover:bg-ocean-800/50"
              >
                <span
                  className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${
                    n > 0 ? "bg-amber-400 text-ocean-950" : "bg-ocean-800/70 text-ocean-300"
                  }`}
                >
                  <c.Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <span className="font-medium text-white">{c.label}</span>
                    {c.countable && n > 0 && (
                      <span className="rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                        {n} waiting
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 block text-sm text-ocean-400">{c.description}</span>
                </span>
                <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-ocean-600 transition-transform group-hover:translate-x-1" />
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
