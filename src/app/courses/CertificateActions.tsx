"use client";

import { useState } from "react";
import Link from "next/link";
import { Link2, Check, User, Share2 } from "lucide-react";

/**
 * Sharing a certificate shares its public registry page (/verify/CODE), which
 * anyone can open and which shows the certificate on Facebook and in texts.
 * This page itself is behind sign-in, so its own address shows nothing.
 */
export default function CertificateActions({
  shareUrl,
  shareTitle,
}: {
  shareUrl?: string | null;
  shareTitle?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = () => shareUrl || window.location.href;

  function copyLink() {
    navigator.clipboard
      .writeText(url())
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {});
  }

  async function share() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: shareTitle, text: shareTitle, url: url() });
      } catch {
        // They closed the share sheet.
      }
      return;
    }
    copyLink();
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {shareUrl && (
        <button
          onClick={share}
          className="inline-flex items-center gap-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-ocean-950 font-semibold px-5 py-2.5 text-sm transition-colors"
        >
          <Share2 className="w-4 h-4" /> Share certificate
        </button>
      )}
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
