"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Loader2, Search, X } from "lucide-react";

/**
 * The admin shop search. Results follow the box as you type (a short pause
 * after the last key), so clearing the box brings every shop straight back
 * without pressing anything. Enter and the Search button still work, and
 * the X clears it in one tap. The current view (All / Claimed / Hidden)
 * is kept.
 */
export default function AdminShopSearch({ initial }: { initial: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(initial);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);
  const lastSent = useRef(initial.trim());

  // Back/forward or a link changed the URL: keep the box in step. Skip it
  // when the change is our own search landing, so typing is never undone.
  useEffect(() => {
    if (initial.trim() === lastSent.current) return;
    setValue(initial);
    lastSent.current = initial.trim();
  }, [initial]);

  function go(raw: string) {
    const q = raw.trim();
    if (q === lastSent.current) return;
    lastSent.current = q;
    const next = new URLSearchParams(params.toString());
    if (q) next.set("q", q);
    else next.delete("q");
    const s = next.toString();
    startTransition(() => router.replace(`${pathname}${s ? `?${s}` : ""}`, { scroll: false }));
  }

  // Search as you type, after a short pause.
  useEffect(() => {
    const t = setTimeout(() => go(value), 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <form
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        go(value);
      }}
      className="mb-4 flex gap-2"
    >
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-500" />
        <input
          ref={inputRef}
          name="q"
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Escape" && value) {
              e.preventDefault();
              setValue("");
            }
          }}
          autoComplete="off"
          placeholder="Shop name, city or state"
          aria-label="Search shops by name, city or state"
          className="w-full rounded-xl border border-ocean-700 bg-ocean-900 py-2.5 pl-9 pr-10 text-base text-white placeholder:text-ocean-500 sm:text-sm"
        />
        {pending ? (
          <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-ocean-400" />
        ) : (
          value && (
            <button
              type="button"
              onClick={() => {
                setValue("");
                go("");
                inputRef.current?.focus();
              }}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1 text-ocean-400 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )
        )}
      </div>
      <button
        type="submit"
        className="rounded-xl border border-amber-400/40 bg-amber-400/10 px-4 text-sm font-medium text-amber-200 hover:bg-amber-400/20"
      >
        Search
      </button>
    </form>
  );
}
