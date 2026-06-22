"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function ReplyBox({
  threadId,
  parentId = null,
  compact = false,
  placeholder = "Add a comment…",
}: {
  threadId: string;
  parentId?: string | null;
  compact?: boolean;
  placeholder?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(!compact);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!body.trim()) {
      setError("Write something first.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          thread_id: threadId,
          parent_id: parentId,
          body: body.trim(),
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't post.");
      setBody("");
      if (compact) setOpen(false);
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post.");
    } finally {
      setBusy(false);
    }
  }

  if (compact && !open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-xs text-ocean-400 hover:text-ocean-200 transition-colors mt-1"
      >
        Reply
      </button>
    );
  }

  return (
    <div className={compact ? "mt-2" : "mb-6"}>
      {error && <p className="text-xs text-coral-300 mb-1">{error}</p>}
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={placeholder}
        rows={compact ? 2 : 3}
        className="w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 resize-none"
      />
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {compact ? "Reply" : "Comment"}
        </button>
        {compact && (
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              setBody("");
              setError(null);
            }}
            className="text-xs text-ocean-500 hover:text-ocean-300"
          >
            Cancel
          </button>
        )}
        <span className="text-[11px] text-ocean-600">Markdown supported</span>
      </div>
    </div>
  );
}
