import { NextResponse } from "next/server";
import { cronAuthorised } from "@/lib/email/cronAuth";
import { pushPending } from "@/lib/push/send";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Every minute: pushes any recent bell notification the database's instant
 * ping missed (a timeout, a deploy in progress). Usually finds nothing.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json({ ran: true, ...(await pushPending()) });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Failed";
    console.error("[push sweep]", message);
    return NextResponse.json({ ran: false, error: message }, { status: 500 });
  }
}
