"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, Loader2 } from "lucide-react";

type Result = {
  thread_id: string;
  thread_slug: string;
  title: string;
  category_slug: string;
  category_name: string;
  snippet: string | null;
};

const MIN_CHARS = 3;
const DEBOUNCE_MS = 280;

// Render «mark» … «/mark» sentinels as real <mark> nodes (no HTML injection).
function Highlighted({ text }: { text: string }) {
  const nodes: React.ReactNode[] = [];
  const re = /«mark»([\s\S]*?)«\/mark»/g;
  let last = 0;
  let i = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    nodes.push(
      <mark key={i++} className="rounded bg-amber-300/25 px-0.5 text-amber-100">
        {m[1]}
      </mark>
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return <>{nodes}</>;
}

export default function ForumSearchBar({
  initialQuery = "",
  autoFocus = false,
}: {
  initialQuery?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQuery);
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const boxRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Debounced typeahead: fire one query after the user pauses, 3+ chars only,
  // cancelling any in-flight request.
  useEffect(() => {
    const term = q.trim();
    if (term.length < MIN_CHARS) {
      setResults([]);
      setLoading(false);
      abortRef.current?.abort();
      return;
    }
    setLoading(true);
    const id = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const res = await fetch(
          `/api/forum/search?q=${encodeURIComponent(term)}`,
          { signal: ctrl.signal }
        );
        const data = await res.json();
        setResults((data.results ?? []) as Result[]);
        setActive(-1);
      } catch {
        // aborted or failed — leave results as-is
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
    return () => clearTimeout(id);
  }, [q]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function goToResults(term: string) {
    const t = term.trim();
    if (t.length < MIN_CHARS) return;
    setOpen(false);
    router.push(`/forums/search?q=${encodeURIComponent(t)}`);
  }

  function goToThread(r: Result) {
    setOpen(false);
    router.push(`/forums/${r.category_slug}/${r.thread_slug}`);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (!open || results.length === 0) {
      if (e.key === "Enter") goToResults(q);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, -1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && active < results.length) goToThread(results[active]);
      else goToResults(q);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  const showDropdown =
    open && q.trim().length >= MIN_CHARS && (loading || results.length > 0);

  return (
    <div ref={boxRef} className="relative">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          goToResults(q);
        }}
      >
        <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-500" />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ocean-500 animate-spin" />
        )}
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus={autoFocus}
          type="search"
          enterKeyHint="search"
          placeholder="Search the forums…"
          aria-label="Search the forums"
          className="w-full rounded-2xl bg-ocean-900/40 border border-ocean-800/60 pl-10 pr-10 py-2.5 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors"
        />
      </form>

      {showDropdown && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-2xl border border-ocean-800/70 bg-ocean-950/95 backdrop-blur shadow-xl">
          {results.length === 0 && !loading ? (
            <p className="px-4 py-3 text-sm text-ocean-500">No matches yet.</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {results.map((r, idx) => (
                <li key={r.thread_id}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => goToThread(r)}
                    className={`block w-full text-left px-4 py-2.5 border-b border-ocean-800/40 last:border-0 transition-colors ${
                      active === idx ? "bg-ocean-800/40" : "hover:bg-ocean-800/30"
                    }`}
                  >
                    <div className="text-xs text-ocean-500 mb-0.5">
                      {r.category_name}
                    </div>
                    <div className="text-sm text-white truncate">{r.title}</div>
                    {r.snippet && (
                      <div className="text-xs text-ocean-400 mt-0.5 line-clamp-1">
                        <Highlighted text={r.snippet} />
                      </div>
                    )}
                  </button>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={() => goToResults(q)}
                  className="block w-full text-left px-4 py-2.5 text-xs font-medium text-ocean-300 hover:bg-ocean-800/30 transition-colors"
                >
                  See all results for &ldquo;{q.trim()}&rdquo; →
                </button>
              </li>
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
