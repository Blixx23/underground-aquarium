"use client";

import { createClient } from "@/lib/supabase/client";

export type OwnedShop = { name: string; slug: string; logo_url: string | null };

/**
 * Which shops a member owns, for the "Owner of …" line on posts and comments.
 * A feed page shows many authors at once, so lookups made in the same moment
 * are batched into one request, and every answer is remembered for the visit.
 */
const known = new Map<string, OwnedShop[]>();
const waiting = new Map<string, ((v: OwnedShop[]) => void)[]>();
let timer: ReturnType<typeof setTimeout> | null = null;

async function flush() {
  timer = null;
  const ids = [...waiting.keys()];
  const callbacks = new Map(waiting);
  waiting.clear();
  const found = new Map<string, OwnedShop[]>(ids.map((id) => [id, []]));
  try {
    const { data } = await createClient().rpc("shops_owned_by", { p_users: ids });
    for (const r of (data ?? []) as { user_id: string; name: string; slug: string; logo_url: string | null }[]) {
      found.get(r.user_id)?.push({ name: r.name, slug: r.slug, logo_url: r.logo_url });
    }
  } catch {
    /* no label is fine */
  }
  for (const [id, list] of found) {
    known.set(id, list);
    for (const cb of callbacks.get(id) ?? []) cb(list);
  }
}

export function ownedShops(userId: string): Promise<OwnedShop[]> {
  const hit = known.get(userId);
  if (hit) return Promise.resolve(hit);
  return new Promise((resolve) => {
    waiting.set(userId, [...(waiting.get(userId) ?? []), resolve]);
    if (!timer) timer = setTimeout(flush, 30);
  });
}
