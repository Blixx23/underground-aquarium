"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Search, X, Check, PenLine } from "lucide-react";
import type { AwardSpecies } from "@/components/society/SpeciesBrowser";

/** The value used when the fish isn't on the point list. */
export const SPECIES_OTHER = "__other__";

const MAX_RESULTS = 60;

/**
 * Type-to-search species picker.
 *
 * Matches common and scientific names anywhere in the word, so "apisto",
 * "cacatu" and "Apistogramma" all find the same fish. Arrow keys move,
 * Enter picks, Escape closes. "Not on the list" is always the last row,
 * so someone whose fish is missing is never stuck.
 */
export default function SpeciesPicker({
  species,
  value,
  onChange,
}: {
  species: AwardSpecies[];
  value: string;
  /** `typed` is what was in the search box, so "Not on the list" can carry it over. */
  onChange: (value: string, typed?: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const selected = species.find((s) => s.id === value) ?? null;
  const isOther = value === SPECIES_OTHER;

  const sorted = useMemo(
    () => species.slice().sort((a, b) => a.common_name.localeCompare(b.common_name)),
    [species]
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sorted.slice(0, MAX_RESULTS);
    const words = q.split(/\s+/);
    const scored = sorted
      .map((s) => {
        const common = s.common_name.toLowerCase();
        const sci = (s.scientific_name ?? "").toLowerCase();
        const hay = `${common} ${sci} ${(s.category ?? "").toLowerCase()}`;
        if (!words.every((w) => hay.includes(w))) return null;
        // Names that start with what you typed come first.
        const score = common.startsWith(q) ? 0 : sci.startsWith(q) ? 1 : 2;
        return { s, score };
      })
      .filter((x): x is { s: AwardSpecies; score: number } => x !== null)
      .sort((a, b) => a.score - b.score);
    return scored.slice(0, MAX_RESULTS).map((x) => x.s);
  }, [query, sorted]);

  // Rows = results + the "not on the list" row.
  const rowCount = results.length + 1;

  useEffect(() => setActive(0), [query]);

  // Close when clicking anywhere else.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  function pick(v: string) {
    onChange(v, query.trim());
    setOpen(false);
    setQuery("");
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((a) => Math.min(a + 1, rowCount - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (!open) return setOpen(true);
      pick(active < results.length ? results[active].id : SPECIES_OTHER);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  function startOver() {
    onChange("");
    setOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  // Chosen: show it as a card, with a way to change it.
  if ((selected || isOther) && !open) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/[0.06] px-4 py-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-400/15 text-amber-300">
          {selected ? <Check className="h-4 w-4" /> : <PenLine className="h-4 w-4" />}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-base text-white">
            {selected ? selected.common_name : "Not on the list"}
          </span>
          <span className="block truncate text-xs text-ocean-400">
            {selected
              ? [selected.scientific_name, selected.category].filter(Boolean).join(" · ")
              : "You'll type the name below"}
          </span>
        </span>
        {selected && (
          <span className="shrink-0 rounded-full border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 font-mono text-xs text-amber-300">
            {selected.points} pts
          </span>
        )}
        <button
          type="button"
          onClick={startOver}
          className="shrink-0 rounded-lg px-2 py-1 text-sm text-ocean-300 transition-colors hover:text-amber-300"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div ref={wrapRef} className="relative">
      <div
        className={`flex items-center gap-2 rounded-xl border bg-ocean-900/60 px-4 ${
          open ? "border-amber-500/50" : "border-ocean-800/60"
        }`}
      >
        <Search className="h-4 w-4 shrink-0 text-ocean-500" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKey}
          placeholder={`Search ${species.length} species by name…`}
          role="combobox"
          aria-expanded={open}
          aria-controls="species-options"
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          className="min-w-0 flex-1 border-0 bg-transparent py-3 shadow-none outline-none ring-0 focus:ring-0 text-base text-white placeholder-ocean-600 focus:outline-none sm:text-sm"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="shrink-0 text-ocean-500 hover:text-white"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {open && (
        <ul
          id="species-options"
          ref={listRef}
          role="listbox"
          className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-xl border border-amber-500/25 bg-ocean-950 p-1 shadow-2xl shadow-black/60"
        >
          {results.length === 0 && (
            <li className="px-3 py-3 text-sm text-ocean-400">
              No species match &ldquo;{query}&rdquo;.
            </li>
          )}

          {results.map((s, i) => (
            <li
              key={s.id}
              data-row={i}
              role="option"
              aria-selected={i === active}
              onMouseEnter={() => setActive(i)}
              onMouseDown={(e) => {
                e.preventDefault();
                pick(s.id);
              }}
              className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 ${
                i === active ? "bg-amber-500/10" : ""
              }`}
            >
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white">
                  <Highlight text={s.common_name} query={query} />
                </span>
                <span className="block truncate text-xs text-ocean-500">
                  {s.scientific_name && (
                    <span className="italic">
                      <Highlight text={s.scientific_name} query={query} />
                    </span>
                  )}
                  {s.category && ` · ${s.category}`}
                </span>
              </span>
              <span className="shrink-0 font-mono text-xs text-amber-300/80">
                {s.points} pts
              </span>
            </li>
          ))}

          {!query && species.length > MAX_RESULTS && (
            <li className="px-3 py-2 text-xs text-ocean-600">
              Showing the first {MAX_RESULTS}. Type to search all {species.length}.
            </li>
          )}

          <li
            data-row={results.length}
            role="option"
            aria-selected={active === results.length}
            onMouseEnter={() => setActive(results.length)}
            onMouseDown={(e) => {
              e.preventDefault();
              pick(SPECIES_OTHER);
            }}
            className={`mt-1 flex cursor-pointer items-center gap-3 rounded-lg border-t border-ocean-800/60 px-3 py-2.5 text-sm ${
              active === results.length ? "bg-amber-500/10 text-amber-200" : "text-ocean-300"
            }`}
          >
            <PenLine className="h-4 w-4 shrink-0" />
            Not on the list — I&apos;ll type it
          </li>
        </ul>
      )}
    </div>
  );
}

/** Bolds the part of a name that matches what was typed. */
function Highlight({ text, query }: { text: string; query: string }) {
  const q = query.trim();
  if (!q) return <>{text}</>;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <span className="font-semibold text-amber-300">{text.slice(i, i + q.length)}</span>
      {text.slice(i + q.length)}
    </>
  );
}
