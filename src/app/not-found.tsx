import type { Metadata } from "next";
import Link from "next/link";
import { Fish, ArrowRight } from "lucide-react";

export const metadata: Metadata = { title: "Page not found" };

/** Anything that doesn't exist: keep the site around it and offer a way on. */
export default function NotFound() {
  const links = [
    { href: "/marketplace", label: "Browse the classifieds" },
    { href: "/feed", label: "See what's new" },
    { href: "/species", label: "Look up a species" },
    { href: "/forums", label: "Ask the forums" },
  ];
  return (
    <main className="flex min-h-screen items-center justify-center px-6 pb-20 pt-28">
      <div className="max-w-md text-center">
        <span className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-ocean-700/60 bg-ocean-900/60">
          <Fish className="h-8 w-8 text-ocean-400" />
        </span>
        <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.25em] text-ocean-500">404</p>
        <h1 className="mb-3 font-display text-3xl text-white">This one swam off</h1>
        <p className="mb-8 text-ocean-300">
          The page you&apos;re looking for doesn&apos;t exist, or it moved. Here are some places to go instead.
        </p>
        <ul className="space-y-2 text-left">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="flex items-center justify-between rounded-xl border border-ocean-800/60 bg-ocean-900/40 px-4 py-3 text-ocean-200 transition-colors hover:border-ocean-600 hover:text-white"
              >
                {l.label}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </li>
          ))}
        </ul>
        <Link href="/" className="mt-6 inline-block text-sm text-ocean-400 hover:text-white">
          Back to the home page
        </Link>
      </div>
    </main>
  );
}
