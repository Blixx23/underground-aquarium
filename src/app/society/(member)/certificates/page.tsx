import { ScrollText, Download, Lock } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { titleForPoints } from "@/lib/awards/titles";
import { SOC_EYEBROW, SOC_CARD } from "@/lib/society/theme";
import SocietySeal from "@/components/society/SocietySeal";

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();
  const societyId = ctx.society!.id;

  const [{ data: sData }, { data: ladderRow }] = await Promise.all([
    supabase.rpc("club_award_standings", { p_club_id: societyId }),
    supabase.from("clubs").select("award_titles").eq("id", societyId).maybeSingle(),
  ]);

  const points = Number(
    ((sData as { user_id: string; total_points: number }[] | null) ?? []).find(
      (s) => s.user_id === ctx.userId
    )?.total_points ?? 0
  );

  const ladder =
    (ladderRow?.award_titles as { title: string; min_points: number }[] | null) ??
    [];

  const current = titleForPoints(points, ladder);

  // Every rung, so a member can see what they hold and what's next on one page.
  const rungs = ladder
    .slice()
    .sort((a, b) => a.min_points - b.min_points)
    .map((t) => ({ ...t, earned: points >= t.min_points }));

  const memberNumber =
    ctx.membership?.member_number !== null &&
    ctx.membership?.member_number !== undefined
      ? `UAS-${String(ctx.membership.member_number).padStart(4, "0")}`
      : null;

  return (
    <div>
      <p className={`${SOC_EYEBROW} mb-3`}>Recognition</p>
      <h1 className="mb-2 font-display text-2xl text-white sm:text-3xl">
        Certificates
      </h1>
      <p className="mb-8 max-w-xl text-sm text-ocean-400">
        Every title you earn comes with a signed certificate, dated and carrying
        a verification code that resolves to a public page proving it&apos;s
        real. Built to be printed and framed.
      </p>

      {/* Membership certificate — the one thing everybody has from day one. */}
      <div className={`${SOC_CARD} mb-8 flex flex-wrap items-center gap-5 p-5 sm:p-6`}>
        <SocietySeal size={80} className="h-20 w-20 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-white">
            Certificate of Membership
          </p>
          <p className="mt-1 text-sm text-amber-100/60">
            {ctx.membership?.display_name || "Member"}
            {memberNumber && ` · ${memberNumber}`}
            {ctx.membership?.joined_at &&
              ` · Admitted ${new Date(
                ctx.membership.joined_at
              ).getFullYear()}`}
          </p>
        </div>
        <button
          disabled
          title="Certificate PDFs are being built"
          className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl border border-ocean-800/60 px-5 py-2.5 text-sm text-ocean-600"
        >
          <Download className="h-4 w-4" />
          Download
        </button>
      </div>

      <h2 className="mb-4 font-display text-xl text-white">Award certificates</h2>

      {rungs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-ocean-800/60 py-14 text-center">
          <ScrollText className="mx-auto mb-4 h-9 w-9 text-ocean-700" />
          <p className="text-sm text-ocean-400">
            No title ladder has been set for the Breeder Award Program yet.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rungs.map((t) => (
            <li
              key={t.title}
              className={`flex flex-wrap items-center gap-4 rounded-xl border px-4 py-3 ${
                t.earned
                  ? "border-amber-500/30 bg-amber-500/[0.06]"
                  : "border-ocean-800/60 bg-ocean-900/30"
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                  t.earned
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-300"
                    : "border-ocean-800/60 text-ocean-700"
                }`}
              >
                {t.earned ? (
                  <ScrollText className="h-4 w-4" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
              </span>

              <span className="min-w-0 flex-1">
                <span
                  className={`block text-sm ${
                    t.earned ? "text-white" : "text-ocean-600"
                  }`}
                >
                  {t.title}
                  {t.title === current && (
                    <span className="ml-2 font-mono text-[10px] uppercase tracking-wider text-amber-400">
                      current
                    </span>
                  )}
                </span>
                <span className="block font-mono text-[10px] uppercase tracking-wider text-ocean-600">
                  {t.min_points} points
                  {!t.earned && ` · ${t.min_points - points} to go`}
                </span>
              </span>

              <button
                disabled
                title={
                  t.earned
                    ? "Certificate PDFs are being built"
                    : "Earn this title to unlock its certificate"
                }
                className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl border border-ocean-800/60 px-4 py-2 text-sm text-ocean-600"
              >
                <Download className="h-4 w-4" />
                PDF
              </button>
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-xl border border-ocean-800/60 bg-ocean-900/30 px-4 py-3 text-xs text-ocean-500">
        Downloads are switched off until the signed PDF template is finished.
        Every certificate you&apos;ve earned will be available here the moment
        it ships — nothing is lost in the meantime.
      </p>
    </div>
  );
}
