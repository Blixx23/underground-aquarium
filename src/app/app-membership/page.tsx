import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { SOCIETY_HOME_PATH, SOCIETY_PATH } from "@/lib/config";

/**
 * What the iPhone app shows in place of the club page, which is where people
 * join and pay dues. proxy.ts sends the app here (the address bar still says
 * /c/...). Apple doesn't allow paying for memberships outside its own payment
 * system from inside an app, so this page doesn't point anywhere to pay.
 */
export const metadata: Metadata = {
  title: "Society membership",
  robots: { index: false, follow: false },
};

export default function AppMembershipPage() {
  return (
    <main className="min-h-screen px-6 pb-24 pt-28">
      <div className="mx-auto max-w-md rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-center">
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.2em] text-amber-300/70">
          The Society
        </p>
        <h1 className="mb-3 font-display text-2xl text-white">Not available in the app</h1>
        <p className="mb-6 text-sm leading-relaxed text-amber-100/60">
          Joining the Society and membership dues aren&apos;t handled in the app. If
          you&apos;re already a member, your member area, spawn logs, leaderboard and
          certificates all work here.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href={SOCIETY_HOME_PATH}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-medium text-ocean-950 transition-colors hover:bg-amber-400"
          >
            Go to the member area <ArrowRight className="h-4 w-4" />
          </Link>
          <Link href={SOCIETY_PATH} className="text-sm text-amber-300 hover:text-amber-200">
            About the Society
          </Link>
        </div>
      </div>
    </main>
  );
}
