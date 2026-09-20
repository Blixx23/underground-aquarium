import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText, Download, Lock, ShieldCheck } from "lucide-react";
import { getSocietyContext } from "@/lib/society/membership";
import { createClient } from "@/lib/supabase/server";
import { titleForPoints } from "@/lib/awards/titles";
import { SOC_EYEBROW, SOC_CARD } from "@/lib/society/theme";
import SocietySeal from "@/components/society/SocietySeal";

export const metadata: Metadata = { title: "Certificates" };

export const dynamic = "force-dynamic";

export default async function CertificatesPage() {
  const ctx = await getSocietyContext();
  const supabase = await createClient();
  const societyId = ctx.society!.id;

  const [{ data: sData }, { data: ladderRow }, { data: issuedRows }, { data: logRows }] = await Promise.all([
    supabase.rpc("club_award_standings", { p_club_id: societyId }),
    supabase.from("clubs").select("award_titles").eq("id", societyId).maybeSingle(),
    supabase
      .from("society_certificates")
      .select("kind, title, code, status")
      .eq("user_id", ctx.userId),
    supabase
      .from("spawn_logs")
      .select("id, species_id, species_name, decided_at, points_awarded")
      .eq("user_id", ctx.userId)
      .eq("status", "approved")
      .order("decided_at", { ascending: true }),
  ]);

  // One breeder certificate per species: the first approved log for each.
  type LogRow = { id: string; species_id: string | null; species_name: string | null; decided_at: string | null; points_awarded: number | null };
  const logs = (logRows ?? []) as LogRow[];
  const speciesIds = [...new Set(logs.map((l) => l.species_id).filter(Boolean))] as string[];
  const speciesById = new Map<string, { common_name: string | null; scientific_name: string | null }>();
  if (speciesIds.length > 0) {
    const { data: sp } = await supabase
      .from("club_award_species")
      .select("id, common_name, scientific_name")
      .in("id", speciesIds);
    for (const r of (sp ?? []) as { id: string; common_name: string | null; scientific_name: string | null }[]) {
      speciesById.set(r.id, r);
    }
  }
  const bred = new Map<string, { logId: string; common: string; scientific: string | null; points: number | null }>();
  for (const l of logs) {
    const sp = l.species_id ? speciesById.get(l.species_id) : undefined;
    const common = sp?.common_name?.trim() || l.species_name?.trim() || "Fish";
    if (!bred.has(common)) bred.set(common, { logId: l.id, common, scientific: sp?.scientific_name ?? null, points: l.points_awarded });
  }
  const speciesCerts = [...bred.values()];

  // Registry numbers for anything already issued, so members can hand
  // a code to whoever wants proof without downloading the PDF again.
  const issued = new Map(
    ((issuedRows as { kind: string; title: string | null; code: string; status: string }[] | null) ?? [])
      .map((r) => [r.kind === "membership" ? "membership" : `${r.kind}:${r.title}`, r])
  );
  const membershipCert = issued.get("membership");

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
        Every species you breed and every title you earn comes with a signed certificate, dated and carrying
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
          {membershipCert && <RegistryLink code={membershipCert.code} revoked={membershipCert.status === "revoked"} />}
        </div>
        {/* Plain link, not client JS: the route issues the certificate in the
            database and streams the PDF back as a download. */}
        <a
          href="/api/society/certificate?kind=membership"
          className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300"
        >
          <Download className="h-4 w-4" />
          Download PDF
        </a>
      </div>

      <h2 className="mb-1 font-display text-xl text-white">Breeder certificates</h2>
      <p className="mb-4 text-sm text-ocean-400">
        One for every species you&apos;ve had a spawn log approved for.
      </p>
      {speciesCerts.length === 0 ? (
        <div className="mb-10 rounded-2xl border border-dashed border-ocean-800/60 px-6 py-10 text-center">
          <ScrollText className="mx-auto mb-3 h-8 w-8 text-ocean-700" />
          <p className="text-sm text-ocean-400">
            Get a spawn log approved and you&apos;ll earn a certificate like{" "}
            <span className="text-ocean-200">Certified Angelfish Breeder</span>.
          </p>
          <Link href="/society/breeder/new" className="mt-3 inline-block text-sm text-amber-300 hover:text-amber-200">
            Open a spawn log
          </Link>
        </div>
      ) : (
        <ul className="mb-10 space-y-2">
          {speciesCerts.map((c) => (
            <li
              key={c.common}
              className="flex flex-wrap items-center gap-4 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] px-4 py-3"
            >
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-300">
                <ScrollText className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm text-white">Certified {c.common} Breeder</span>
                {c.scientific && <span className="block text-xs italic text-ocean-400">{c.scientific}</span>}
                {issued.get(`species:${c.common}`) && (
                  <RegistryLink
                    code={issued.get(`species:${c.common}`)!.code}
                    revoked={issued.get(`species:${c.common}`)!.status === "revoked"}
                  />
                )}
              </span>
              <a
                href={`/api/society/certificate?kind=species&log=${c.logId}`}
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300"
              >
                <Download className="h-4 w-4" />
                PDF
              </a>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mb-1 font-display text-xl text-white">Title certificates</h2>
      <p className="mb-4 text-sm text-ocean-400">
        Your rank in the Breeder Award Program, earned by total points across every species.
      </p>

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
                {issued.get(`title:${t.title}`) && (
                  <RegistryLink
                    code={issued.get(`title:${t.title}`)!.code}
                    revoked={issued.get(`title:${t.title}`)!.status === "revoked"}
                  />
                )}
              </span>

              {t.earned ? (
                <a
                  href={`/api/society/certificate?kind=title&title=${encodeURIComponent(t.title)}`}
                  className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-ocean-950 transition-colors hover:bg-amber-300"
                >
                  <Download className="h-4 w-4" />
                  PDF
                </a>
              ) : (
                <span
                  title="Earn this title to unlock its certificate"
                  className="inline-flex shrink-0 cursor-not-allowed items-center gap-2 rounded-xl border border-ocean-800/60 px-4 py-2 text-sm text-ocean-600"
                >
                  <Lock className="h-4 w-4" />
                  PDF
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="mt-6 rounded-xl border border-ocean-800/60 bg-ocean-900/30 px-4 py-3 text-xs text-ocean-500">
        Each certificate carries a permanent registry number. Anyone can check
        it at{" "}
        <Link href="/verify" className="text-amber-300/80 hover:text-amber-300">
          undergroundaquarium.com/verify
        </Link>
        , or by scanning the QR code on the certificate, so a printed
        certificate can always be proven genuine. Downloading the same
        certificate again gives you the same number.
      </p>
    </div>
  );
}

function RegistryLink({ code, revoked }: { code: string; revoked: boolean }) {
  return (
    <Link
      href={`/verify/${code}`}
      className={`mt-1.5 inline-flex items-center gap-1.5 font-mono text-[11px] tracking-wider ${
        revoked ? "text-coral-300" : "text-amber-300/80 hover:text-amber-300"
      }`}
    >
      <ShieldCheck className="h-3.5 w-3.5" />
      {code}
      {revoked && " · revoked"}
    </Link>
  );
}
