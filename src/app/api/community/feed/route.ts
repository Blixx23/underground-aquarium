import { NextResponse } from "next/server";
import { getFeedPage } from "@/lib/communityFeed";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const offset = Math.max(0, parseInt(searchParams.get("offset") ?? "0", 10) || 0);
  const limit = Math.min(
    40,
    Math.max(1, parseInt(searchParams.get("limit") ?? "20", 10) || 20)
  );

  try {
    const { items, hasMore } = await getFeedPage(offset, limit);
    return NextResponse.json({ items, hasMore });
  } catch (err) {
    console.error("Community feed error:", err);
    return NextResponse.json({ items: [], hasMore: false });
  }
}
