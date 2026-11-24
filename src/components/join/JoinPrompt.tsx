"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { joinHref, trackJoinClick } from "@/lib/analytics/join";

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

  // Short and bright: a slowly turning emerald and sky border, one line of
  // copy and one button. Members sign in from the Create account page.
  return (
    <Link
      href={joinHref(spot, next)}
      onClick={() => trackJoinClick(spot)}
      className={`group relative block overflow-hidden rounded-2xl p-[2px] shadow-[0_0_28px_-8px_rgba(52,211,153,0.6)] ${className}`}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 -ml-[150%] -mt-[150%] aspect-square w-[300%] animate-[spin_5s_linear_infinite] bg-[conic-gradient(from_0deg,#34d399,#38bdf8,#0ea5e9,#a7f3d0,#34d399)] motion-reduce:animate-none"
      />
      <span className="relative flex items-center gap-3 rounded-[14px] bg-gradient-to-r from-ocean-950 via-ocean-950 to-emerald-950 px-4 py-3">
        {icon && (
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-400/20 text-emerald-300 ring-1 ring-emerald-400/40">
            {icon}
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate font-semibold text-white">{title}</span>
          <span className="block truncate text-xs text-emerald-100/80">{body}</span>
        </span>
        <span className="shrink-0 rounded-full bg-emerald-400 px-4 py-2 text-sm font-bold text-ocean-950 shadow-[0_0_16px_rgba(52,211,153,0.6)] transition-colors group-hover:bg-emerald-300">
          {cta}
        </span>
      </span>
    </Link>
  );
}
