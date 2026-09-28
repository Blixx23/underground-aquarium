"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";
import SiteSearch from "@/components/search/SiteSearch";

/** Anything on the site can open the search pop-out with openSiteSearch(). */
export const OPEN_SEARCH_EVENT = "ua:open-search";
export function openSiteSearch() {
  window.dispatchEvent(new Event(OPEN_SEARCH_EVENT));
}

/**
 * The site search as a pop-out over the current page, instead of a trip to
 * /search. Opens from the magnifying glass or Cmd/Ctrl+K; closes with
 * Escape, the X, a click outside, or opening a result. Full screen on
 * phones, a centered panel on computers.
 */
export default function SearchModal() {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    const show = () => {
      window.dispatchEvent(new Event("ua:close-top-menu"));
      window.dispatchEvent(new Event("ua:close-bottom-sheet"));
      setOpen(true);
    };
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener(OPEN_SEARCH_EVENT, show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener(OPEN_SEARCH_EVENT, show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  // A new page always starts with the pop-out shut.
  useEffect(() => setOpen(false), [pathname]);

  // While open: Escape closes it and the page behind doesn't scroll.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!mounted || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-ocean-950/70 backdrop-blur-sm sm:px-4 sm:pt-[10vh]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) setOpen(false);
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Search the site"
    >
      <div className="flex h-[100dvh] w-full flex-col bg-ocean-950 p-4 pt-[calc(1rem_+_env(safe-area-inset-top))] shadow-2xl sm:h-auto sm:max-h-[75vh] sm:max-w-2xl sm:rounded-3xl sm:border sm:border-ocean-700/60 sm:p-5">
        <div className="mb-3 flex shrink-0 items-center justify-between">
          <p className="text-sm font-medium uppercase tracking-wider text-emerald-400">Search</p>
          <div className="flex items-center gap-2">
            <kbd className="hidden rounded-md border border-ocean-700/60 px-1.5 py-0.5 text-[11px] text-ocean-400 sm:block">
              Esc
            </kbd>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-ocean-400 hover:bg-white/5 hover:text-white"
              aria-label="Close search"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <SiteSearch mode="modal" onNavigate={() => setOpen(false)} />
      </div>
    </div>,
    document.body
  );
}
