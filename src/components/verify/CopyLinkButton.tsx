"use client";

import { useState } from "react";
import { Link2, Check } from "lucide-react";

/** Copies this record's address, for sending to whoever asked for proof. */
export default function CopyLinkButton() {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-2 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-2 text-sm text-amber-200 transition-colors hover:border-amber-400/60 hover:text-amber-100"
    >
      {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
      {copied ? "Link copied" : "Copy link to this record"}
    </button>
  );
}
