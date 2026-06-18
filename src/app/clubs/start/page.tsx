import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  Users,
  CreditCard,
  ClipboardCheck,
  CalendarDays,
  Contact,
  Globe,
  Bell,
  ShieldCheck,
} from "lucide-react";
import { PLATFORM_FEE_LABEL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Run Your Aquarium Club Online | Underground Aquarium",
  description:
    "Everything your aquarium club needs in one place — member rosters, online dues, events, applications, and a public listing. Free to start.",
};

const benefits = [
  {
    icon: Users,
    title: "Member roster & roles",
    desc: "Add members, assign officers and admins, and keep your whole club organized in one tidy roster.",
  },
  {
    icon: CreditCard,
    title: "Collect dues online",
    desc: "Members pay dues by card through Stripe. Money lands in your club's own account — no spreadsheets, no chasing checks.",
  },
  {
    icon: ClipboardCheck,
    title: "Applications & approvals",
    desc: "New members apply with their details. Officers review and approve, so only real people join your club.",
  },
  {
    icon: CalendarDays,
    title: "Events & meetups",
    desc: "Post fish swaps, auctions, and meetups. Members find what's happening and never miss a date.",
  },
  {
    icon: Contact,
    title: "Member directory",
    desc: "Officers can see contact details for approved members, so reaching the whole club is one tap away.",
  },
  {
    icon: Bell,
    title: "Built-in notifications",
    desc: "Applications, approvals, and invites all surface in-app, so nothing slips through the cracks.",
  },
];

const steps = [
  {
    n: "1",
    title: "Create your club",
    desc: "Add your name, location, and a short description. Takes about two minutes.",
  },
  {
    n: "2",
    title: "Get approved",
    desc: "We review new clubs to keep the directory genuine. Once you're verified, your club can go public.",
  },
  {
    n: "3",
    title: "Invite & grow",
    desc: "Send invites, accept applications, collect dues, and post your first event.",
  },
];

export default function RunAClubPage() {
  return (
    <div className="overflow-x-clip">
      {/* Hero */}
      <section className="relative pt-36 pb-24 bg-ocean-950">
        <div className="absolute inset-0 bg-gradient-to-b from-ocean-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <p className="text-xs font-mono tracking-[0.25em] text-ocean-500 uppercase mb-5">
            For Club Organizers
          </p>
          <h1
            className="font-display text-4xl md:text-6xl text-white leading-tight mb-6"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Run your aquarium club,{" "}
            <span className="text-ocean-300">all in one place</span>
          </h1>
          <p className="text-ocean-300 text-lg md:text-xl leading-relaxed max-w-2xl mx-auto mb-10">
            Member rosters, online dues, events, applications, and a public
            listing — the whole back office for your club, without the
            spreadsheets.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/clubs/new"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-medium bg-ocean-600 hover:bg-ocean-500 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-ocean-600/30"
            >
              Start your club <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/clubs/discover"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-medium text-ocean-200 border border-ocean-700/50 rounded-xl hover:border-ocean-500 hover:text-white transition-colors"
            >
              Browse clubs
            </Link>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="relative py-24 bg-ocean-950">
        <div className="relative max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="font-display text-3xl md:text-4xl text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Everything your club needs
            </h2>
            <p className="text-ocean-400 text-lg max-w-xl mx-auto">
              Stop juggling group chats, payment apps, and sign-up sheets. It's
              all here.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {benefits.map((b) => (
              <div
                key={b.title}
                className="group card-deep rounded-2xl p-8 border border-ocean-800/60 hover:border-ocean-600/50 transition-colors"
              >
                <div className="inline-flex w-12 h-12 rounded-xl bg-ocean-800/40 border border-ocean-700/40 items-center justify-center mb-5">
                  <b.icon className="w-5 h-5 text-ocean-300" />
                </div>
                <h3 className="font-display text-lg text-white mb-3">
                  {b.title}
                </h3>
                <p className="text-ocean-400 leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="relative py-24 bg-ocean-950">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-ocean-900/20 to-transparent pointer-events-none" />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2
              className="font-display text-3xl md:text-4xl text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              How it works
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {steps.map((s) => (
              <div key={s.n} className="text-center">
                <div className="mx-auto mb-5 w-12 h-12 rounded-full bg-ocean-800/50 border border-ocean-600/40 flex items-center justify-center font-display text-xl text-ocean-200">
                  {s.n}
                </div>
                <h3 className="font-display text-lg text-white mb-2">
                  {s.title}
                </h3>
                <p className="text-ocean-400 leading-relaxed">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="relative py-24 bg-ocean-950">
        <div className="relative max-w-3xl mx-auto px-6">
          <div className="card-deep rounded-3xl border border-ocean-700/50 p-10 md:p-14 text-center">
            <div className="inline-flex w-12 h-12 rounded-xl bg-brine-900/40 border border-brine-600/30 items-center justify-center mb-6">
              <ShieldCheck className="w-5 h-5 text-brine-400" />
            </div>
            <h2
              className="font-display text-3xl md:text-4xl text-white mb-4"
              style={{ fontFamily: "var(--font-display)" }}
            >
              Free to run your club
            </h2>
            <p className="text-ocean-300 text-lg leading-relaxed mb-8">
              No monthly fees. Creating and running your club costs nothing. When
              you collect dues online, a small {PLATFORM_FEE_LABEL} platform fee
              applies — only on what you actually collect.
            </p>
            <Link
              href="/clubs/new"
              className="inline-flex items-center gap-2 px-7 py-3.5 text-base font-medium bg-ocean-600 hover:bg-ocean-500 text-white rounded-xl transition-all duration-300 hover:shadow-lg hover:shadow-ocean-600/30"
            >
              Start your club <ArrowRight className="w-4 h-4" />
            </Link>
            <p className="mt-5 text-sm text-ocean-500 flex items-center justify-center gap-1.5">
              <Globe className="w-4 h-4" /> Verified clubs appear in our public
              directory
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
