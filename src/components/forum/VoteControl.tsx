"use client";

import { useState } from "react";
import { Droplet } from "lucide-react";

type Vote = -1 | 0 | 1;

function Bubble({
  className,
  filled,
}: {
  className?: string;
  filled?: boolean;
}) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <circle
        cx="12"
        cy="12"
        r="8"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="2"
      />
      <circle
        cx="9"
        cy="9"
        r="2.2"
        fill={filled ? "#ffffff" : "currentColor"}
        opacity={filled ? 0.9 : 0.8}
      />
    </svg>
  );
}

export default function VoteControl({
  postId,
  initialScore,
  initialVote = 0,
  orientation = "vertical",
  size = "md",
}: {
  postId: string;
  initialScore: number;
  initialVote?: Vote;
  orientation?: "vertical" | "horizontal";
  size?: "sm" | "md";
}) {
  const [score, setScore] = useState(initialScore);
  const [vote, setVote] = useState<Vote>(initialVote);
  const [busy, setBusy] = useState(false);

  async function cast(dir: 1 | -1) {
    if (busy) return;
    const next: Vote = vote === dir ? 0 : dir;
    const prevVote = vote;
    const prevScore = score;

    setVote(next);
    setScore(score + (next - vote));
    setBusy(true);
    try {
      const res = await fetch("/api/forum/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ post_id: postId, value: next }),
      });
      if (res.status === 401) {
        setVote(prevVote);
        setScore(prevScore);
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Vote failed.");
      if (typeof data.score === "number") setScore(data.score);
    } catch {
      setVote(prevVote);
      setScore(prevScore);
    } finally {
      setBusy(false);
    }
  }

  const icon = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  const wrap =
    orientation === "vertical"
      ? "flex flex-col items-center"
      : "flex items-center";
  const up =
    vote === 1 ? "text-emerald-400" : "text-ocean-500 hover:text-emerald-300";
  const down =
    vote === -1 ? "text-coral-400" : "text-ocean-500 hover:text-coral-300";
  const scoreColor =
    vote === 1
      ? "text-emerald-300"
      : vote === -1
      ? "text-coral-300"
      : "text-ocean-300";

  return (
    <div className={`${wrap} gap-1 select-none shrink-0`}>
      <button
        type="button"
        onClick={() => cast(1)}
        disabled={busy}
        aria-label="Float up"
        title="Float up"
        className={`rounded-full p-0.5 transition-all hover:scale-110 ${up}`}
      >
        <Bubble className={icon} filled={vote === 1} />
      </button>
      <span className={`text-xs font-semibold tabular-nums ${scoreColor}`}>
        {score}
      </span>
      <button
        type="button"
        onClick={() => cast(-1)}
        disabled={busy}
        aria-label="Sink"
        title="Sink"
        className={`rounded-full p-0.5 transition-all hover:scale-110 ${down}`}
      >
        <Droplet className={icon} fill={vote === -1 ? "currentColor" : "none"} />
      </button>
    </div>
  );
}
