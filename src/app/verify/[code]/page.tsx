import type { Metadata } from "next";
import { ShieldCheck, ShieldX } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import SocietySeal from "@/components/society/SocietySeal";
import { SOC_EYEBROW } from "@/lib/society/theme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Verify a certificate — Underground Aquarium Society",
  robots: { index: false },
};

type Verified = {
  kind: "membership" | "title";
  title: string | null;
  recipient_name: string;
  member_number: number | null;
  points: number | null;
  issued_at: string;
};

/**
 * Public certificate verification.
 *
 * Anyone holding a printed certificate can check it here. Shows only what
 * is printed on the certificate itself — nothing more about the member.
 */
export default async function VerifyPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const { data } = await supabasePublic.rpc("verify_society_certificate", {
    p_code: decodeURIComponent(code),
  });
  const cert = ((data as Verified[] | null) ?? [])[0] ?? null;

  const memberNo =
    cert?.member_number !== null && cert?.member_number !== undefined
      ? `UAS-${String(cert.member_number).padStart(4, "0")}`
      : null;

  return (
    <main className="min-h-screen px-6 pb-20 pt-28">
      <div className="mx-auto max-w-xl text-center">
        <SocietySeal size={120} className="mx-auto mb-6 h-[120px] w-[120px]" />
        <p className={`${SOC_EYEBROW} mb-3`}>Certificate verification</p>

        {cert ? (
          <div className="rounded-2xl border border-emerald-500/40 bg-emerald-500/[0.07] p-6 sm:p-8">
            <ShieldCheck className="mx-auto mb-3 h-9 w-9 text-emerald-300" />
            <h1 className="mb-1 font-display text-2xl text-white">Genuine</h1>
            <p className="mb-6 text-sm text-emerald-100/70">
              Issued by the Underground Aquarium Society.
            </p>
            <dl className="space-y-3 text-left text-sm">
              <Row label="Awarded to" value={cert.recipient_name} />
              <Row
                label="Certificate"
                value={cert.kind === "membership" ? "Membership" : cert.title ?? "Title"}
              />
              {cert.kind === "title" && cert.points !== null && (
                <Row label="Points held" value={`${cert.points}`} />
              )}
              {memberNo && <Row label="Member No." value={memberNo} />}
              <Row
                label="Issued"
                value={new Date(cert.issued_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              />
              <Row label="Code" value={decodeURIComponent(code).toUpperCase()} mono />
            </dl>
          </div>
        ) : (
          <div className="rounded-2xl border border-coral-500/40 bg-coral-500/[0.07] p-6 sm:p-8">
            <ShieldX className="mx-auto mb-3 h-9 w-9 text-coral-300" />
            <h1 className="mb-2 font-display text-2xl text-white">Not found</h1>
            <p className="text-sm text-ocean-300">
              No Society certificate carries the code{" "}
              <span className="font-mono text-white">{decodeURIComponent(code)}</span>.
              Check it was typed exactly as printed. A certificate whose code
              doesn&apos;t appear here was not issued by the Society.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-ocean-400">{label}</dt>
      <dd className={`text-right text-white ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}
