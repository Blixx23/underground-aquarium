"use client";

import { useCallback, useState } from "react";
import { createPortal } from "react-dom";
import PhotoViewer from "@/components/feed/PhotoViewer";

/**
 * Wraps any photo so a tap opens it full screen. Give it every photo in the
 * set and which one this is, so people can swipe through the rest. Works
 * inside server components: the page stays server-rendered, only this
 * button runs in the browser.
 */
export default function ZoomPhoto({
  images,
  start = 0,
  label = "View photo full screen",
  link,
  className = "",
  children,
}: {
  images: string[];
  start?: number;
  label?: string;
  /** Shown in the viewer as a way on, e.g. { href: "/tanks/1", label: "Open tank" }. */
  link?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  if (images.length === 0) return <>{children}</>;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label={label}
        className={`block cursor-zoom-in ${className}`}
      >
        {children}
      </button>
      {/* Rendered at the top of the page so no card, link or clipped box around the photo can trap it. */}
      {open && createPortal(<PhotoViewer images={images} start={start} onClose={close} link={link} />, document.body)}
    </>
  );
}
