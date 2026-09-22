import { NextResponse } from "next/server";
import { runWorker } from "@/lib/email/queue";
import { cronAuthorised } from "@/lib/email/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Sends what the queue is holding. Runs every two minutes; claims a
 * chunk, delivers it, and marks each row sent only once the provider
 * has taken it. Add ?dry=1 to see what it would claim without sending.
 */
export async function GET(req: Request) {
  if (!cronAuthorised(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dry = new URL(req.url).searchParams.get("dry") === "1";
  try {
    const result = await runWorker({ dry });
    return NextResponse.json({ ran: true, dry, ...result });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Worker failed";
    console.error("[email worker]", message);
    return NextResponse.json({ ran: false, error: message }, { status: 500 });
  }
}
