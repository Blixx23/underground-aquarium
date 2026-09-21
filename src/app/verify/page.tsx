import type { Metadata } from "next";
import {
  ShieldCheck,
  QrCode,
  PenLine,
  Stamp,
  Hash,
  Building2,
  Fish,
  Leaf,
  GraduationCap,
  BadgeCheck,
  Award,
  Crown,
} from "lucide-react";
import SocietySeal from "@/components/society/SocietySeal";
import VerifyForm from "@/components/verify/VerifyForm";
import { CERTIFICATE_PROGRAMS } from "@/lib/certificates/code";
import { SOC_EYEBROW, SOC_CARD, SOC_RULE, SOC_GLOW } from "@/lib/society/theme";

export const metadata: Metadata = {
  title: "Certificate Registry | Underground Aquarium",
  description:
    "Verify any certificate issued by Underground Aquarium: memberships, breeder titles, courses and professional certifications.",
};

const PROGRAM_ICON: Record<string, typeof Fish> = {
  M: Crown,
  B: Fish,
  H: Leaf,
  C: GraduationCap,
  P: BadgeCheck,
  A: Award,
};

/** A real, well-formed code that isn't in the registry. Safe to show. */
const EXAMPLE = { program: "B", serial: "GN9-TV1B-ZR7", check: "4" };

/**
 * The Underground Aquarium Certificate Registry.
 *
 * One public page that can confirm any certificate UA has ever issued.
 * The paper is a copy; the record here is the certificate.
 */
export default function RegistryPage() {
  return (
    <main className="relative overflow-hidden">
      {/* Hero */}
      <section className="relative px-6 pb-16 pt-28 sm:pt-36">
        <div
          className="pointer-events-none absolute left-1/2 top-10 h-[520px] w-[900px] max-w-full -translate-x-1/2"
          style={SOC_GLOW}
        />
        <div className="relative mx-auto max-w-2xl text-center">
          <SocietySeal size={112} className="mx-auto mb-6 h-28 w-28 drop-shadow-[0_0_30px_rgba(217,160,60,0.25)]" />
          <p className={`${SOC_EYEBROW} mb-4`}>Underground Aquarium</p>
          <h1 className="mb-4 font-display text-4xl leading-tight text-white sm:text-5xl">
            Certificate Registry
          </h1>
          <p className="mx-auto mb-10 max-w-lg text-base text-amber-100/70 sm:text-lg">
            Every certificate we issue is recorded here the moment it&apos;s
            earned. Enter the code printed on one and the registry tells you,
            on the record, whether it&apos;s real.
          </p>

          <VerifyForm />

          <p className="mt-6 flex items-center justify-center gap-2 text-xs text-ocean-500">
            <QrCode className="h-3.5 w-3.5" />
            Holding the paper? Scan the QR code in its corner and you&apos;ll
            land straight on its record.
          </p>
        </div>
      </section>

      <div className={`mx-auto max-w-4xl ${SOC_RULE}`} />

      {/* Anatomy of a code */}
      <section className="px-6 py-16">
        <div className="mx-auto max-w-4xl">
          <p className={`${SOC_EYEBROW} mb-3 text-center`}>Reading a code</p>
          <h2 className="mb-10 text-center font-display text-2xl text-white sm:text-3xl">
            Every code tells you what it is
          </h2>

          <div className={`${SOC_CARD} px-4 py-10 sm:px-10`}>
            <p className="mb-10 whitespace-nowrap text-center font-mono text-xl tracking-[0.06em] sm:text-4xl sm:tracking-[0.12em]">
              <span className="text-ocean-400">UA-</span>
              <span className="rounded-md bg-amber-400/15 px-1 text-amber-300">
                {EXAMPLE.program}
              </span>
              <span className="text-white">{EXAMPLE.serial}</span>
              <span className="rounded-md bg-emerald-400/15 px-1 text-emerald-300">
                {EXAMPLE.check}
              </span>
            </p>

            <div className="grid gap-6 text-sm sm:grid-cols-4">
              <Part
                tag="UA"
                tone="text-ocean-300"
                title="The registry"
                body="Underground Aquarium. Every code we issue starts this way."
              />
              <Part
                tag="B"
                tone="text-amber-300"
                title="The program"
                body="What was earned: membership, breeding, a course, and so on."
              />
              <Part
                tag="•••"
                tone="text-white"
                title="The serial"
                body="Ten random characters. Around a quadrillion possibilities, so they can't be guessed."
              />
              <Part
                tag={EXAMPLE.check}
                tone="text-emerald-300"
                title="The check"
                body="Worked out from the rest. A mistyped or swapped character gets caught instantly."
              />
            </div>
          </div>

          <p className="mx-auto mt-6 max-w-2xl text-center text-xs text-ocean-500">
            Codes never use the letters I, L, O or U, so nothing on the paper
            can be misread. Type an O for a zero and the registry reads it as a
            zero anyway.
          </p>
        </div>
      </section>

      {/* Programs */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <p className={`${SOC_EYEBROW} mb-3 text-center`}>Programs</p>
          <h2 className="mb-10 text-center font-display text-2xl text-white sm:text-3xl">
            What the first letter means
          </h2>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {CERTIFICATE_PROGRAMS.map((p) => {
              const Icon = PROGRAM_ICON[p.letter] ?? Award;
              return (
                <li key={p.letter} className={`${SOC_CARD} flex gap-4 p-5`}>
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-amber-500/30 bg-amber-500/10 font-mono text-xl font-semibold text-amber-300">
                    {p.letter}
                  </span>
                  <span className="min-w-0">
                    <span className="mb-1 flex items-center gap-2 text-sm font-medium text-white">
                      <Icon className="h-4 w-4 text-amber-400/80" />
                      {p.name}
                    </span>
                    <span className="block text-sm text-ocean-400">{p.description}</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* What a genuine certificate has */}
      <section className="px-6 pb-16">
        <div className="mx-auto max-w-4xl">
          <p className={`${SOC_EYEBROW} mb-3 text-center`}>Spotting a fake</p>
          <h2 className="mb-10 text-center font-display text-2xl text-white sm:text-3xl">
            What a genuine certificate carries
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <Mark
              icon={Hash}
              title="A registry number"
              body="Top right and along the bottom. It has to resolve here, to the same name and the same award."
            />
            <Mark
              icon={QrCode}
              title="A QR code"
              body="Bottom right. It opens this certificate's own record. Check the web address is undergroundaquarium.com."
            />
            <Mark
              icon={PenLine}
              title="The founder's signature"
              body="Signed by Christopher M. Lewis, Founder & Judge, and dated the day it was issued."
            />
            <Mark
              icon={Stamp}
              title="The Society seal"
              body="Brass, centred beneath the award, with the Society's name set around the ring."
            />
          </div>
          <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-amber-100/60">
            The paper is only a copy. The record here is the certificate. If a
            code doesn&apos;t appear in the registry, or the name doesn&apos;t
            match, it wasn&apos;t issued by us.
          </p>
        </div>
      </section>

      {/* Employers */}
      <section className="px-6 pb-24">
        <div className={`mx-auto flex max-w-4xl flex-col gap-6 ${SOC_CARD} p-6 sm:flex-row sm:items-center sm:p-8`}>
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10">
            <Building2 className="h-7 w-7 text-amber-300" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="mb-1 font-display text-xl text-white">
              Stores and employers
            </h2>
            <p className="text-sm text-ocean-300">
              Hiring someone who says they hold an Underground Aquarium
              certification? Ask for the code and check it here. It&apos;s free,
              public and instant, and it shows only what&apos;s printed on the
              certificate. Questions go to{" "}
              <a
                href="mailto:hello@undergroundaquarium.com"
                className="text-amber-300 underline-offset-4 hover:underline"
              >
                hello@undergroundaquarium.com
              </a>
              .
            </p>
          </div>
          <ShieldCheck className="hidden h-10 w-10 shrink-0 text-amber-400/40 sm:block" />
        </div>
      </section>
    </main>
  );
}

function Part({
  tag,
  tone,
  title,
  body,
}: {
  tag: string;
  tone: string;
  title: string;
  body: string;
}) {
  return (
    <div className="text-center sm:text-left">
      <p className={`mb-1 font-mono text-lg font-semibold ${tone}`}>{tag}</p>
      <p className="mb-1 font-medium text-white">{title}</p>
      <p className="text-ocean-400">{body}</p>
    </div>
  );
}

function Mark({
  icon: Icon,
  title,
  body,
}: {
  icon: typeof Hash;
  title: string;
  body: string;
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-ocean-800/60 bg-ocean-900/40 p-5">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
      <div>
        <p className="mb-1 text-sm font-medium text-white">{title}</p>
        <p className="text-sm text-ocean-400">{body}</p>
      </div>
    </div>
  );
}
