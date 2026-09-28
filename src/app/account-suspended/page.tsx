import type { Metadata } from "next";
import Link from "next/link";
import { Ban } from "lucide-react";

export const metadata: Metadata = {
  title: "Account suspended",
  robots: { index: false, follow: false },
};

/**
 * Where a suspended member lands when they try to sign in (or open a
 * "suspended" notification). It lives outside /account on purpose: a
 * suspended member can't sign in, and everything under /account sends
 * signed-out visitors to the login page.
 */
export default function AccountSuspendedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 pt-20 pb-20">
      <div className="w-full max-w-md rounded-2xl border border-coral-500/30 bg-coral-500/5 p-8 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-coral-500/15 text-coral-300">
          <Ban className="h-7 w-7" />
        </div>
        <h1 className="mb-2 font-display text-2xl text-white">
          This account is suspended
        </h1>
        <p className="mb-6 text-sm leading-relaxed text-ocean-300">
          A moderator suspended this account, so it can&apos;t sign in right
          now. While it is suspended, its public profile, classified ads and
          tanks are hidden. If you think this is a mistake, email{" "}
          <a
            href="mailto:support@undergroundaquarium.com"
            className="text-white underline hover:text-ocean-200"
          >
            support@undergroundaquarium.com
          </a>{" "}
          from the email address on the account.
        </p>
        <Link
          href="/"
          className="inline-flex w-full items-center justify-center rounded-lg border border-ocean-700/60 px-4 py-2.5 text-sm text-ocean-200 transition hover:text-white hover:border-ocean-600"
        >
          Back to the home page
        </Link>
      </div>
    </main>
  );
}
