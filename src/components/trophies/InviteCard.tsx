"use client";

import { useState } from "react";
import { Check, Copy, UserPlus } from "lucide-react";

/** Your invite link, and how your referrals are doing. */
export default function InviteCard({
  username,
  joined,
  qualified,
}: {
  username: string;
  joined: number;
  qualified: number;
}) {
  const [copied, setCopied] = useState(false);
  const link = `https://undergroundaquarium.com/register?ref=${encodeURIComponent(username)}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-2xl border border-ocean-700/50 bg-gradient-to-br from-ocean-700/25 via-ocean-900/40 to-ocean-950 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-ocean-500/20">
          <UserPlus className="h-5 w-5 text-ocean-200" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg text-white">Invite people, earn trophies</p>
          <p className="text-sm text-ocean-300">
            Share your link. When someone signs up with it and gets involved (posts an ad, shares a
            tank, replies in the forums or joins the Society), it counts toward Recruiter,
            Ambassador, Evangelist and Legend Maker.
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <input
          readOnly
          value={link}
          onFocus={(e) => e.target.select()}
          className="min-w-0 flex-1 rounded-xl border border-ocean-800/60 bg-ocean-950/80 px-3 py-2.5 font-mono text-sm text-ocean-200 focus:outline-none"
        />
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-ocean-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-ocean-400"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copied" : "Copy link"}
        </button>
      </div>

      <div className="mt-4 flex gap-6 text-sm">
        <span className="text-ocean-400">
          <span className="font-semibold text-white">{joined}</span> signed up
        </span>
        <span className="text-ocean-400">
          <span className="font-semibold text-white">{qualified}</span> counted
        </span>
      </div>
    </div>
  );
}
