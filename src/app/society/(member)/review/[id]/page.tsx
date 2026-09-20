import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, KeySquare, Check, AlertTriangle, Minus } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { SOC_EYEBROW } from "@/lib/society/theme";
import ReviewForm from "@/components/society/ReviewForm";

export const metadata: Metadata = { title: "Review" };

export const dynamic = "force-dynamic";

type Packet = {
  review: { id: string; status: string; vote: string | null; reason: string | null; due_at: string };
  log: {
    species_name: string;
    scientific_name: string | null;
    points: number | null;
    challenge_code: string;
    tank_note: string | null;
    opened_at: string;
    submitted_at: string | null;
  };
  stages: {
    stage: number;
    name: string;
    proves: string;
    requires_code: boolean;
    photos: string[];
    note: string | null;
    logged_at: string;
    meta_present: boolean | null;
    meta_time_ok: boolean | null;
    meta_region_ok: boolean | null;
  }[];
};

/** A metadata flag. Null means we couldn't tell, which is not the same as failed. */
function Flag({ label, value }: { label: string; value: boolean | null }) {
  const Icon = value === true ? Check : value === false ? AlertTriangle : Minus;
  const cls =
    value === true ? "text-emerald-300" : value === false ? "text-coral-300" : "text-ocean-600";
  return (
    <span className={`inline-flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider ${cls}`}>
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await getSocietyContext();
  const supabase = await createClient();

  const { data, error } = await supabase.rpc("review_packet", { p_review_id: id });
  if (error || !data) notFound();
  const pkt = data as Packet;

  const { data: settings } = await supabase
    .from("society_review_settings")
    .select("min_reason_length")
    .eq("club_id", ctx.society!.id)
    .maybeSingle();

  const pending = pkt.review.status === "pending";

  return (
    <div>
      <Link
        href="/society/review"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-ocean-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Review queue
      </Link>

      <p className={`${SOC_EYEBROW} mb-3`}>Blind review</p>
      <h1 className="font-display text-2xl text-white sm:text-3xl">
        {pkt.log.species_name}
      </h1>
      {pkt.log.scientific_name && (
        <p className="text-sm italic text-ocean-500">{pkt.log.scientific_name}</p>
      )}
      <p className="mb-6 mt-1 font-mono text-[11px] uppercase tracking-wider text-ocean-500">
        {pkt.log.points ? `${pkt.log.points} points` : "Not on the point list"} ·
        opened {new Date(pkt.log.opened_at).toLocaleDateString()}
      </p>

      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-2xl border border-amber-500/30 bg-[#04060a] p-5">
        <KeySquare className="h-6 w-6 shrink-0 text-amber-300" />
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500/70">
            Look for this code
          </p>
          <p className="font-display text-3xl tracking-[0.2em] text-amber-300">
            {pkt.log.challenge_code}
          </p>
        </div>
        <p className="max-w-sm text-xs leading-relaxed text-amber-100/55">
          It should be handwritten on a card and clearly visible in the stage 1
          and stage 5 photos. Missing or illegible is grounds to deny.
        </p>
      </div>

      {pkt.log.tank_note && (
        <div className="mb-6 rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-ocean-600">
            Setup notes
          </p>
          <p className="mt-1 text-sm text-ocean-300">{pkt.log.tank_note}</p>
        </div>
      )}

      <ol className="mb-8 space-y-3">
        {pkt.stages.map((s) => (
          <li
            key={s.stage}
            className={`rounded-2xl border p-4 sm:p-5 ${
              s.requires_code
                ? "border-amber-500/30 bg-amber-500/[0.04]"
                : "border-ocean-800/60 bg-ocean-900/40"
            }`}
          >
            <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
              <p className="text-sm font-medium text-white">
                {s.stage}. {s.name}
                {s.requires_code && (
                  <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                    check for code
                  </span>
                )}
              </p>
              <p className="font-mono text-[10px] uppercase tracking-wider text-ocean-500">
                Logged {new Date(s.logged_at).toLocaleDateString()}
              </p>
            </div>
            <p className="text-sm text-ocean-400">{s.proves}</p>

            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
              <Flag label="Metadata" value={s.meta_present} />
              <Flag label="Timing" value={s.meta_time_ok} />
              <Flag label="Region" value={s.meta_region_ok} />
            </div>

            {s.note && <p className="mt-2 text-sm text-ocean-300">{s.note}</p>}

            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {s.photos.map((src) => (
                <a key={src} href={src} target="_blank" rel="noopener noreferrer">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`Stage ${s.stage}`}
                    loading="lazy"
                    className="aspect-square w-full rounded-lg border border-ocean-800/60 object-cover transition-opacity hover:opacity-80"
                  />
                </a>
              ))}
            </div>
          </li>
        ))}
      </ol>

      {pending ? (
        <ReviewForm
          reviewId={pkt.review.id}
          minReason={settings?.min_reason_length ?? 20}
        />
      ) : (
        <div className="rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5 text-sm text-ocean-300">
          You{" "}
          {pkt.review.vote === "approve"
            ? "approved"
            : pkt.review.vote === "deny"
            ? "denied"
            : "sent to the judge"}{" "}
          this entry.
          {pkt.review.reason && (
            <p className="mt-2 text-ocean-400">&ldquo;{pkt.review.reason}&rdquo;</p>
          )}
        </div>
      )}
    </div>
  );
}
