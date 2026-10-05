import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import SectionTabs from "@/components/admin/SectionTabs";
import RenewalsTable from "./RenewalsTable";
import { todayLA, type Renewal } from "@/lib/admin/renewals";

export const metadata: Metadata = { title: "Admin · Renewals" };
export const dynamic = "force-dynamic";

/**
 * Everything that expires, in one table. The admin layout already checks
 * the visitor is an admin. Anything inside its warning window also shows on
 * the Dashboard and in the AI team's morning brief.
 */
export default async function RenewalsPage() {
  const { data, error } = await supabaseAdmin
    .from("renewals")
    .select("*")
    .order("expires_on", { ascending: true, nullsFirst: false });

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-2 flex items-center gap-3">
          <CalendarClock className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Renewals</h1>
        </div>
        <p className="mb-6 text-ocean-400">
          Domains, the DMCA agent, subscriptions and anything else that expires. Rows show on the Dashboard once
          they&apos;re inside their warning window.
        </p>
        <SectionTabs current="/admin/renewals" />

        {error ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            Couldn&apos;t load renewals: {error.message}. If it says the table doesn&apos;t exist, run{" "}
            <span className="font-mono">step68_renewals.sql</span> in the Supabase SQL Editor.
          </div>
        ) : (
          <RenewalsTable rows={(data ?? []) as Renewal[]} today={todayLA()} />
        )}
      </div>
    </main>
  );
}
