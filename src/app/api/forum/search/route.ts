import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type SearchRow = {
  thread_id: string;
  thread_slug: string;
  title: string;
  category_slug: string;
  category_name: string;
  snippet: string | null;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();

  // Require 3+ characters before hitting the database.
  if (q.length < 3) {
    return NextResponse.json({ results: [] });
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("search_forum", {
      p_q: q,
      p_limit: 6,
    });
    if (error) throw error;

    const results = ((data ?? []) as SearchRow[]).map((r) => ({
      thread_id: r.thread_id,
      thread_slug: r.thread_slug,
      title: r.title,
      category_slug: r.category_slug,
      category_name: r.category_name,
      snippet: r.snippet,
    }));
    return NextResponse.json({ results });
  } catch (err) {
    // Typeahead should fail quietly — never surface an error to the dropdown.
    console.error("Forum search error:", err);
    return NextResponse.json({ results: [] });
  }
}
