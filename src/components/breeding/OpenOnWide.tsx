"use client";

import { useEffect, useRef } from "react";

/**
 * A <details> box that starts open on tablets and computers and closed on
 * phones, so long reference lists don't push the guide down a small screen.
 */
export default function OpenOnWide({ className, summary, children }: { className?: string; summary: React.ReactNode; children: React.ReactNode }) {
  const ref = useRef<HTMLDetailsElement>(null);
  useEffect(() => {
    if (ref.current && window.matchMedia("(min-width: 640px)").matches) ref.current.open = true;
  }, []);
  return (
    <details ref={ref} className={`group ${className ?? ""}`}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 [&::-webkit-details-marker]:hidden">
        {summary}
        <span aria-hidden className="text-ocean-400 transition-transform group-open:rotate-180">▾</span>
      </summary>
      {children}
    </details>
  );
}
