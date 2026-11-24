"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { joinHref, loginHref, trackJoinClick } from "@/lib/analytics/join";

/**
 * A friendly "join free" card for visitors who aren't signed in, placed on the
 * pages people land on from search. It renders nothing until we know they're
 * signed out, so members never see it (not even for a flash).
 */
export default function JoinPrompt({
  spot,
  next,
  icon,
  title,
  body,
  cta = "Join free",
  className = "",
}: {
  /** Short name for tracking, e.g. "shop" or "species". */
  spot: string;
  /** Where to land after signing up. */
  next: string;
  icon?: ReactNode;
  title: string;
  body: string;
  cta?: string;
  className?: string;
}) {
  const [signedOut, setSignedOut] = useState(false);

  useEffect(() => {
    let active = true;
    createClient()
      .auth.getSession()
      .then(({ data }) => {
        if (active) setSignedOut(!data.session);
      });
    return () => {
      active = false;
    };
  }, []);

  if (!signedOut) return null;

  return (
    <section
      className={`flex flex-col gap-4 rounded-2xl border border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 via-ocean-900/40 to-sky-500/10 p-5 sm:flex-row sm:items-center sm:justify-between ${className}`}
    >
      <div className="flex items-start gap-3">
        {icon && (
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/15 text-emerald-300">
            {icon}
          </span>
        )}
        <div>
          <p className="font-semibold text-white">{title}</p>
          <p className="mt-1 text-sm text-ocean-200">{body}</p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <Link
          href={joinHref(spot, next)}
          onClick={() => trackJoinClick(spot)}
          className="rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-ocean-950 transition-colors hover:bg-emerald-400"
        >
          {cta}
        </Link>
        <Link
          href={loginHref(spot, next)}
          onClick={() => trackJoinClick(spot)}
          className="text-sm text-ocean-300 transition-colors hover:text-white"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}
