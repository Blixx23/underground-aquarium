import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";
import {
  PAID_MARKETPLACE_ENABLED,
  POST_AD_PATH,
  SOCIETY_PATH,
  SOCIETY_SLUG,
} from "@/lib/config";

// Pages that only make sense when the paid marketplace is running.
// While it's off, anyone landing here gets sent to the free posting flow.
// Deliberately NOT listed: /orders, /sell/sales, /sell/payouts,
// /sell/finances, /sell/shipping and /sell/listings — those are the
// wind-down path for orders that were already paid for, and they stay
// reachable until every open order has cleared.
const PAID_ONLY_PATHS = ["/sell", "/sell/setup"];

// /marketplace/:something used to be an old paid product page. That slot now
// belongs to state codes (/marketplace/ca), so anything in it that isn't a
// two-letter state is sent to the listing page of the same slug. The 17
// migrated products kept their original slugs, so their old links still land
// on the right listing.
const LEGACY_PRODUCT_PATH = /^\/marketplace\/([^/]+)\/?$/;

// The multi-club directory is gone. There is one society now, so every
// /clubs URL — the index, discover, new, start — lands on its front door.
const LEGACY_CLUBS_PATH = /^\/clubs(\/.*)?$/;

// The Society's club-era award pages. Submissions now go through spawn logs
// and rulings through the judge's desk; the old forms would only lead to an
// error from the database. Deliberately NOT redirected: the club page itself
// (it holds the join form, so applicants must be able to reach it), /admin
// (dues and roster), and /awards/list (the species point list).
const SOCIETY_LEGACY_AWARDS: Record<string, string> = {
  [`/c/${SOCIETY_SLUG}/awards`]: "/society/leaderboard",
  [`/c/${SOCIETY_SLUG}/awards/submit`]: "/society/breeder/new",
  [`/c/${SOCIETY_SLUG}/awards/review`]: "/society/judge",
};

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (
    !PAID_MARKETPLACE_ENABLED &&
    PAID_ONLY_PATHS.includes(pathname) &&
    !PAID_ONLY_PATHS.includes(POST_AD_PATH)
  ) {
    const url = request.nextUrl.clone();
    url.pathname = POST_AD_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const societyTarget = SOCIETY_LEGACY_AWARDS[pathname.replace(/\/$/, "")];
  if (societyTarget) {
    const url = request.nextUrl.clone();
    url.pathname = societyTarget;
    return NextResponse.redirect(url);
  }

  if (LEGACY_CLUBS_PATH.test(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = SOCIETY_PATH;
    url.search = "";
    return NextResponse.redirect(url);
  }

  const legacy = pathname.match(LEGACY_PRODUCT_PATH);
  if (legacy && !/^[a-z]{2}$/i.test(legacy[1])) {
    const url = request.nextUrl.clone();
    url.pathname = `/listing/${legacy[1]}`;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Run on all routes except static files, image optimization, and the
     * favicon — those never need a session refresh.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
