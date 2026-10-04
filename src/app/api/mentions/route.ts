import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { notifyMentions } from "@/lib/mentions.server";

/**
 * Feed posts, feed comments and tank comments are saved straight from the
 * browser, so the browser calls this right after to tell anyone @tagged.
 *
 * The browser only says which thing it just wrote. The words are read back
 * from the database, and only from the caller's own recent writing, so this
 * can't be used to send notices about text nobody posted.
 *
 *   { kind: "feed_post", id? }                    newest post, or this one after an edit
 *   { kind: "comment", item_kind, item_id }       newest comment on a feed item
 *   { kind: "tank_comment", tank_id }             newest comment on a tank
 */

const RECENT_MS = 10 * 60 * 1000;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const recent = (iso: string | null | undefined) => !!iso && Date.now() - new Date(iso).getTime() < RECENT_MS;

export async function POST(req: Request) {
  let p: { kind?: string; id?: string; item_kind?: string; item_id?: string; tank_id?: string };
  try {
    p = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });

  if (p.kind === "feed_post") {
    let q = supabaseAdmin.from("feed_posts").select("id, body, created_at").eq("user_id", user.id);
    q = p.id && UUID.test(p.id) ? q.eq("id", p.id) : q.order("created_at", { ascending: false }).limit(1);
    const { data } = await q.maybeSingle();
    const post = data as { id: string; body: string | null; created_at: string } | null;
    // An edit can be of an older post; a new post must be the one just written.
    if (post && (p.id || recent(post.created_at))) {
      await notifyMentions({ authorId: user.id, text: post.body, link: `/feed/${post.id}`, where: "a post" });
    }
    return NextResponse.json({ ok: true });
  }

  if (p.kind === "comment" && p.item_kind && p.item_id && UUID.test(p.item_id)) {
    // The same list the page shows, read as the caller.
    const { data } = await supabase.rpc("get_item_comments", { p_kind: p.item_kind, p_id: p.item_id });
    type Row = { id: string; user_id: string; parent_id: string | null; body: string; created_at: string };
    const all = (data as Row[] | null) ?? [];
    const mine = all
      .filter((c) => c.user_id === user.id && recent(c.created_at))
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0];
    if (mine) {
      let link = "/feed";
      let owner: string | null = null;
      if (p.item_kind === "post") {
        link = `/feed/${p.item_id}`;
        const { data: o } = await supabaseAdmin.from("feed_posts").select("user_id").eq("id", p.item_id).maybeSingle();
        owner = (o?.user_id as string | undefined) ?? null;
      } else if (p.item_kind === "tank") {
        link = `/tanks/${p.item_id}`;
        const { data: o } = await supabaseAdmin.from("tanks").select("user_id").eq("id", p.item_id).maybeSingle();
        owner = (o?.user_id as string | undefined) ?? null;
      } else if (p.item_kind === "listing") {
        const { data: l } = await supabaseAdmin.from("listings").select("slug, user_id").eq("id", p.item_id).maybeSingle();
        if (l?.slug) link = `/listing/${l.slug}`;
        owner = (l?.user_id as string | undefined) ?? null;
      }
      // The item's owner and the person replied to already get a comment or
      // reply notice for this; don't send them a second one.
      const parentAuthor = mine.parent_id ? all.find((c) => c.id === mine.parent_id)?.user_id ?? null : null;
      // One notice per comment: the link alone would be the same for every
      // comment on the item, so tell them about this comment by its own anchor.
      await notifyMentions({
        authorId: user.id,
        text: mine.body,
        link: `${link}#comment-${mine.id}`,
        where: "a comment",
        skip: [owner, parentAuthor],
      });
    }
    return NextResponse.json({ ok: true });
  }

  if (p.kind === "tank_comment" && p.tank_id && UUID.test(p.tank_id)) {
    const [{ data: tank }, { data }] = await Promise.all([
      supabaseAdmin.from("tanks").select("is_public").eq("id", p.tank_id).maybeSingle(),
      supabaseAdmin
        .from("tank_comments")
        .select("id, body, created_at")
        .eq("tank_id", p.tank_id)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    const c = data as { id: string; body: string; created_at: string } | null;
    if (tank?.is_public && c && recent(c.created_at)) {
      await notifyMentions({
        authorId: user.id,
        text: c.body,
        link: `/tanks/${p.tank_id}#comment-${c.id}`,
        where: "a comment on a tank",
      });
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Nothing to do." }, { status: 400 });
}
