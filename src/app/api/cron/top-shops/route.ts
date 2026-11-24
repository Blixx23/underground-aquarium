import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { lockInQuarter, previousQuarter } from "@/lib/stores/topShops";

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
  return NextResponse.json({ quarter, added: out.added });
}
