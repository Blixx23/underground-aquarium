import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/session";
import { PAID_MARKETPLACE_ENABLED, POST_AD_PATH } from "@/lib/config";

// Pages that only make sense when the paid marketplace is running.
// While it's off, anyone landing here gets sent to the free posting flow.
// Deliberately NOT listed: /orders, /sell/sales, /sell/payouts,
// /sell/finances, /sell/shipping and /sell/listings — those are the
// wind-down path for orders that were already paid for, and they stay
// reachable until every open order has cleared.
const PAID_ONLY_PATHS = ["/sell", "/sell/setup"];

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
