import { NextResponse } from "next/server";

// Family memberships were retired. Every member has their own membership
// now, so this endpoint only answers that it's gone.
const gone = () =>
  NextResponse.json(
    { error: "Family memberships are no longer offered. Each member has their own membership." },
    { status: 410 }
  );

export async function GET() {
  return gone();
}
export async function POST() {
  return gone();
}
export async function DELETE() {
  return gone();
}
