"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, PenLine } from "lucide-react";

export default function NewThreadForm({ category }: { category: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (title.trim().length < 3) {
      setError("Give your post a title (at least 3 characters).");
      return;
    }
    if (!body.trim()) {
      setError("Write something in the body.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/forum/thread", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category,
          title: title.trim(),
          body: body.trim(),
        }),
      });
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Couldn't post.");
      router.push(`/forums/${category}/${data.slug}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't post.");
      setBusy(false);
    }
  }

  const inputClass =
    "w-full rounded-xl bg-ocean-900/60 border border-ocean-800/60 px-3 py-2 text-sm text-white placeholder-ocean-600 focus:outline-none focus:border-ocean-500";

  return (
    <div>
      {error && (
        <p className="text-sm text-coral-300 mb-4 rounded-lg border border-coral-500/30 bg-coral-500/10 px-4 py-2">
          {error}
        </p>
      )}

      <label className="block text-xs text-ocean-400 mb-1">Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="What's your question or topic?"
        maxLength={160}
        className={`${inputClass} mb-4`}
      />

      <label className="block text-xs text-ocean-400 mb-1">Body</label>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="Share the details. Markdown supported."
        rows={10}
        className={`${inputClass} resize-y`}
      />

      <div className="flex items-center gap-3 mt-4">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="inline-flex items-center gap-2 rounded-full bg-ocean-700 px-5 py-2 text-sm font-medium text-white hover:bg-ocean-600 transition-colors disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <PenLine className="w-4 h-4" />
          )}
          Post
        </button>
        <Link
          href={`/forums/${category}`}
          className="text-sm text-ocean-500 hover:text-ocean-300 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </div>
  );
}
