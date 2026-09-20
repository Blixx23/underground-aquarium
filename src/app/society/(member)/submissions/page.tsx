import type { Metadata } from "next";
import Link from "next/link";
import { FileStack, Plus, Clock, Check, X } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { SOC_EYEBROW, SOC_BTN_PRIMARY } from "@/lib/society/theme";

export const metadata: Metadata = { title: "My submissions" };

export const dynamic = "force-dynamic";

const STATUS = {
  approved: { label: "Approved", Icon: Check, cls: "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" },
  pending: { label: "In review", Icon: Clock, cls: "border-amber-500/40 bg-amber-500/10 text-amber-300" },
  rejected: { label: "Rejected", Icon: X, cls: "border-coral-500/40 bg-coral-500/10 text-coral-300" },
} as const;

type Submission = {
  id: string;
  program: string;
  species_name: string | null;
  status: string;
  points: number | null;
  event_date: string | null;
  created_at: string;
};

export default async function SubmissionsPage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("club_award_submissions")
    .select("id, program, species_name, status, points, event_date, created_at")
    .eq("club_id", ctx.society!.id)
    .eq("user_id", ctx.userId)
    .order("created_at", { ascending: false });

  const rows = ((data ?? []) as unknown as Submission[]) ?? [];
  const submitHref = "/society/breeder/new";
  const programLabel = (code: string) =>
    ({ bap: "Breeder Award Program", hap: "Horticultural" } as Record<string, string>)[code.toLowerCase()] ?? code.toUpperCase();

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Breeder Award Program</p>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-white sm:text-3xl">
          My submissions
        </h1>
        <Link href={submitHref} className={`${SOC_BTN_PRIMARY} px-6`}>
          <Plus className="h-4 w-4" />
          New entry
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 py-16 text-center">
          <FileStack className="mx-auto mb-4 h-9 w-9 text-ocean-700" />
          <p className="mb-1 text-lg text-ocean-200">Nothing submitted yet</p>
          <p className="mx-auto mb-6 max-w-sm text-sm text-ocean-500">
            Every species in the registry is unclaimed right now. The first
            member to log an approved spawn holds that record permanently.
          </p>
          <Link href="/society/breeder" className={`${SOC_BTN_PRIMARY} px-6`}>
            Pick a species
          </Link>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const s =
              STATUS[r.status as keyof typeof STATUS] ?? STATUS.pending;
            return (
              <li
                key={r.id}
                className="flex flex-wrap items-center gap-4 rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white">
                    {r.species_name || "Unnamed entry"}
                  </span>
                  <span className="block font-mono text-[10px] uppercase tracking-wider text-ocean-600">
                    {programLabel(r.program)}
                    {r.event_date &&
                      ` · ${new Date(
                        r.event_date + "T00:00:00"
                      ).toLocaleDateString()}`}
                  </span>
                </span>

                {r.status === "approved" && r.points ? (
                  <span className="shrink-0 font-display text-lg text-amber-300">
                    +{r.points}
                  </span>
                ) : null}

                <span
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium ${s.cls}`}
                >
                  <s.Icon className="h-3 w-3" />
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
