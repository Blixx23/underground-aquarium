"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  X,
  Loader2,
  Check,
} from "lucide-react";

type Kind = "bug" | "idea";

export default function FeedbackWidget() {
  const pathname = usePathname();

  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<Kind>("bug");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setKind("bug");
    setMessage("");
    setSubmitting(false);
    setDone(false);
    setError(null);
  }

  function close() {
    setOpen(false);
    // Reset shortly after the panel is gone, so the form is fresh next time.
    setTimeout(reset, 200);
  }

  async function submit() {
    if (!message.trim()) {
      setError("Add a message.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kind,
          message: message.trim(),
          page_url: pathname || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't send that.");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't send that.");
    } finally {
      setSubmitting(false);
    }
  }

  const tab = (value: Kind, label: string, Icon: typeof Bug) => (
    <button
      type="button"
      onClick={() => setKind(value)}
      className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
        kind === value
          ? "bg-ocean-700 text-white"
          : "text-ocean-400 hover:text-ocean-200"
      }`}
    >
      <Icon className="w-4 h-4" /> {label}
    </button>
  );

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Send feedback"
          className="fixed bottom-4 right-4 z-50 inline-flex items-center gap-2 rounded-full border border-ocean-700/60 bg-ocean-900/80 backdrop-blur px-3.5 py-2 text-sm text-ocean-300 shadow-lg hover:text-white hover:border-ocean-500 transition-colors"
        >
          <MessageSquarePlus className="w-4 h-4" /> Feedback
        </button>
      )}

      {open && (
        <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl border border-ocean-800/60 bg-ocean-950/95 backdrop-blur p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <p className="text-white font-medium">Send feedback</p>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="text-ocean-500 hover:text-ocean-200 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {done ? (
            <div className="py-4 text-center">
              <Check className="w-6 h-6 text-emerald-400 mx-auto mb-2" />
              <p className="text-sm text-ocean-300">
                Thanks — this went straight to the team.
              </p>
              <button
                type="button"
                onClick={close}
                className="mt-3 text-xs text-ocean-500 hover:text-ocean-300 transition-colors"
              >
                Close
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl bg-ocean-900/60 border border-ocean-800/60 p-1">
                {tab("bug", "Bug", Bug)}
                {tab("idea", "Idea", Lightbulb)}
              </div>

              {error && <p className="text-xs text-coral-300">{error}</p>}

              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={
                  kind === "bug"
                    ? "What went wrong, and what were you doing?"
                    : "What would make this better?"
                }
                rows={4}
                className="w-full rounded-lg bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500 resize-none"
              />

              <div className="flex items-center justify-between">
                <span className="text-[11px] text-ocean-600">
                  We&apos;ll see the page you&apos;re on.
                </span>
                <button
                  type="button"
                  onClick={submit}
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-4 py-1.5 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  Send
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
