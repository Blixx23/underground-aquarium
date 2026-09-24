"use client";

import { useEffect } from "react";

/**
 * Opening a thread from a notification (…/thread#post-<id>) scrolls to that
 * comment and gives it a brief glow, so you can see which one is new.
 */
export default function ScrollToComment() {
  useEffect(() => {
    const id = window.location.hash.slice(1);
    if (!id.startsWith("post-")) return;
    const el = document.getElementById(id);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("ring-1", "ring-amber-400/60", "bg-amber-500/10");
    const t = setTimeout(() => el.classList.remove("ring-1", "ring-amber-400/60", "bg-amber-500/10"), 3000);
    return () => clearTimeout(t);
  }, []);
  return null;
}
