import "server-only";
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";

/**
 * Limits on repeated attempts. Each action allows a generous number of uses
 * per window for one member (or one network address when signed out), well
 * above what a real person does, so only scripts and spammers ever hit it.
 * If the counter can't be reached the request goes through: a limit should
 * never break the site for everyone.
 */

export const LIMITS = {
  message: { max: 30, windowSec: 60 },
  forumPost: { max: 10, windowSec: 60 },
  report: { max: 10, windowSec: 600 },
  feedback: { max: 10, windowSec: 600 },
  // Signed-out limits count by network address, which phone carriers and offices share, so these stay high.
  search: { max: 120, windowSec: 60 },
  geocode: { max: 60, windowSec: 60 },
  imageConvert: { max: 30, windowSec: 60 },
  accountExport: { max: 3, windowSec: 3600 },
  invite: { max: 20, windowSec: 3600 },
} as const;

export type LimitName = keyof typeof LIMITS;

/** The caller's network address, as Vercel reports it. */
export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  return (fwd?.split(",")[0] ?? req.headers.get("x-real-ip") ?? "unknown").trim();
}

/** True when this use is within the limit. */
export async function withinLimit(name: LimitName, who: string): Promise<boolean> {
  const { max, windowSec } = LIMITS[name];
  try {
    const { data, error } = await supabaseAdmin.rpc("hit_rate_limit", {
      p_key: `${name}:${who}`,
      p_limit: max,
      p_window_seconds: windowSec,
    });
    if (error) return true;
    return data !== false;
  } catch {
    return true;
  }
}

/** The polite "slow down" answer. */
export function tooMany(): NextResponse {
  return NextResponse.json(
    { error: "You're doing that a lot. Please wait a minute and try again." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

/**
 * One line for a route: returns the 429 response when over the limit, or null.
 * Pass the signed-in member's id when there is one; otherwise the address is used.
 */
export async function limit(name: LimitName, req: Request, userId?: string | null): Promise<NextResponse | null> {
  return (await withinLimit(name, userId || clientIp(req))) ? null : tooMany();
}
