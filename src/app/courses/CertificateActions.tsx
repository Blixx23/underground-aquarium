"use client";

import { useState } from "react";
import Link from "next/link";
import { Printer, Link2, Check, User } from "lucide-react";

export default function CertificateActions() {
  const [copied, setCopied] = useState(false);

  function copyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      <button
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-full bg-ocean-600 hover:bg-ocean-500 text-white px-5 py-2.5 text-sm font-medium transition-colors"
      >
        <Printer className="w-4 h-4" /> Print / Save as PDF
      </button>
      <button
        onClick={copyLink}
        className="inline-flex items-center gap-2 rounded-full border border-ocean-700 text-ocean-200 hover:text-white hover:border-ocean-500 px-5 py-2.5 text-sm transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" /> Copied
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" /> Copy link
          </>
        )}
      </button>
      <Link
        href="/profile"
        className="inline-flex items-center gap-2 rounded-full border border-ocean-700 text-ocean-200 hover:text-white hover:border-ocean-500 px-5 py-2.5 text-sm transition-colors"
      >
        <User className="w-4 h-4" /> View profile
      </Link>
    </div>
  );
}
