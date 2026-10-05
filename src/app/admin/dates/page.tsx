import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { supabaseAdmin } from "@/lib/supabase/admin";
import SectionTabs from "@/components/admin/SectionTabs";
import KeyDatesBoard from "./KeyDatesBoard";
import { todayLA, type KeyDate } from "@/lib/admin/keyDates";

export const metadata: Metadata = { title: "Admin · Key dates" };
export const dynamic = "force-dynamic";

/**
 * Renewals and deadlines that can't be missed. The admin layout already
 * checks the visitor is an admin. Anything inside its reminder window also
 * shows on the Dashboard and in the AI team's morning brief.
 */
export default async function KeyDatesPage() {
  const { data, error } = await supabaseAdmin
    .from("important_dates")
    .select("*")
    .order("due_on", { ascending: true });

  return (
    <main className="min-h-screen px-4 pb-20 pt-28 sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center gap-3">
          <CalendarClock className="h-6 w-6 text-amber-300" />
          <h1 className="font-display text-2xl text-white sm:text-3xl">Key dates</h1>
        </div>
        <p className="mb-6 text-ocean-400">
          Renewals and deadlines you can&apos;t miss. Each one shows on the Dashboard once it&apos;s inside its
          reminder window.
        </p>
        <SectionTabs current="/admin/dates" />

        {error ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm text-amber-100">
            Couldn&apos;t load key dates: {error.message}. If it says the table doesn&apos;t exist, run{" "}
            <span className="font-mono">step68_key_dates.sql</span> in the Supabase SQL Editor.
          </div>
        ) : (
          <KeyDatesBoard initial={(data ?? []) as KeyDate[]} today={todayLA()} />
        )}
      </div>
    </main>
  );
}
