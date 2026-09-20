"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";

type Row = { user_id: string; username: string | null; name: string; avatar_url: string | null };

/** Your blocked accounts, with a one-tap unblock. */
export default function BlockedList() {
  const [supabase] = useState(() => createClient());
  const [rows, setRows] = useState<Row[] | null>(null);

  useEffect(() => {
    supabase.rpc("my_blocks").then(({ data }) => setRows((data ?? []) as Row[]));
  }, [supabase]);

  async function unblock(id: string) {
    const { error } = await supabase.rpc("unblock_user", { p_user: id });
    if (!error) setRows((r) => (r ?? []).filter((x) => x.user_id !== id));
  }

  if (rows === null) return <p className="text-sm text-ocean-500">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-ocean-500">You haven&apos;t blocked anyone.</p>;

  return (
    <ul className="divide-y divide-white/5">
      {rows.map((r) => (
        <li key={r.user_id} className="flex items-center gap-3 py-2.5">
          <Avatar name={r.name} src={r.avatar_url} size={32} />
          <span className="min-w-0 flex-1 truncate text-sm text-white">
            {r.username ? (
              <Link href={`/u/${r.username}`} className="hover:underline">
                {r.name}
              </Link>
            ) : (
              r.name
            )}
          </span>
          <button
            type="button"
            onClick={() => unblock(r.user_id)}
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs text-ocean-200 hover:bg-white/5"
          >
            Unblock
          </button>
        </li>
      ))}
    </ul>
  );
}
