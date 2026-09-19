import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { ShieldCheck, ShieldX, ShieldAlert, SearchX, ArrowLeft } from "lucide-react";
import { supabasePublic } from "@/lib/supabase/public";
import SocietySeal from "@/components/society/SocietySeal";
import VerifyForm from "@/components/verify/VerifyForm";
import CopyLinkButton from "@/components/verify/CopyLinkButton";
import { parseCode } from "@/lib/certificates/code";
import { SOC_EYEBROW, SOC_GLOW } from "@/lib/society/theme";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Certificate record | Underground Aquarium Registry",
  robots: { index: false, follow: false },
};

type CertRecord = {
  code: string;
  program: string;
  program_name: string;
  kind: string;
  title: string | null;
  recipient_name: string;
  member_number: number | null;
  points: number | null;
  issued_at: string;
  status: "valid" | "revoked";
  revoked_at: string | null;
  matched_legacy: boolean;
};

const longDate = (d: string | Date) =>
  new Date(d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "America/Los_Angeles",
  });

/**
 * One certificate's public record.
 *
 * Typos are caught before the database is ever asked, so "not found"
 * only ever means not found. Shows what's printed on the certificate
 * and whether it still stands, nothing more about the person.
 */
export default async function RecordPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: raw } = await params;
  const typed = decodeURIComponent(raw);
  const parsed = parseCode(typed);

  let record: CertRecord | null = null;
  let lookupFailed = false;
  if (parsed.state === "valid" || parsed.state === "legacy") {
    const { data, error } = await supabasePublic.rpc("verify_certificate", {
      p_code: parsed.code,
    });
    if (error) lookupFailed = true;
    record = ((data as CertRecord[] | null) ?? [])[0] ?? null;
  }

  const checkedAt = new Date().toLocaleString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/Los_Angeles",
    timeZoneName: "short",
  });

  return (
    <main className="relative overflow-hidden px-6 pb-24 pt-28 sm:pt-32">
      <div
        className="pointer-events-none absolute left-1/2 top-0 h-[480px] w-[900px] -translate-x-1/2"
        style={SOC_GLOW}
      />
      <div className="relative mx-auto max-w-2xl">
        <Link
          href="/verify"
          className="mb-8 inline-flex items-center gap-2 text-sm text-ocean-400 transition-colors hover:text-amber-300"
        >
          <ArrowLeft className="h-4 w-4" />
          Certificate Registry
        </Link>

        {record ? (
          <Found record={record} checkedAt={checkedAt} />
        ) : lookupFailed ? (
          <Problem
            icon={ShieldAlert}
            title="The registry didn't answer"
            body="That's on our end, not the certificate. Try again in a minute."
          />
        ) : parsed.state === "typo" ? (
          <Problem
            icon={ShieldAlert}
            title="That code has a typo"
            body={
              <>
                <span className="font-mono text-white">{parsed.code}</span>{" "}
                isn&apos;t
                a code we could have issued. Every code carries a check character,
                and this one doesn&apos;t add up, which almost always means one
                character was mistyped. Compare it against the certificate and
                try again.
              </>
            }
            retry={typed}
          />
        ) : parsed.state === "valid" || parsed.state === "legacy" ? (
          <Problem
            icon={SearchX}
            tone="bad"
            title="Not in the registry"
            body={
              <>
                No certificate carries the code{" "}
                <span className="font-mono text-white">{parsed.code}</span>. If
                you copied it correctly, it was not issued by Underground
                Aquarium. If you think that&apos;s wrong, email{" "}
                <a className="text-amber-300 hover:underline" href="mailto:hello@undergroundaquarium.com">
                  hello@undergroundaquarium.com
                </a>{" "}
                with a photo of the certificate.
              </>
            }
            retry={typed}
          />
        ) : (
          <Problem
            icon={ShieldX}
            title="That isn't a certificate code"
            body="Underground Aquarium codes look like UA-B7K2-M9QX-T4P8. You'll find one at the top right and along the bottom of every certificate."
            retry=""
          />
        )}
      </div>
    </main>
  );
}

function Found({ record, checkedAt }: { record: CertRecord; checkedAt: string }) {
  const valid = record.status === "valid";
  const memberNo =
    record.member_number !== null && record.member_number !== undefined
      ? `UAS-${String(record.member_number).padStart(4, "0")}`
      : null;
  const awarded =
    record.kind === "membership"
      ? "Membership, Underground Aquarium Society"
      : record.title ?? record.program_name;

  return (
    <>
      {/* The verdict */}
      <div
        className={`mb-6 flex items-center gap-4 rounded-2xl border p-5 ${
          valid
            ? "border-emerald-400/40 bg-emerald-500/[0.08]"
            : "border-coral-500/50 bg-coral-500/[0.08]"
        }`}
      >
        <span
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full ${
            valid ? "bg-emerald-400/15 text-emerald-300" : "bg-coral-500/15 text-coral-300"
          }`}
        >
          {valid ? <ShieldCheck className="h-8 w-8" /> : <ShieldX className="h-8 w-8" />}
        </span>
        <div>
          <p
            className={`font-mono text-[11px] uppercase tracking-[0.25em] ${
              valid ? "text-emerald-300/80" : "text-coral-300/80"
            }`}
          >
            {valid ? "Verified" : "Revoked"}
          </p>
          <h1 className="font-display text-2xl text-white sm:text-3xl">
            {valid ? "Authentic certificate" : "No longer valid"}
          </h1>
          <p className={`text-sm ${valid ? "text-emerald-100/70" : "text-coral-200/80"}`}>
            {valid
              ? "Issued by Underground Aquarium and in force today."
              : `This certificate was issued, then revoked on ${longDate(record.revoked_at!)}. It should not be relied on.`}
          </p>
        </div>
      </div>

      {/* The record, set like a document */}
      <article className="relative overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-b from-[#1a1408] via-ocean-950 to-ocean-950 p-1 shadow-2xl shadow-black/50">
        <div className="relative rounded-xl border border-amber-500/15 px-6 py-8 sm:px-10 sm:py-10">
          {/* Watermark */}
          <SocietySeal
            size={320}
            className="pointer-events-none absolute -right-16 -top-10 h-80 w-80 opacity-[0.06]"
          />
          {/* Corner marks */}
          {["left-3 top-3", "right-3 top-3", "left-3 bottom-3", "right-3 bottom-3"].map((pos) => (
            <span
              key={pos}
              className={`absolute ${pos} h-2 w-2 rotate-45 bg-amber-400/60`}
              aria-hidden="true"
            />
          ))}

          <div className="relative">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <p className={`${SOC_EYEBROW} mb-1`}>Registry record</p>
                <p className="whitespace-nowrap font-mono text-base tracking-[0.08em] text-amber-200 sm:text-xl sm:tracking-[0.12em]">
                  {record.code}
                </p>
              </div>
              <SocietySeal size={56} className="h-14 w-14 shrink-0" />
            </div>

            <p className="mb-1 text-xs uppercase tracking-[0.2em] text-ocean-500">Awarded to</p>
            <p className="mb-8 font-display text-3xl leading-tight text-white sm:text-4xl">
              {record.recipient_name}
            </p>

            <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
              <Field label="Award" value={awarded} wide />
              <Field label="Program" value={`${record.program} · ${record.program_name}`} />
              <Field label="Date of issue" value={longDate(record.issued_at)} />
              {memberNo && <Field label="Member No." value={memberNo} mono />}
              {record.kind === "title" && record.points !== null && (
                <Field label="Points at issue" value={String(record.points)} />
              )}
              <Field label="Signed by" value="Christopher M. Lewis, Founder & Judge" wide />
              <Field
                label="Status"
                value={valid ? "Valid" : `Revoked ${longDate(record.revoked_at!)}`}
                tone={valid ? "text-emerald-300" : "text-coral-300"}
              />
            </dl>

            {record.matched_legacy && (
              <p className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-sm text-amber-100/70">
                You entered this certificate&apos;s original code. It&apos;s been
                renumbered in the registry as{" "}
                <span className="font-mono text-amber-200">{record.code}</span>.
                Both refer to the same certificate.
              </p>
            )}

            <div className="mt-8 border-t border-amber-500/15 pt-5 text-xs text-ocean-500">
              Checked against the Underground Aquarium registry on {checkedAt}.
              The record on this page is the authority, not the paper. A
              certificate whose name or award doesn&apos;t match this record
              has been altered.
            </div>
          </div>
        </div>
      </article>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/verify" className="text-sm text-amber-300 hover:text-amber-200">
          Verify another certificate
        </Link>
        <CopyLinkButton />
      </div>
    </>
  );
}

function Field({
  label,
  value,
  mono = false,
  wide = false,
  tone = "text-white",
}: {
  label: string;
  value: string;
  mono?: boolean;
  wide?: boolean;
  tone?: string;
}) {
  return (
    <div className={wide ? "sm:col-span-2" : ""}>
      <dt className="mb-1 text-xs uppercase tracking-[0.2em] text-ocean-500">{label}</dt>
      <dd className={`text-base ${tone} ${mono ? "font-mono" : ""}`}>{value}</dd>
    </div>
  );
}

function Problem({
  icon: Icon,
  title,
  body,
  retry,
  tone = "warn",
}: {
  icon: typeof ShieldX;
  title: string;
  body: ReactNode;
  retry?: string;
  tone?: "warn" | "bad";
}) {
  return (
    <div className="text-center">
      <span
        className={`mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full ${
          tone === "bad" ? "bg-coral-500/15 text-coral-300" : "bg-amber-400/10 text-amber-300"
        }`}
      >
        <Icon className="h-9 w-9" />
      </span>
      <p className={`${SOC_EYEBROW} mb-2`}>Certificate Registry</p>
      <h1 className="mb-3 font-display text-3xl text-white">{title}</h1>
      <p className="mx-auto mb-10 max-w-lg text-sm text-ocean-300">{body}</p>
      {retry !== undefined && (
        <div className="mx-auto max-w-xl">
          <VerifyForm initial={retry} size="md" />
        </div>
      )}
    </div>
  );
}
