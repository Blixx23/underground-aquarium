import { NextResponse } from "next/server";
import { alertSiteError } from "@/lib/ops/errorAlert";
import { clientIp, withinLimit } from "@/lib/rateLimit";

export const dynamic = "force-dynamic";

/**
 * A page that crashed in a visitor's browser reports here (from the error
 * screen). Limited per network address so nobody can use it to flood the inbox.
 */
export async function POST(req: Request) {
  if (!(await withinLimit("clientError", clientIp(req)))) return NextResponse.json({ ok: true });
  const body = (await req.json().catch(() => null)) as { where?: unknown; message?: unknown; digest?: unknown } | null;
  const where = typeof body?.where === "string" && body.where.startsWith("/") ? body.where.slice(0, 200) : "/";
  const message = typeof body?.message === "string" ? body.message.slice(0, 300) : "Unknown error";
  const digest = typeof body?.digest === "string" ? body.digest.slice(0, 60) : null;
  await alertSiteError({ where, message, digest, source: "browser" });
  return NextResponse.json({ ok: true });
}
