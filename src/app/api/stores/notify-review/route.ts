import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Kept so the review form's call still succeeds. The owner's alert is now
 * sent by the database the moment a review is saved (shop_review), with
 * the stars, the review text and an email, so nothing needs doing here.
 */
export async function POST() {
  return NextResponse.json({ ok: true });
}
