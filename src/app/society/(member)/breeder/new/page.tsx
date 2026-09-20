import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { SOC_EYEBROW } from "@/lib/society/theme";
import OpenLogForm from "@/components/society/OpenLogForm";
import type { AwardSpecies } from "@/components/society/SpeciesBrowser";

export const metadata: Metadata = { title: "Open a spawn log" };

export const dynamic = "force-dynamic";

export default async function NewSpawnLogPage({
  searchParams,
}: {
  searchParams: Promise<{ species?: string }>;
}) {
  const sp = await searchParams;
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const { data } = await supabase
    .from("club_award_species")
    .select("id, program, common_name, scientific_name, category, points")
    .eq("club_id", ctx.society!.id)
    .eq("program", "bap")
    .eq("is_active", true);

  return (
    <div>
      <Link
        href="/society/breeder"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ocean-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Breeder Program
      </Link>

      <p className={`${SOC_EYEBROW} mb-3`}>New entry</p>
      <h1 className="mb-3 font-display text-2xl text-white sm:text-3xl">
        Open a spawn log
      </h1>
      <p className="mb-8 max-w-xl text-sm leading-relaxed text-ocean-400">
        A log is opened before the spawn, not after it. That&apos;s the rule
        that makes the record worth something — nothing here can be
        reconstructed later.
      </p>

      <OpenLogForm
        clubId={ctx.society!.id}
        species={((data ?? []) as unknown as AwardSpecies[]) ?? []}
        initialSpeciesId={sp.species}
      />
    </div>
  );
}
