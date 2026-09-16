import { NextResponse } from "next/server";
import {
  BUILD_SHA,
  BUILD_SHA_FULL,
  BUILD_REF,
  BUILD_MESSAGE,
  BUILD_ENV,
  BUILD_ID,
} from "@/lib/version";

// Read at request time, not baked into a static page, so this always
// reports the deploy that is actually serving traffic.
export const dynamic = "force-dynamic";

/**
 * GET /api/version
 *
 * The long form of the footer stamp. Useful for checking what's live
 * without opening the site, and for confirming a deploy actually went
 * out rather than trusting the dashboard.
 *
 *   curl -s https://undergroundaquarium.com/api/version
 */
export async function GET() {
  return NextResponse.json(
    {
      sha: BUILD_SHA,
      shaFull: BUILD_SHA_FULL || null,
      branch: BUILD_REF,
      commitMessage: BUILD_MESSAGE || null,
      environment: BUILD_ENV,
      deploymentId: BUILD_ID || null,
      servedAt: new Date().toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
