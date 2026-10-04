"use client";

import { useEffect, useMemo, useRef, useState, type RefObject } from "react";
import { createClient } from "@/lib/supabase/client";
import Avatar from "@/components/profile/Avatar";

type Person = { id: string; username: string; full_name: string | null; avatar_url: string | null };

/** The "@abc" being typed right before the cursor, if any. */
function activeQuery(value: string, caret: number): { start: number; q: string } | null {
  const before = value.slice(0, caret);
  const m = before.match(/(^|[^A-Za-z0-9_@./])@([A-Za-z0-9_]{0,24})$/);
  if (!m) return null;
  return { start: caret - m[2].length - 1, q: m[2] };
}

/**
 * Type "@" in a box and pick a member from the list. Sits under any
 * textarea: pass its ref, its value, and how to set the value.
 *
 * Arrow keys move, Enter or Tab picks, Escape closes. Keys are caught
 * before the box's own handlers, so Enter picks a name instead of posting.
 */
export default function MentionPicker({
  inputRef,
  value,
  onChange,
  className = "",
}: {
  inputRef: RefObject<HTMLTextAreaElement | HTMLInputElement | null>;
  value: string;
  onChange: (next: string) => void;
  /** Where the list sits; defaults to just under the box. */
  className?: string;
}) {
  const supabase = useMemo(() => createClient(), []);
  const [query, setQuery] = useState<{ start: number; q: string } | null>(null);
  const [people, setPeople] = useState<Person[]>([]);
  const [active, setActive] = useState(0);
  const latest = useRef({ value, query, people, active, onChange });
  latest.current = { value, query, people, active, onChange };

  // Work out what's being typed whenever the text or the cursor moves.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const check = () => {
      const caret = el.selectionStart ?? el.value.length;
      if (el.selectionEnd !== caret) return setQuery(null);
      setQuery(activeQuery(el.value, caret));
    };
    const close = () => setTimeout(() => setQuery(null), 150);
    el.addEventListener("input", check);
    el.addEventListener("click", check);
    el.addEventListener("keyup", check);
    el.addEventListener("blur", close);
    return () => {
      el.removeEventListener("input", check);
      el.removeEventListener("click", check);
      el.removeEventListener("keyup", check);
      el.removeEventListener("blur", close);
    };
  }, [inputRef]);

  // Look people up once a letter is typed after the @.
  useEffect(() => {
    if (!query || query.q.length < 1) {
      setPeople([]);
      return;
    }
    let alive = true;
    const t = setTimeout(async () => {
      const safe = query.q.replace(/[%_,()]/g, "");
      const { data } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .not("username", "is", null)
        .is("deleted_at", null)
        .or(`username.ilike.${safe}%,full_name.ilike.${safe}%`)
        .limit(6);
      if (!alive) return;
      setPeople(((data ?? []) as Person[]).filter((p) => p.username));
      setActive(0);
    }, 150);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, supabase]);

  function pick(p: Person) {
    const { value: v, query: q, onChange: set } = latest.current;
    const el = inputRef.current;
    if (!q || !el) return;
    const end = q.start + 1 + q.q.length;
    const insert = `@${p.username} `;
    const next = v.slice(0, q.start) + insert + v.slice(end);
    set(next);
    setQuery(null);
    setPeople([]);
    const caret = q.start + insert.length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  }

  // Catch the keys first so Enter picks a name instead of sending the post.
  useEffect(() => {
    const el = inputRef.current;
    if (!el) return;
    const onKey = (e: Event) => {
      const k = e as KeyboardEvent;
      const { people: list, active: i, query: q } = latest.current;
      if (!q || list.length === 0) return;
      if (k.key === "ArrowDown") setActive((i + 1) % list.length);
      else if (k.key === "ArrowUp") setActive((i - 1 + list.length) % list.length);
      else if (k.key === "Enter" || k.key === "Tab") pick(list[i]);
      else if (k.key === "Escape") setQuery(null);
      else return;
      k.preventDefault();
      k.stopPropagation();
    };
    el.addEventListener("keydown", onKey);
    return () => el.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputRef]);

  if (!query || people.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="Mention a member"
      className={`absolute left-0 right-0 top-full z-40 mt-1 max-h-64 overflow-auto rounded-xl border border-ocean-700/70 bg-ocean-950/95 p-1 shadow-xl shadow-black/50 backdrop-blur ${className}`}
    >
      {people.map((p, i) => (
        <li key={p.id} role="option" aria-selected={i === active}>
          <button
            type="button"
            // mousedown, not click: picking must happen before the box loses focus.
            onMouseDown={(e) => {
              e.preventDefault();
              pick(p);
            }}
            onMouseEnter={() => setActive(i)}
            className={`flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left ${
              i === active ? "bg-ocean-800/80" : ""
            }`}
          >
            <Avatar src={p.avatar_url} name={p.full_name || p.username} size={28} />
            <span className="min-w-0">
              <span className="block truncate text-sm text-white">{p.full_name || p.username}</span>
              <span className="block truncate text-xs text-ocean-400">@{p.username}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

/** After saving something written in the browser, tell anyone it @tags. Fire and forget. */
export function sendMentions(payload: Record<string, string | undefined>) {
  fetch("/api/mentions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    keepalive: true,
  }).catch(() => {});
}
