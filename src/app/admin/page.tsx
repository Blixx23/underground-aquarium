import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck, ArrowRight, Mail, CheckCircle2 } from "lucide-react";
import { ADMIN_SECTIONS } from "@/lib/admin/sections";
import { queueStatus } from "@/lib/admin/pending";
import { readHealth, verdict } from "@/lib/email/health";
import SectionTabs from "@/components/admin/SectionTabs";

export const metadata: Metadata = { title: "Admin" };
export const dynamic = "force-dynamic";

/**
 * The admin dashboard shows only what's waiting. Every page is in the menu,
 * so there's no point listing them twice. Queues come from
 * lib/admin/sections.ts.
 */
function age(hours: number | null): string {
  if (hours === null) return "";
  if (hours < 1) return "under an hour";
  if (hours < 48) return `${hours} hour${hours === 1 ? "" : "s"}`;
  return `${Math.round(hours / 24)} days`;
}

export default async function AdminHubPage() {
  const [queues, health] = await Promise.all([queueStatus(true), readHealth()]);

  const waiting = queues.filter((q) => q.count > 0).sort((a, b) => (b.oldestHours ?? 0) - (a.oldestHours ?? 0));
  const total = waiting.reduce((sum, q) => sum + q.count, 0);
  const iconFor = (section: string) => ADMIN_SECTIONS.find((s) => s.href === section)?.Icon ?? ShieldCheck;

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
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-3">
          <ShieldCheck className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Dashboard</h1>
        </div>
        <p className="mb-6 text-ocean-400">
          {total > 0 ? `${total} thing${total === 1 ? "" : "s"} waiting on you, oldest first.` : "Everything's caught up."}
        </p>
        <SectionTabs current="/admin" />

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

        {waiting.length === 0 ? (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-5 text-emerald-100">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            Nothing is waiting. Every queue is empty.
          </div>
        ) : (
          <ul className="space-y-2">
            {waiting.map((q) => {
              const Icon = iconFor(q.section);
              return (
                <li key={`${q.href}-${q.label}`}>
                  <Link
                    href={q.href}
                    className="group flex items-center gap-3 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-4 transition-colors hover:bg-ocean-800/50"
                  >
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-400 text-ocean-950">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-white">{q.label}</span>
                      <span className="block text-sm text-ocean-400">
                        {q.count} waiting{q.oldestHours !== null ? `, oldest ${age(q.oldestHours)}` : ""}
                      </span>
                    </span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-ocean-600 transition-transform group-hover:translate-x-1" />
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
