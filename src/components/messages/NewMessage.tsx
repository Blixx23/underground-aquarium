"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PenSquare, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Person = {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  /** How you know them: "You follow", "Follows you", "Talked before". */
  why?: string;
};

const COLS = "id, username, full_name, avatar_url";

/**
 * "New message": your people first (who you follow, who follows you, who
 * you've talked to), then anyone else on the site as you type.
 */
export default function NewMessage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [linked, setLinked] = useState<Person[] | null>(null);
  const [others, setOthers] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement>(null);
  const [supabase] = useState(() => createClient());

  useEffect(() => {
    if (open) box.current?.focus();
  }, [open]);

  // Your people, loaded once when the box opens.
  useEffect(() => {
    if (!open || linked) return;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setLinked([]);
        return;
      }
      const [{ data: iFollow }, { data: followMe }, { data: talks }] = await Promise.all([
        supabase.from("follows").select("following_id").eq("follower_id", user.id).limit(500),
        supabase.from("follows").select("follower_id").eq("following_id", user.id).limit(500),
        supabase.from("listing_threads").select("buyer_id, seller_id").limit(200),
      ]);
      const why = new Map<string, string>();
      for (const r of (talks ?? []) as { buyer_id: string; seller_id: string }[]) {
        const other = r.buyer_id === user.id ? r.seller_id : r.buyer_id;
        if (other && other !== user.id) why.set(other, "Talked before");
      }
      for (const r of (iFollow ?? []) as { following_id: string }[]) {
        if (!why.has(r.following_id)) why.set(r.following_id, "You follow");
      }
      for (const r of (followMe ?? []) as { follower_id: string }[]) {
        if (!why.has(r.follower_id)) why.set(r.follower_id, "Follows you");
      }
      const ids = [...why.keys()];
      if (ids.length === 0) {
        setLinked([]);
        return;
      }
      const { data: profs } = await supabase
        .from("profiles")
        .select(COLS)
        .in("id", ids.slice(0, 500))
        .not("username", "is", null)
        .is("deleted_at", null);
      const list = ((profs ?? []) as Person[])
        .map((p) => ({ ...p, why: why.get(p.id) }))
        .sort((a, b) => (a.full_name || a.username).localeCompare(b.full_name || b.username));
      setLinked(list);
    })();
  }, [open, linked, supabase]);

  const term = q.trim().replace(/^@/, "").toLowerCase();

  // Your people who match what's typed (all of them when nothing is typed).
  const linkedMatches = useMemo(() => {
    const list = linked ?? [];
    if (!term) return list.slice(0, 12);
    return list.filter(
      (p) => p.username.toLowerCase().includes(term) || (p.full_name ?? "").toLowerCase().includes(term)
    );
  }, [linked, term]);

  // Everyone else on the site, once two letters are typed.
  useEffect(() => {
    if (term.length < 2) {
      setOthers([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      setBusy(true);
      const safe = term.replace(/[%_,()]/g, "");
      const { data } = await supabase
        .from("profiles")
        .select(COLS)
        .not("username", "is", null)
        .is("deleted_at", null)
        .or(`username.ilike.%${safe}%,full_name.ilike.%${safe}%`)
        .limit(10);
      if (alive) {
        const mine = new Set((linked ?? []).map((p) => p.id));
        setOthers(((data ?? []) as Person[]).filter((p) => p.username && !mine.has(p.id)));
        setBusy(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [term, linked, supabase]);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-ocean-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-ocean-400"
      >
        <PenSquare className="h-4 w-4" /> New message
      </button>
    );
  }

  const row = (p: Person) => (
    <li key={p.id}>
      <button
        type="button"
        onClick={() => router.push(`/messages/new?to=${encodeURIComponent(p.username)}`)}
        className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-white/5"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full bg-ocean-700 text-xs font-semibold uppercase text-white">
          {p.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            (p.full_name || p.username).slice(0, 1)
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm text-white">{p.full_name || p.username}</span>
          <span className="block truncate text-xs text-ocean-400">@{p.username}</span>
        </span>
        {p.why && <span className="shrink-0 text-[11px] text-emerald-300/80">{p.why}</span>}
      </button>
    </li>
  );

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-ocean-900/60 p-3 sm:min-w-[22rem]">
      {/* A search box, not a login field: tell browsers and password
          managers not to offer saved emails or passwords here. */}
      <form role="search" autoComplete="off" onSubmit={(e) => e.preventDefault()} className="flex items-center gap-2">
        <Search className="h-4 w-4 shrink-0 text-ocean-400" />
        <input
          ref={box}
          type="search"
          name="find-member"
          inputMode="search"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
          data-1p-ignore="true"
          data-lpignore="true"
          data-form-type="other"
          aria-label="Find a member to message"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Find a member by name"
          className="min-w-0 flex-1 appearance-none bg-transparent py-1.5 text-sm text-white placeholder:text-ocean-500 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-ocean-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </form>

      {linked === null ? (
        <p className="mt-2 px-2 py-2 text-sm text-ocean-400">Loading your people…</p>
      ) : (
        <>
          {linkedMatches.length > 0 && (
            <>
              <p className="mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-ocean-500">
                {term ? "Your people" : "People you know here"}
              </p>
              <ul className="mt-1 divide-y divide-white/5">{linkedMatches.map(row)}</ul>
            </>
          )}
          {term.length >= 2 && others.length > 0 && (
            <>
              <p className="mt-3 px-2 text-[11px] font-semibold uppercase tracking-wider text-ocean-500">
                Everyone else
              </p>
              <ul className="mt-1 divide-y divide-white/5">{others.map(row)}</ul>
            </>
          )}
          {term.length >= 2 && !busy && linkedMatches.length === 0 && others.length === 0 && (
            <p className="mt-2 px-2 py-2 text-sm text-ocean-400">No members match that.</p>
          )}
          {!term && linkedMatches.length === 0 && (
            <p className="mt-2 px-2 py-2 text-sm text-ocean-400">
              Type a name to find anyone on Underground Aquarium.
            </p>
          )}
        </>
      )}
    </div>
  );
}
