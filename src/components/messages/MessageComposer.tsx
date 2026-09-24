"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";

export default function MessageComposer({
  threadId,
  listingSlug,
  toUserId,
  placeholder,
  autoFocus,
  submitLabel,
}: {
  /** Replying inside an existing conversation. */
  threadId?: string;
  /** Starting a new conversation about a listing. */
  listingSlug?: string;
  /** Starting a direct conversation with a member. */
  toUserId?: string;
  placeholder?: string;
  autoFocus?: boolean;
  submitLabel?: string;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    const trimmed = body.trim();
    if (!trimmed || busy) return;

    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, listingSlug, toUserId, body: trimmed }),
      });
      const data = (await res.json()) as { threadId?: string; error?: string };

      if (!res.ok) {
        setError(data.error ?? "That didn't send. Try again.");
        setBusy(false);
        return;
      }

      setBody("");
      if (threadId) {
        router.refresh();
        setBusy(false);
      } else if (data.threadId) {
        router.push(`/messages/${data.threadId}`);
      }
    } catch {
      setError("That didn't send. Check your connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div>
      {error && (
        <div className="rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-300 mb-3">
          {error}
        </div>
      )}

      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => {
          // Enter sends, Shift+Enter makes a new line.
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            send();
          }
        }}
        rows={4}
        maxLength={4000}
        autoFocus={autoFocus}
        placeholder={placeholder ?? "Write a message…"}
        className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-4 py-3 text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 transition-colors resize-none"
      />

      <div className="flex items-center justify-between gap-4 mt-3">
        <p className="text-xs text-ocean-600">
          Enter sends · Shift + Enter for a new line
        </p>
        <button
          type="button"
          onClick={send}
          disabled={busy || !body.trim()}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-ocean-600 text-white font-medium hover:bg-ocean-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Send className="w-4 h-4" />
          )}
          {busy ? "Sending…" : submitLabel ?? "Send"}
        </button>
      </div>
    </div>
  );
}
