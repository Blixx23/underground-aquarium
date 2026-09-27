"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { PenSquare, Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Person = { username: string; full_name: string | null; avatar_url: string | null };

/** "New message": find a member by name or @username and start a conversation. */
export default function NewMessage() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) box.current?.focus();
  }, [open]);

  useEffect(() => {
    const term = q.trim().replace(/^@/, "");
    if (term.length < 2) {
      setPeople([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      setBusy(true);
      const supabase = createClient();
      const safe = term.replace(/[%_,()]/g, "");
      const { data } = await supabase
        .from("profiles")
        .select("username, full_name, avatar_url")
        .not("username", "is", null)
        .is("deleted_at", null)
        .or(`username.ilike.%${safe}%,full_name.ilike.%${safe}%`)
        .limit(8);
      if (alive) {
        setPeople(((data ?? []) as Person[]).filter((p) => p.username));
        setBusy(false);
      }
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [q]);

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

  return (
    <div className="w-full rounded-2xl border border-white/10 bg-ocean-900/60 p-3">
      <div className="flex items-center gap-2">
        <Search className="h-4 w-4 shrink-0 text-ocean-400" />
        <input
          ref={box}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Who do you want to message? Name or @username"
          className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-white placeholder:text-ocean-500 focus:outline-none"
        />
        <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="p-1 text-ocean-400 hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
      {q.trim().length >= 2 && (
        <ul className="mt-2 divide-y divide-white/5">
          {people.map((p) => (
            <li key={p.username}>
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
                <span className="min-w-0">
                  <span className="block truncate text-sm text-white">{p.full_name || p.username}</span>
                  <span className="block truncate text-xs text-ocean-400">@{p.username}</span>
                </span>
              </button>
            </li>
          ))}
          {!busy && people.length === 0 && <li className="px-2 py-2 text-sm text-ocean-400">No members match that.</li>}
        </ul>
      )}
    </div>
  );
}
