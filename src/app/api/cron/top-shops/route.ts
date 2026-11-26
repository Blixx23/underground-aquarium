import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { lockInQuarter, previousQuarter } from "@/lib/stores/topShops";
import { topShopAwardNotices } from "@/lib/nudges";

export const dynamic = "force-dynamic";

/**
 * Runs on the first day of each quarter and locks in the quarter that just
 * ended: its Top 100 get their badge and land on the admin reward list.
 * Running it again does nothing; a quarter is only locked in once.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const quarter = previousQuarter();
  const out = await lockInQuarter(quarter);
  if (out.error) return NextResponse.json({ quarter, error: out.error }, { status: 500 });
  // Tell each owner which badge their shop earned. Safe to repeat: already-told owners are skipped.
  const notified = await topShopAwardNotices(quarter).catch((e) => {
    console.error("[top shops] notices", e);
    return 0;
  });
  return NextResponse.json({ quarter, added: out.added, notified });
}
