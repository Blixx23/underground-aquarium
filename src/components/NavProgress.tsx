"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

/**
 * A thin bar across the top the instant a link is tapped, until the next
 * page arrives, so a tap never looks like it did nothing.
 *
 * This replaces the site-wide loading.tsx. That file wrapped every page in
 * a loading screen, which made the server answer "200 OK" before it knew
 * whether the page existed, so missing pages and old redirected addresses
 * looked like real, empty pages to Google (Search Console's "soft 404").
 */
export default function NavProgress() {
  const pathname = usePathname();
  const router = useRouter();
  const [active, setActive] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // The new page is here: hide the bar.
  useEffect(() => {
    setActive(false);
    if (timer.current) clearTimeout(timer.current);
  }, [pathname]);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as HTMLElement | null)?.closest?.("a");
      if (!a || a.target === "_blank" || a.hasAttribute("download")) return;
      const href = a.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return;
      let url: URL;
      try {
        url = new URL(href, window.location.href);
      } catch {
        return;
      }
      if (url.origin !== window.location.origin) return;

      // Any "Sign in" / "Create account" link without a ?next= brings the
      // person back to this page afterwards, instead of dumping them on
      // the feed. One place, so every button on the site gets it.
      if (
        (url.pathname === "/login" || url.pathname === "/register") &&
        !url.searchParams.has("next") &&
        !url.searchParams.has("redirect") &&
        !window.location.pathname.startsWith("/login") &&
        !window.location.pathname.startsWith("/register")
      ) {
        const here = window.location.pathname + window.location.search;
        if (here !== "/") url.searchParams.set("next", here);
        e.preventDefault();
        setActive(true);
        router.push(url.pathname + url.search);
        return;
      }
      // Same page (or just a #section on it): nothing to wait for.
      if (url.pathname === window.location.pathname) return;
      setActive(true);
      if (timer.current) clearTimeout(timer.current);
      // Never leave the bar stuck if a navigation is cancelled.
      timer.current = setTimeout(() => setActive(false), 12000);
    }
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [router]);

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-0 z-[200] h-[3px] overflow-hidden transition-opacity duration-300 ${
        active ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className={`h-full bg-gradient-to-r from-sky-400 via-cyan-300 to-emerald-300 shadow-[0_0_8px_rgba(56,189,248,0.8)] ${
          active ? "w-[85%] transition-[width] duration-[8000ms] ease-out" : "w-0"
        }`}
      />
    </div>
  );
}
